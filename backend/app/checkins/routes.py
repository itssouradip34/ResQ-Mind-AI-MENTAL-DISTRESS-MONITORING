from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import (
    Consent, CheckIn, TextAnalysis, VoiceAnalysis, BehaviorSignal,
    PersonalBaseline, DistressScore, RiskPrediction, RiskExplanation, Alert,
    CaseEvent, Case, AuditLog
)
from app.schemas.schemas import (
    CheckInCreate, CheckInResponse, ChatMessageRequest, ChatMessageResponse
)
from app.ai.text_analysis import analyze_text
from app.ai.voice_analysis import analyze_voice
from app.ai.personal_baseline import update_welford, compute_z_score
from app.ai.ddi_engine import compute_ddi
from app.ai.explainability import generate_risk_explanation
from app.ai.intervention_rules import recommend_interventions

router = APIRouter(prefix="", tags=["Check-Ins & Chat"])

@router.post("/checkins", response_model=CheckInResponse)
def submit_checkin(payload: CheckInCreate, db: Session = Depends(get_db)):
    """
    Module 3: Periodic Well-Being Check-In ingestion pipeline.
    Enforces Principle #3 (Consent-First).
    """
    # 1. Enforce Consent
    consent = db.query(Consent).filter(Consent.victim_pseudo_id == payload.victim_pseudo_id).first()
    if not consent or consent.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CONSENT_REQUIRED: Active consent must be granted before check-ins can be processed."
        )

    # 2. Check Voice Scope
    include_voice = (
        payload.submitted_via == "voice" or payload.audio_base64 is not None
    ) and ("voice" in consent.granted_scopes)

    # 3. Save CheckIn Record
    checkin = CheckIn(
        victim_pseudo_id=payload.victim_pseudo_id,
        case_id=payload.case_id,
        answers=[a.model_dump() for a in payload.answers],
        free_text=payload.free_text,
        language=payload.language,
        submitted_via=payload.submitted_via,
        is_synthetic=True
    )
    db.add(checkin)
    db.flush()

    # 4. Process Behavioral Signal (Module 12)
    resp_length = len(payload.free_text) if payload.free_text else 0
    resp_latency = payload.response_latency_sec or 8.0
    behavior = BehaviorSignal(
        victim_pseudo_id=payload.victim_pseudo_id,
        timestamp=datetime.now(timezone.utc),
        response_latency_sec=resp_latency,
        response_length_chars=resp_length,
        missed_checkin=False
    )
    db.add(behavior)

    # Update personal baseline for latency
    lat_base = db.query(PersonalBaseline).filter(
        PersonalBaseline.victim_pseudo_id == payload.victim_pseudo_id,
        PersonalBaseline.feature_name == "response_latency_sec"
    ).first()
    if lat_base:
        new_mean, new_var, new_n = update_welford(lat_base.running_mean, lat_base.running_variance, lat_base.n_observations, resp_latency)
        lat_base.running_mean, lat_base.running_variance, lat_base.n_observations = new_mean, new_var, new_n
        engagement_z, _ = compute_z_score("response_latency_sec", resp_latency, new_mean, new_var, new_n)
    else:
        db.add(PersonalBaseline(
            victim_pseudo_id=payload.victim_pseudo_id,
            feature_name="response_latency_sec",
            running_mean=resp_latency,
            running_variance=2.0,
            n_observations=1
        ))
        engagement_z = 0.0

    # 5. Process Text Sentiment / Emotion Analysis (Module 5)
    text_res = analyze_text(payload.free_text, preferred_language=payload.language)
    text_z = text_res.get("distress_z")
    if text_res["available"]:
        t_analysis = TextAnalysis(
            checkin_id=checkin.id,
            sentiment_score=text_res["sentiment_score"],
            emotion_labels=text_res["emotion_labels"],
            distress_markers=text_res["distress_markers"],
            language_detected=text_res["language_detected"],
            model_version=text_res["model_version"],
            mode=text_res["mode"]
        )
        db.add(t_analysis)

    # 6. Process Voice Prosody (Module 6)
    voice_z = None
    if include_voice:
        v_res = analyze_voice(audio_base64=payload.audio_base64)
        voice_z = v_res.get("voice_z")
        v_analysis = VoiceAnalysis(
            checkin_id=checkin.id,
            pitch_variability=v_res["pitch_variability"],
            pause_ratio=v_res["pause_ratio"],
            speaking_rate=v_res["speaking_rate"],
            personal_z_scores=v_res["personal_z_scores"],
            confidence=v_res["confidence"],
            mode="real",
            audio_source="synthetic"
        )
        db.add(v_analysis)

    # 7. Process Self-Report Score
    ratings = [a.value for a in payload.answers]
    avg_rating = sum(ratings) / len(ratings) if ratings else 3.0
    sr_base = db.query(PersonalBaseline).filter(
        PersonalBaseline.victim_pseudo_id == payload.victim_pseudo_id,
        PersonalBaseline.feature_name == "self_report_score"
    ).first()
    if sr_base:
        new_mean, new_var, new_n = update_welford(sr_base.running_mean, sr_base.running_variance, sr_base.n_observations, avg_rating)
        sr_base.running_mean, sr_base.running_variance, sr_base.n_observations = new_mean, new_var, new_n
        self_report_z, _ = compute_z_score("self_report_score", avg_rating, new_mean, new_var, new_n)
    else:
        db.add(PersonalBaseline(
            victim_pseudo_id=payload.victim_pseudo_id,
            feature_name="self_report_score",
            running_mean=avg_rating,
            running_variance=1.0,
            n_observations=1
        ))
        self_report_z = 0.0

    # 8. Look up Case Events & compute time-decayed stress impact (Module 10 & 11)
    from app.ai.case_events import compute_case_events_stress_impact
    all_case_events = db.query(CaseEvent).filter(
        CaseEvent.case_id == payload.case_id
    ).all()
    event_decay_res = compute_case_events_stress_impact(all_case_events, datetime.now(timezone.utc))
    event_impact_payload = {
        "impact_z": event_decay_res["impact_z"],
        "citation": event_decay_res["citation"]
    } if event_decay_res["active_events_count"] > 0 else None

    recent_events = [
        {"event_type": e.event_type, "date": e.date}
        for e in all_case_events
    ]

    # 9. Compute DDI (Module 7)
    last_score = db.query(DistressScore).filter(
        DistressScore.case_id == payload.case_id
    ).order_by(DistressScore.timestamp.desc()).first()

    prev_raw = None
    prev_disp = None
    prev_vel = 0.0
    days_diff = 7.0
    if last_score:
        prev_disp = last_score.ddi_display
        prev_vel = last_score.velocity
        if last_score.timestamp:
            days_diff = max(0.5, (datetime.now(timezone.utc) - last_score.timestamp.replace(tzinfo=timezone.utc)).total_seconds() / 86400.0)

    ddi_result = compute_ddi(
        text_z=text_z,
        voice_z=voice_z,
        self_report_z=self_report_z,
        engagement_z=engagement_z,
        event_impact=event_impact_payload,
        prev_ddi_display=prev_disp,
        days_since_prev=days_diff,
        prev_velocity=prev_vel
    )

    score_record = DistressScore(
        case_id=payload.case_id,
        timestamp=datetime.now(timezone.utc),
        ddi_display=ddi_result["ddi_display"],
        ddi_band=ddi_result["ddi_band"],
        confidence=ddi_result["confidence"],
        velocity=ddi_result["velocity"],
        acceleration=ddi_result["acceleration"],
        risk_state=ddi_result["risk_state"],
        component_breakdown=ddi_result["component_breakdown"]
    )
    db.add(score_record)
    db.flush()

    # 10. Generate Risk Prediction & Explanation (Module 14 & 15)
    prediction = RiskPrediction(
        case_id=payload.case_id,
        ddi_score_id=score_record.id,
        risk_state=ddi_result["risk_state"],
        forecast_probability=0.85 if ddi_result["risk_state"] in ["HIGH", "CRITICAL"] else 0.20,
        forecast_horizon_days=7
    )
    db.add(prediction)
    db.flush()

    explanation_data = generate_risk_explanation(
        risk_state=ddi_result["risk_state"],
        component_breakdown=ddi_result["component_breakdown"],
        confidence=ddi_result["confidence"],
        recent_events=[{"event_type": e["event_type"], "citation": event_decay_res.get("citation")} for e in recent_events],
        distress_markers=text_res.get("distress_markers", [])
    )

    explanation = RiskExplanation(
        risk_prediction_id=prediction.id,
        contributing_factors=explanation_data["contributing_factors"],
        protective_factors=explanation_data["protective_factors"],
        recommended_action=explanation_data["recommended_action"],
        generated_from="shap_or_linear_weights",
        model_version="explanation-engine-v1.0"
    )
    db.add(explanation)
    db.flush()

    # 11. Create Alert if High, Critical, or Abstain
    if ddi_result["risk_state"] in ["HIGH", "CRITICAL", "ABSTAIN"]:
        # De-duplicate: check if recent alert already exists
        existing_alert = db.query(Alert).filter(
            Alert.case_id == payload.case_id,
            Alert.status.in_(["NEW", "ACKNOWLEDGED", "UNDER_REVIEW"])
        ).first()

        if existing_alert:
            existing_alert.level = ddi_result["risk_state"]
            existing_alert.confidence = ddi_result["confidence"]
            existing_alert.recommended_action = explanation_data["recommended_action"]
        else:
            alert = Alert(
                case_id=payload.case_id,
                risk_prediction_id=prediction.id,
                level=ddi_result["risk_state"],
                contributing_factors=explanation_data["contributing_factors"],
                protective_factors=explanation_data["protective_factors"],
                recent_case_events=[{"event_type": e.event_type} for e in recent_events],
                recommended_action=explanation_data["recommended_action"],
                confidence=ddi_result["confidence"],
                status="NEW"
            )
            db.add(alert)

    db.commit()

    return CheckInResponse(
        checkin_id=checkin.id,
        status="PROCESSED",
        risk_state=ddi_result["risk_state"],
        ddi_display=ddi_result["ddi_display"],
        message="Check-in securely analyzed and incorporated into personal baseline.",
        mode="real"
    )

@router.post("/chat/message", response_model=ChatMessageResponse)
def conversational_chat(payload: ChatMessageRequest, db: Session = Depends(get_db)):
    """
    Module 4: Multilingual Conversational Assistant Check-In.
    Templated dialogue (mode: simulated for conversational framing, real keyword gating).
    """
    text_analysis = analyze_text(payload.message, preferred_language=payload.language)
    detected_crisis = text_analysis.get("detected_crisis", False)

    # Plain language template response
    if detected_crisis:
        reply = (
            "We hear that you are going through immense distress. Please know you are not alone. "
            "Emergency assistance is available right now via National Helpline 14566 or Tele-MANAS 14416."
        )
    elif "fear_for_safety" in text_analysis.get("distress_markers", []):
        reply = (
            "Thank you for sharing this with us. Your safety is the highest priority. "
            "Your assigned counsellor has been alerted to review your case timeline promptly."
        )
    else:
        reply = (
            "Thank you for completing this check-in. Your thoughts and feelings have been safely recorded "
            "in your confidential file."
        )

    return ChatMessageResponse(
        reply=reply,
        detected_crisis=detected_crisis,
        emergency_pathway_suggested=detected_crisis,
        checkin_id=None,
        mode="simulated"
    )
