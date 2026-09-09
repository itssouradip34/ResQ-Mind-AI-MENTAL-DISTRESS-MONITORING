from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_token, oauth2_scheme
from app.models.models import Alert, Case, DistressScore, AuditLog, User
from app.schemas.schemas import AlertOut, AlertStatusUpdate

router = APIRouter(tags=["Alerts & Review Queue"])

RISK_WEIGHTS = {
    "CRITICAL": 4.0,
    "ABSTAIN": 3.5,  # High priority for human disambiguation
    "HIGH": 3.0,
    "MEDIUM": 2.0,
    "LOW": 1.0
}

def calculate_priority_score(
    risk_state: str,
    velocity: float,
    confidence: float,
    created_at: datetime,
    has_recent_threat: bool = False
) -> float:
    """
    Module 18: Priority scoring formula
    priority_score = risk_weight(risk_state) * trend_weight(velocity) * confidence * recency_weight * vulnerability_context_weight
    """
    rw = RISK_WEIGHTS.get(risk_state, 1.0)
    
    if velocity >= 8.0:
        tw = 2.0
    elif velocity >= 3.0:
        tw = 1.5
    elif velocity <= -3.0:
        tw = 0.8
    else:
        tw = 1.0

    days_ago = max(0.1, (datetime.now(timezone.utc) - created_at.replace(tzinfo=timezone.utc)).total_seconds() / 86400.0)
    recency_weight = 1.0 / (1.0 + days_ago * 0.1)
    vulnerability_weight = 1.3 if has_recent_threat else 1.0

    return round(rw * tw * confidence * recency_weight * vulnerability_weight, 3)

@router.get("/review-queue", response_model=List[AlertOut])
def get_review_queue(
    assigned_to: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Module 18: Counsellor Human Review Queue
    Sorted by priority_score descending.
    """
    query = db.query(Alert).filter(Alert.status.in_(["NEW", "ACKNOWLEDGED", "UNDER_REVIEW"]))
    if assigned_to:
        query = query.filter(Alert.assigned_officer == assigned_to)

    alerts = query.all()
    queue_items = []

    for a in alerts:
        case = db.query(Case).filter(Case.id == a.case_id).first()
        latest_score = db.query(DistressScore).filter(
            DistressScore.case_id == a.case_id
        ).order_by(DistressScore.timestamp.desc()).first()

        vel = latest_score.velocity if latest_score else 0.0
        has_threat = any(e.get("event_type") == "threat_report" for e in a.recent_case_events)
        
        priority = calculate_priority_score(
            risk_state=a.level,
            velocity=vel,
            confidence=a.confidence,
            created_at=a.timestamp,
            has_recent_threat=has_threat
        )

        # SLA calculation
        sla_hours = 24 if a.level in ["CRITICAL", "HIGH", "ABSTAIN"] else 72
        elapsed_hours = (datetime.now(timezone.utc) - a.timestamp.replace(tzinfo=timezone.utc)).total_seconds() / 3600.0
        remaining_hours = max(0, int(sla_hours - elapsed_hours))

        queue_items.append(AlertOut(
            id=a.id,
            case_id=a.case_id,
            risk_prediction_id=a.risk_prediction_id,
            level=a.level,
            contributing_factors=a.contributing_factors,
            protective_factors=a.protective_factors,
            recent_case_events=a.recent_case_events,
            recommended_action=a.recommended_action,
            confidence=a.confidence,
            timestamp=a.timestamp,
            assigned_officer=a.assigned_officer,
            status=a.status,
            victim_pseudo_id=case.victim_pseudo_id if case else None,
            velocity=vel,
            priority_score=priority,
            sla_hours_remaining=remaining_hours,
            disclaimer="Prototype AI risk estimate — not a clinical diagnosis.",
            mode="real"
        ))

    # Sort descending by priority score
    queue_items.sort(key=lambda x: x.priority_score or 0.0, reverse=True)
    return queue_items

@router.patch("/alerts/{alert_id}/status", response_model=AlertOut)
def update_alert_status(
    alert_id: str,
    payload: AlertStatusUpdate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Module 19: Alert status transition with Human-in-the-loop audit logging.
    Enforces Principle #1: Transition to ACTION_INITIATED requires human User ID.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token required for alert status change")

    user_payload = decode_token(token)
    actor_id = user_payload.get("sub")
    if not actor_id:
        raise HTTPException(status_code=403, detail="Valid human actor ID required")

    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Principle 1 check
    if payload.status == "ACTION_INITIATED" and not actor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HUMAN_IN_THE_LOOP: Action initiation strictly requires an authorized human officer."
        )

    before_state = {"status": alert.status, "assigned_officer": alert.assigned_officer}

    alert.status = payload.status
    if not alert.assigned_officer:
        alert.assigned_officer = actor_id

    db.commit()
    db.refresh(alert)

    # Emit Audit Log
    audit = AuditLog(
        actor_id=actor_id,
        action=f"ALERT_STATUS_{payload.status}",
        entity_type="Alert",
        entity_id=alert.id,
        before_state=before_state,
        after_state={"status": alert.status, "notes": payload.notes, "assigned_officer": alert.assigned_officer}
    )
    db.add(audit)
    db.commit()

    return AlertOut(
        id=alert.id,
        case_id=alert.case_id,
        risk_prediction_id=alert.risk_prediction_id,
        level=alert.level,
        contributing_factors=alert.contributing_factors,
        protective_factors=alert.protective_factors,
        recent_case_events=alert.recent_case_events,
        recommended_action=alert.recommended_action,
        confidence=alert.confidence,
        timestamp=alert.timestamp,
        assigned_officer=alert.assigned_officer,
        status=alert.status,
        mode="real"
    )
