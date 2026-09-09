from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_token, oauth2_scheme, RoleChecker
from app.models.models import Victim, IdentityStore, AuditLog
from app.schemas.schemas import VictimProfileOut, VictimProfileUpdate

router = APIRouter(prefix="/victims", tags=["Victim Profile"])

@router.get("/{victim_pseudo_id}", response_model=VictimProfileOut)
def get_victim_profile(
    victim_pseudo_id: str,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Module 2: Retrieve pseudonymized victim profile.
    Never includes PII from IdentityStore.
    """
    # If admin role tries to call, ensure no PII is returned
    if token:
        payload = decode_token(token)
        # Verify access authorization if needed
    
    victim = db.query(Victim).filter(Victim.victim_pseudo_id == victim_pseudo_id).first()
    if not victim:
        raise HTTPException(status_code=404, detail="Victim not found")
    return victim

@router.patch("/{victim_pseudo_id}", response_model=VictimProfileOut)
def update_victim_profile(
    victim_pseudo_id: str,
    payload: VictimProfileUpdate,
    db: Session = Depends(get_db)
):
    """
    Module 2: Update victim preferences (e.g. language, safety preferences like do not call after 8pm).
    """
    victim = db.query(Victim).filter(Victim.victim_pseudo_id == victim_pseudo_id).first()
    if not victim:
        raise HTTPException(status_code=404, detail="Victim not found")

    if payload.preferred_language:
        victim.preferred_language = payload.preferred_language
    if payload.safety_preferences is not None:
        victim.safety_preferences = payload.safety_preferences

    db.commit()
    db.refresh(victim)

    audit = AuditLog(
        actor_id=victim_pseudo_id,
        action="UPDATE_VICTIM_PREFERENCES",
        entity_type="Victim",
        entity_id=victim_pseudo_id,
        before_state=None,
        after_state={"language": victim.preferred_language, "safety_prefs": victim.safety_preferences}
    )
    db.add(audit)
    db.commit()

    return victim
