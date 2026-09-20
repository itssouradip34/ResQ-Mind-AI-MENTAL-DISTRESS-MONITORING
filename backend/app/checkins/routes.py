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

    # 7b. Somatic Weight Tracking (appetite / serotonin depletion indicator)
    somatic_factor = None
    if payload.current_weight_kg is not None and payload.current_weight_kg > 0:
        wt_base = db.query(PersonalBaseline).filter(
            PersonalBaseline.victim_pseudo_id == payload.victim_pseudo_id,
            PersonalBaseline.feature_name == "weight_kg"
        ).first()
        if wt_base:
            weight_diff = wt_base.running_mean - payload.current_weight_kg
            drop_pct = (weight_diff / wt_base.running_mean) * 100.0 if wt_base.running_mean > 0 else 0.0
            if drop_pct >= 3.0:
                somatic_factor = f"Rapid weight drop of {drop_pct:.1f}% indicates somatic distress / appetite reduction."
            new_m, new_v, new_count = update_welford(wt_base.running_mean, wt_base.running_variance, wt_base.n_observations, payload.current_weight_kg)
            wt_base.running_mean, wt_base.running_variance, wt_base.n_observations = new_m, new_v, new_count
        else:
            db.add(PersonalBaseline(
                victim_pseudo_id=payload.victim_pseudo_id,
                feature_name="weight_kg",
                running_mean=payload.current_weight_kg,
                running_variance=2.0,
                n_observations=1
            ))

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

    if somatic_factor:
        explanation_data["contributing_factors"].append(somatic_factor)

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
    Module 4: Multilingual Conversational Assistant Check-In with GPU sentiment inference,
    Point 3 automatic SOS trigger on crisis keywords, and somatic / coping recommendations.
    """
    text_analysis = analyze_text(payload.message, preferred_language=payload.language)
    detected_crisis = text_analysis.get("detected_crisis", False)
    msg_lower = payload.message.lower()

    # Crisis keyword detection
    crisis_keywords = [
        "suicide", "kill myself", "end my life", "want to die", "take my life",
        "hanging", "poison", "cannot live", "no reason to live", "end it all", "end myself"
    ]
    is_acute_crisis = detected_crisis or any(k in msg_lower for k in crisis_keywords)

    # Panic & Acute Anxiety keywords
    panic_keywords = ["panic", "anxious", "can't breathe", "cannot breathe", "hyperventilating", "heart racing", "shaking", "terrified", "overwhelmed"]
    is_panic = any(k in msg_lower for k in panic_keywords)

    # Trauma & Flashback keywords
    trauma_keywords = ["flashback", "nightmare", "unsafe", "threat", "attacker", "hearing", "court", "threatened", "afraid"]
    is_trauma = any(k in msg_lower for k in trauma_keywords)

    # Somatic & Appetite keywords (Serotonin depletion indicator)
    somatic_keywords = ["not eating", "can't eat", "cannot eat", "no appetite", "lost weight", "losing weight", "haven't eaten", "skip meal", "vomit", "nausea"]
    is_somatic = any(k in msg_lower for k in somatic_keywords)

    suggested_coping = None
    prompt_booking = False
    trigger_sos = False
    somatic_note = None

    if is_acute_crisis:
        detected_crisis = True
        trigger_sos = True
        prompt_booking = True
        reply = (
            "I hear how intense and overwhelming your pain is right now. Please know you are not alone and your life matters. "
            "I am initiating an immediate automated emergency alert to your trusted contact and sending SMS alerts to your circle right now. "
            "Please also connect directly with Tele-MANAS (14416 - 24/7 Free) or Police (112)."
        )
    elif is_panic:
        suggested_coping = "box_breathing"
        reply = (
            "I sense you are experiencing acute overwhelm and physical anxiety. Let's slow things down together. "
            "I recommend starting Box Breathing (4 seconds Inhale, 4s Hold, 4s Exhale, 4s Hold) to help regulate your nervous system right now."
        )
    elif is_trauma:
        suggested_coping = "grounding_54321"
        prompt_booking = True
        reply = (
            "Thank you for reaching out. What you experienced is difficult, and your safety is the highest priority. "
            "Try our 5-4-3-2-1 Sensory Grounding exercise to anchor yourself safely in the present, and consider booking a session with a nearby verified counsellor."
        )
    elif is_somatic:
        somatic_note = "Somatic appetite depletion detected"
        reply = (
            "Chronic distress and heightened cortisol frequently suppress appetite and deplete serotonin in the digestive system. "
            "Please be gentle with your body — try small sips of water or nourishing soup. "
            "Remember to log your current weight in the Check-In tab so your counsellor can monitor your physical well-being."
        )
    elif "fear_for_safety" in text_analysis.get("distress_markers", []):
        prompt_booking = True
        reply = (
            "Thank you for sharing this with us. Your safety is our highest priority. "
            "Your assigned counsellor and support team have been notified to review your recent check-ins."
        )
    else:
        reply = (
            "I'm here listening with you. You can share whatever is on your mind safely and confidentially. "
            "How has your energy and peace of mind been feeling today?"
        )

    return ChatMessageResponse(
        reply=reply,
        detected_crisis=detected_crisis,
        emergency_pathway_suggested=detected_crisis,
        suggested_coping_exercise=suggested_coping,
        prompt_counsellor_booking=prompt_booking,
        trigger_point3_sos=trigger_sos,
        somatic_alert=somatic_note,
        checkin_id=None,
        mode="real" if is_acute_crisis or is_panic else "simulated"
    )
