from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Case, DistressScore, Alert, RiskPrediction, RiskExplanation
from app.core.config import settings

router = APIRouter(prefix="/demo", tags=["SIH Demo Controls"])

PERSONA_MAP = {
    "stable": {
        "case_id": "CASE-A-STABLE",
        "name": "Case A — Stable Recovery",
        "description": "Declining/flat DDI over time, high engagement, positive coping, recovery-momentum suggestion.",
        "target_band": "LOW"
    },
    "rising": {
        "case_id": "CASE-B-RISING",
        "name": "Case B — Gradual Deterioration",
        "description": "Slow-rising DDI over weeks coupled with hearing delays, progressing from MEDIUM to HIGH band.",
        "target_band": "HIGH"
    },
    "threat": {
        "case_id": "CASE-C-THREAT",
        "name": "Case C — Threat-Triggered Spike",
        "description": "Sharp DDI spike within days of a threat_report event, entering CRITICAL band with 24h SLA countdown.",
        "target_band": "CRITICAL"
    },
    "disengagement": {
        "case_id": "CASE-D-DISENGAGE",
        "name": "Case D — Silent Disengagement",
        "description": "Missed check-in streak >= 3 following police interaction, triggering 3-way collapse detection.",
        "target_band": "REVIEW_REQUIRED"
    },
    "abstention": {
        "case_id": "CASE-E-ABSTAIN",
        "name": "Case E — Conflicting Signals (Abstention)",
        "description": "Text distress high while self-report is stable; high variance forces ABSTAIN state with raw components displayed.",
        "target_band": "ABSTAIN"
    }
}

@router.get("/personas")
def list_demo_personas():
    return [
        {"scenario": k, **v}
        for k, v in PERSONA_MAP.items()
    ]

@router.post("/scenario/{name}")
def activate_demo_scenario(name: str, db: Session = Depends(get_db)):
    """
    POST /demo/scenario/{name}
    Instantly activates and navigates to one of the 5 canonical demo personas:
    stable | rising | threat | disengagement | abstention
    """
    if name not in PERSONA_MAP:
        raise HTTPException(
            status_code=404,
            detail=f"Scenario '{name}' not recognized. Available scenarios: {list(PERSONA_MAP.keys())}"
        )

    meta = PERSONA_MAP[name]
    case = db.query(Case).filter(Case.id == meta["case_id"]).first()
    if not case:
        raise HTTPException(
            status_code=404,
            detail=f"Case '{meta['case_id']}' not found. Please ensure database is seeded."
        )

    latest_score = db.query(DistressScore).filter(
        DistressScore.case_id == case.id
    ).order_by(DistressScore.timestamp.desc()).first()

    return {
        "scenario": name,
        "case_id": case.id,
        "victim_pseudo_id": case.victim_pseudo_id,
        "name": meta["name"],
        "description": meta["description"],
        "target_band": meta["target_band"],
        "current_ddi": latest_score.ddi_display if latest_score else 50.0,
        "current_risk_state": latest_score.risk_state if latest_score else "LOW",
        "active": True
    }
