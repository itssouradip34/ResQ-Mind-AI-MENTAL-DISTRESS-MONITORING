from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Consent, Victim, AuditLog, CheckIn, VoiceAnalysis, TextAnalysis, DistressScore
from app.schemas.schemas import ConsentCreate, ConsentUpdate, ConsentOut

router = APIRouter(prefix="/consent", tags=["Consent & Privacy"])

@router.post("", response_model=ConsentOut)
def record_consent(payload: ConsentCreate, db: Session = Depends(get_db)):
    """
    Module 1: Granular, informed consent enrollment.
    """
    victim_id = payload.victim_pseudo_id
    if not victim_id:
        # Create a new victim pseudo ID
        victim = Victim(preferred_language="en", safety_preferences={})
        db.add(victim)
        db.flush()
        victim_id = victim.victim_pseudo_id

    existing = db.query(Consent).filter(Consent.victim_pseudo_id == victim_id).first()
    if existing:
        before = {"status": existing.status, "scopes": existing.granted_scopes}
        existing.status = payload.status
        existing.granted_scopes = payload.granted_scopes
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        
        # Log audit
        audit = AuditLog(
            actor_id=victim_id,
            action="UPDATE_CONSENT",
            entity_type="Consent",
            entity_id=existing.id,
            before_state=before,
            after_state={"status": existing.status, "scopes": existing.granted_scopes}
        )
        db.add(audit)
        db.commit()
        return existing

    new_consent = Consent(
        victim_pseudo_id=victim_id,
        status=payload.status,
        granted_scopes=payload.granted_scopes,
        version=payload.version
    )
    db.add(new_consent)
    db.commit()
    db.refresh(new_consent)

    audit = AuditLog(
        actor_id=victim_id,
        action="GRANT_INITIAL_CONSENT",
        entity_type="Consent",
        entity_id=new_consent.id,
        before_state=None,
        after_state={"status": new_consent.status, "scopes": new_consent.granted_scopes}
    )
    db.add(audit)
    db.commit()

    return new_consent

@router.get("/{victim_pseudo_id}", response_model=ConsentOut)
def get_consent(victim_pseudo_id: str, db: Session = Depends(get_db)):
    consent = db.query(Consent).filter(Consent.victim_pseudo_id == victim_pseudo_id).first()
    if not consent:
        raise HTTPException(status_code=404, detail="Consent record not found")
    return consent

@router.patch("/{victim_pseudo_id}", response_model=ConsentOut)
def update_consent(victim_pseudo_id: str, payload: ConsentUpdate, db: Session = Depends(get_db)):
    """
    Module 24: Consent State Machine
    ACTIVE <-> PAUSED
    ACTIVE/PAUSED -> WITHDRAWN
    WITHDRAWN -> DELETION_REQUESTED
    """
    consent = db.query(Consent).filter(Consent.victim_pseudo_id == victim_pseudo_id).first()
    if not consent:
        raise HTTPException(status_code=404, detail="Consent record not found")

    before = {"status": consent.status, "scopes": consent.granted_scopes}

    # Validate state transitions
    if payload.status:
        new_status = payload.status.upper()
        curr = consent.status.upper()
        
        valid_transitions = {
            "ACTIVE": ["PAUSED", "WITHDRAWN", "DELETION_REQUESTED"],
            "PAUSED": ["ACTIVE", "WITHDRAWN", "DELETION_REQUESTED"],
            "WITHDRAWN": ["DELETION_REQUESTED", "ACTIVE"],
            "DELETION_REQUESTED": []
        }
        
        if new_status not in valid_transitions.get(curr, []):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Invalid consent status transition from '{curr}' to '{new_status}'"
            )
        
        consent.status = new_status

        # If deletion requested, execute immediate data scrubbing for compliance
        if new_status == "DELETION_REQUESTED":
            checkins = db.query(CheckIn).filter(CheckIn.victim_pseudo_id == victim_pseudo_id).all()
            for c in checkins:
                c.free_text = "[REDACTED_PURSUANT_TO_DELETION_REQUEST]"
                c.answers = []
            db.commit()

    if payload.granted_scopes is not None:
        consent.granted_scopes = payload.granted_scopes

    consent.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(consent)

    audit = AuditLog(
        actor_id=victim_pseudo_id,
        action="UPDATE_CONSENT_STATE",
        entity_type="Consent",
        entity_id=consent.id,
        before_state=before,
        after_state={"status": consent.status, "scopes": consent.granted_scopes}
    )
    db.add(audit)
    db.commit()

    return consent
