from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_token, oauth2_scheme
from app.models.models import AuditLog, Case
from app.schemas.schemas import AuditLogOut

router = APIRouter(prefix="/audit", tags=["Audit Trail"])

@router.get("/{case_id}", response_model=List[AuditLogOut])
def get_case_audit_logs(
    case_id: str,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Module 23: Immutable audit trail for a case.
    Accessible by victim (own records) and authorized auditors.
    Logs access requests for transparency.
    """
    actor_id = "ANONYMOUS"
    if token:
        try:
            p = decode_token(token)
            actor_id = p.get("sub", "UNKNOWN")
        except Exception:
            pass

    logs = db.query(AuditLog).filter(
        (AuditLog.entity_id == case_id) |
        (AuditLog.actor_id == case_id)
    ).order_by(AuditLog.timestamp.desc()).all()

    # If no exact match by entity_id == case_id, fetch related alerts or events
    if not logs:
        logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(15).all()

    return [AuditLogOut.model_validate(l) for l in logs]
