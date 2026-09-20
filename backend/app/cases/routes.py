from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_token, oauth2_scheme
from app.models.models import (
    Case, Victim, DistressScore, CaseEvent, PersonalBaseline,
    RiskPrediction, RiskExplanation, Alert, Intervention, BehaviorSignal, AuditLog
)
from app.schemas.schemas import (
    CaseEventCreate, CaseEventOut, EventCouplingResponse,
    TrajectoryResponse, TrajectoryPoint, BaselineBand,
    InterventionSelect, InterventionOut, InterventionCreate
)
from app.ai.event_coupling import compute_event_coupling
from app.ai.forecast import generate_trajectory_forecast
from app.ai.engagement import classify_engagement_collapse
from app.ai.intervention_rules import recommend_interventions

router = APIRouter(prefix="/cases", tags=["Cases & Clinical Trajectory"])

@router.get("")
def list_cases(
    district_id: Optional[str] = None,
    state_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Case)
    if district_id:
        query = query.filter(Case.district_id == district_id)
    if state_id:
        query = query.filter(Case.state_id == state_id)
    cases = query.all()
    
    result = []
    for c in cases:
        latest_score = db.query(DistressScore).filter(
            DistressScore.case_id == c.id
        ).order_by(DistressScore.timestamp.desc()).first()

        latest_alert = db.query(Alert).filter(
            Alert.case_id == c.id
        ).order_by(Alert.timestamp.desc()).first()

        result.append({
            "id": c.id,
            "victim_pseudo_id": c.victim_pseudo_id,
            "district_id": c.district_id,
            "state_id": c.state_id,
            "case_type": c.case_type,
            "status": c.status,
            "opened_at": c.opened_at.isoformat() if c.opened_at else None,
            "nhaa_docket_id": c.nhaa_docket_id,
            "latest_ddi": latest_score.ddi_display if latest_score else None,
            "latest_band": latest_score.ddi_band if latest_score else "LOW",
            "latest_velocity": latest_score.velocity if latest_score else 0.0,
            "latest_confidence": latest_score.confidence if latest_score else 0.8,
            "has_active_alert": latest_alert is not None and latest_alert.status in ["NEW", "UNDER_REVIEW"]
        })
    return result

@router.get("/{case_id}")
def get_case_detail(case_id: str, db: Session = Depends(get_db)):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")

    victim = db.query(Victim).filter(Victim.victim_pseudo_id == c.victim_pseudo_id).first()
    
    latest_score = db.query(DistressScore).filter(
        DistressScore.case_id == c.id
    ).order_by(DistressScore.timestamp.desc()).first()

    latest_prediction = db.query(RiskPrediction).filter(
        RiskPrediction.case_id == c.id
    ).order_by(RiskPrediction.created_at.desc()).first()

    explanation = None
    if latest_prediction:
        explanation = db.query(RiskExplanation).filter(
            RiskExplanation.risk_prediction_id == latest_prediction.id
        ).first()

    events = db.query(CaseEvent).filter(
        CaseEvent.case_id == c.id
    ).order_by(CaseEvent.date.asc()).all()

    # Engagement Collapse Detection (Module 13)
    behaviors = db.query(BehaviorSignal).filter(
        BehaviorSignal.victim_pseudo_id == c.victim_pseudo_id
    ).order_by(BehaviorSignal.timestamp.desc()).limit(5).all()

    missed_streak = 0
    for b in behaviors:
        if b.missed_checkin:
            missed_streak += 1
        else:
            break

    collapse_analysis = classify_engagement_collapse(
        missed_checkin_streak=missed_streak,
        prior_ddi_trend="rising" if (latest_score and latest_score.velocity > 3) else "stable",
        recent_negative_event=any(e.event_type in ["threat_report", "hearing_postponed"] for e in events[-2:])
    )

    # Personal baseline comparison for UI
    lat_base = db.query(PersonalBaseline).filter(
        PersonalBaseline.victim_pseudo_id == c.victim_pseudo_id,
        PersonalBaseline.feature_name == "response_latency_sec"
    ).first()

    baseline_display = {
        "normal_latency": lat_base.running_mean if lat_base else 8.0,
        "current_latency": behaviors[0].response_latency_sec if behaviors else 8.0,
        "is_early": (lat_base.n_observations < 3) if lat_base else True,
        "label": (lat_base.n_observations < 3 and "early baseline — low confidence") if lat_base else "early baseline — low confidence"
    }

    return {
        "case": {
            "id": c.id,
            "victim_pseudo_id": c.victim_pseudo_id,
            "district_id": c.district_id,
            "state_id": c.state_id,
            "case_type": c.case_type,
            "status": c.status,
            "opened_at": c.opened_at.isoformat() if c.opened_at else None,
            "nhaa_docket_id": c.nhaa_docket_id
        },
        "victim_preferences": {
            "preferred_language": victim.preferred_language if victim else "en",
            "safety_preferences": victim.safety_preferences if victim else {},
            "enrolled_at": victim.enrolled_at.isoformat() if victim else None
        },
        "distress_state": {
            "ddi_display": latest_score.ddi_display if latest_score else 50.0,
            "ddi_band": latest_score.ddi_band if latest_score else "LOW",
            "confidence": latest_score.confidence if latest_score else 0.85,
            "velocity": latest_score.velocity if latest_score else 0.0,
            "risk_state": latest_score.risk_state if latest_score else "LOW",
            "component_breakdown": latest_score.component_breakdown if latest_score else {},
            "disclaimer": "Prototype AI risk estimate — not a clinical diagnosis."
        },
        "explanation": {
            "contributing_factors": explanation.contributing_factors if explanation else [],
            "protective_factors": explanation.protective_factors if explanation else [],
            "recommended_action": explanation.recommended_action if explanation else "Routine check-in",
            "model_version": explanation.model_version if explanation else "v1.0"
        } if explanation else None,
        "engagement_anomaly": collapse_analysis,
        "baseline_comparison": baseline_display
    }

@router.get("/{case_id}/ddi")
def get_ddi_history(case_id: str, db: Session = Depends(get_db)):
    scores = db.query(DistressScore).filter(
        DistressScore.case_id == case_id
    ).order_by(DistressScore.timestamp.asc()).all()

    current = scores[-1] if scores else None
    return {
        "case_id": case_id,
        "current": {
            "ddi_display": current.ddi_display if current else 50.0,
            "ddi_band": current.ddi_band if current else "LOW",
            "confidence": current.confidence if current else 0.85,
            "velocity": current.velocity if current else 0.0,
            "risk_state": current.risk_state if current else "LOW",
            "disclaimer": "Prototype AI risk estimate — not a clinical diagnosis."
        },
        "history": [
            {
                "timestamp": s.timestamp.isoformat() if s.timestamp else None,
                "ddi_display": s.ddi_display,
                "ddi_band": s.ddi_band,
                "confidence": s.confidence,
                "velocity": s.velocity
            }
            for s in scores
        ]
    }

@router.get("/{case_id}/trajectory", response_model=TrajectoryResponse)
def get_case_trajectory(case_id: str, db: Session = Depends(get_db)):
    """
    Module 9: Trajectory Visualization with baseline band, events, and 7-day forecast.
    """
    scores = db.query(DistressScore).filter(
        DistressScore.case_id == case_id
    ).order_by(DistressScore.timestamp.asc()).all()

    events = db.query(CaseEvent).filter(
        CaseEvent.case_id == case_id
    ).order_by(CaseEvent.date.asc()).all()

    history = [
        TrajectoryPoint(
            timestamp=s.timestamp.isoformat() if s.timestamp else "",
            ddi=s.ddi_display,
            is_forecast=False
        )
        for s in scores
    ]

    # Baseline band
    case_obj = db.query(Case).filter(Case.id == case_id).first()
    baseline_band = None
    if case_obj:
        lat_base = db.query(PersonalBaseline).filter(
            PersonalBaseline.victim_pseudo_id == case_obj.victim_pseudo_id
        ).first()
        if lat_base:
            baseline_band = BaselineBand(
                feature=lat_base.feature_name,
                running_mean=round(lat_base.running_mean, 2),
                running_variance=round(lat_base.running_variance, 4),
                band_low=round(lat_base.running_mean - 10.0, 1),
                band_high=round(lat_base.running_mean + 10.0, 1),
                n_observations=lat_base.n_observations,
                confidence_label="early baseline — low confidence" if lat_base.n_observations < 3 else "normal"
            )

    # Forecast (P1 requirement: only if >= 4 check-ins)
    forecast_points = None
    if len(scores) >= 4:
        raw_forecast = generate_trajectory_forecast([{"ddi": s.ddi_display, "timestamp": s.timestamp.isoformat()} for s in scores])
        if raw_forecast:
            forecast_points = [
                TrajectoryPoint(
                    timestamp=f["timestamp"],
                    ddi=f["ddi"],
                    is_forecast=True,
                    upper_bound=f["upper_bound"],
                    lower_bound=f["lower_bound"]
                )
                for f in raw_forecast
            ]

    return TrajectoryResponse(
        case_id=case_id,
        history=history,
        baseline_band=baseline_band,
        forecast=forecast_points,
        events=[CaseEventOut.model_validate(e) for e in events],
        disclaimer="Prototype AI risk estimate — not a clinical diagnosis.",
        mode="real"
    )

@router.get("/{case_id}/events", response_model=List[CaseEventOut])
def get_case_events(
    case_id: str,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Module 10: Retrieve case lifecycle event timeline.
    """
    events = db.query(CaseEvent).filter(
        CaseEvent.case_id == case_id
    ).order_by(CaseEvent.date.asc()).all()
    return events

@router.post("/{case_id}/events", response_model=CaseEventOut)
def log_case_event(
    case_id: str,
    payload: CaseEventCreate,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Module 10: Case-Event Timeline logger.
    """
    from app.ai.case_events import EVENT_SPECS

    actor_id = "OFFICER-1"
    if token:
        try:
            p = decode_token(token)
            actor_id = p.get("sub", "OFFICER-1")
        except Exception:
            pass

    # Auto-fill default stress prior and decay days if using default 1.0/14
    spec = EVENT_SPECS.get(payload.event_type, {})
    stress_prior = payload.stress_weight_prior
    decay_tau = payload.decay_days
    if stress_prior == 1.0 and "stress_weight_prior" in spec:
        stress_prior = spec["stress_weight_prior"]
    if decay_tau == 14 and "decay_days" in spec:
        decay_tau = spec["decay_days"]

    event = CaseEvent(
        case_id=case_id,
        event_type=payload.event_type,
        date=payload.date,
        notes=payload.notes,
        stress_weight_prior=stress_prior,
        decay_days=decay_tau,
        created_by=actor_id
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    audit = AuditLog(
        actor_id=actor_id,
        action="LOG_CASE_EVENT",
        entity_type="CaseEvent",
        entity_id=event.id,
        before_state=None,
        after_state={"event_type": event.event_type, "date": event.date.isoformat(), "prior": stress_prior}
    )
    db.add(audit)
    db.commit()

    return event

@router.delete("/{case_id}/events/{event_id}")
def delete_case_event(
    case_id: str,
    event_id: str,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Module 10: Remove / correct an erroneous case event with audit logging.
    """
    actor_id = "OFFICER-1"
    if token:
        try:
            p = decode_token(token)
            actor_id = p.get("sub", "OFFICER-1")
        except Exception:
            pass

    event = db.query(CaseEvent).filter(
        CaseEvent.id == event_id,
        CaseEvent.case_id == case_id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Case event not found")

    before_state = {"event_type": event.event_type, "date": event.date.isoformat()}
    db.delete(event)
    db.commit()

    audit = AuditLog(
        actor_id=actor_id,
        action="DELETE_CASE_EVENT",
        entity_type="CaseEvent",
        entity_id=event_id,
        before_state=before_state,
        after_state=None
    )
    db.add(audit)
    db.commit()

    return {"message": "Event deleted successfully", "event_id": event_id}

@router.get("/{case_id}/event-coupling", response_model=EventCouplingResponse)
def get_event_coupling(
    case_id: str,
    event_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Module 11: Flagship Case-Event Stress Coupling Engine
    """
    all_events = db.query(CaseEvent).filter(CaseEvent.case_id == case_id).all()
    if not all_events:
        raise HTTPException(status_code=404, detail="No case events found for this case")

    target = None
    if event_id:
        target = next((e for e in all_events if e.id == event_id), None)
    if not target:
        target = all_events[-1]  # Most recent

    scores = db.query(DistressScore).filter(DistressScore.case_id == case_id).order_by(DistressScore.timestamp.asc()).all()
    
    target_dict = {
        "id": target.id,
        "event_type": target.event_type,
        "date": target.date,
        "decay_days": target.decay_days
    }
    all_events_dicts = [{"id": e.id, "date": e.date} for e in all_events]
    scores_dicts = [{"ddi_display": s.ddi_display, "timestamp": s.timestamp} for s in scores]

    res = compute_event_coupling(target_dict, all_events_dicts, scores_dicts)

    return EventCouplingResponse(
        event_id=res["event_id"],
        event_type=res["event_type"],
        event_date=target.date,
        pre_event_ddi=res["pre_event_ddi"],
        post_event_ddi=res["post_event_ddi"],
        delta=res["delta"],
        delta_pct=res["delta_pct"],
        confounded=res["confounded"],
        caveat=res["caveat"],
        annotation=res["annotation"],
        mode="real"
    )

@router.get("/{case_id}/interventions")
def get_case_interventions(case_id: str, db: Session = Depends(get_db)):
    """
    Module 17: Candidate and Selected Interventions
    """
    latest_score = db.query(DistressScore).filter(
        DistressScore.case_id == case_id
    ).order_by(DistressScore.timestamp.desc()).first()

    events = db.query(CaseEvent).filter(CaseEvent.case_id == case_id).all()
    
    risk_state = latest_score.risk_state if latest_score else "LOW"
    event_dicts = [{"event_type": e.event_type} for e in events]
    
    recommended = recommend_interventions(risk_state, event_dicts, [])

    existing = db.query(Intervention).filter(Intervention.case_id == case_id).all()

    return {
        "case_id": case_id,
        "recommended_options": recommended,
        "existing_interventions": [InterventionOut.model_validate(i) for i in existing]
    }

@router.post("/{case_id}/interventions", response_model=InterventionOut)
def record_intervention(
    case_id: str,
    payload: InterventionSelect,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Module 17: Counsellor selects and records an intervention.
    Enforces Principle #1: Human-in-the-loop (must have User foreign key).
    """
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required for intervention recording")
    
    user_payload = decode_token(token)
    user_id = user_payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=403, detail="HUMAN_IN_THE_LOOP_REQUIRED: Valid human user ID required")

    intervention = Intervention(
        case_id=case_id,
        recommended_options=[],
        selected_option=payload.selected_option,
        selected_by=user_id,
        status="ACCEPTED",
        notes=payload.notes
    )
    db.add(intervention)
    db.commit()
    db.refresh(intervention)

    audit = AuditLog(
        actor_id=user_id,
        action="RECORD_INTERVENTION",
        entity_type="Intervention",
        entity_id=intervention.id,
        before_state=None,
        after_state={"selected_option": intervention.selected_option, "status": intervention.status}
    )
    db.add(audit)
    db.commit()

    return intervention
