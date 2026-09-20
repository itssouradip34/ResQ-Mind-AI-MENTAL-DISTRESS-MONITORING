import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, JSON, Text
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, index=True)  # victim, counsellor, district_officer, state_admin, national_admin, auditor, system_admin
    district_id = Column(String(50), nullable=True, index=True)
    state_id = Column(String(50), nullable=True, index=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

class Victim(Base):
    __tablename__ = "victims"

    victim_pseudo_id = Column(String(36), primary_key=True, default=generate_uuid)
    preferred_language = Column(String(10), default="en", nullable=False)
    safety_preferences = Column(JSON, default=dict, nullable=False)  # e.g. {"do_not_call_after": "20:00", "preferred_contact_method": "in_app"}
    case_id = Column(String(50), nullable=True, index=True)
    enrolled_at = Column(DateTime, default=utc_now, nullable=False)
    is_synthetic = Column(Boolean, default=True, nullable=False)

class IdentityStore(Base):
    """
    CRITICAL: Privacy-by-design.
    Real PII is isolated from analytical and well-being data.
    Never queried or joined by /dashboard or /alerts.
    """
    __tablename__ = "identity_store"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    victim_pseudo_id = Column(String(36), ForeignKey("victims.victim_pseudo_id"), unique=True, nullable=False, index=True)
    real_name = Column(Text, nullable=False)  # Encrypted at rest
    phone = Column(Text, nullable=False)      # Encrypted at rest
    encrypted = Column(Boolean, default=True, nullable=False)

class Case(Base):
    __tablename__ = "cases"

    id = Column(String(50), primary_key=True)  # e.g. "CASE-MH-2026-001"
    victim_pseudo_id = Column(String(36), ForeignKey("victims.victim_pseudo_id"), nullable=False, index=True)
    district_id = Column(String(50), nullable=False, index=True)
    state_id = Column(String(50), nullable=False, index=True)
    case_type = Column(String(100), nullable=False)  # e.g. "PoA_Land_Dispute", "PoA_Harassment", "PoA_Physical_Assault"
    opened_at = Column(DateTime, default=utc_now, nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, PENDING_HEARING, IN_INVESTIGATION, CLOSED
    nhaa_docket_id = Column(String(50), nullable=True, index=True)  # Cross-reference to NHAA (14566)

class Consent(Base):
    """
    Consent-first state machine.
    Status: ACTIVE | PAUSED | WITHDRAWN | DELETION_REQUESTED
    granted_scopes: ["text", "voice", "case_linkage"]
    """
    __tablename__ = "consents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    victim_pseudo_id = Column(String(36), ForeignKey("victims.victim_pseudo_id"), unique=True, nullable=False, index=True)
    status = Column(String(30), default="ACTIVE", nullable=False)
    granted_scopes = Column(JSON, default=list, nullable=False)
    version = Column(String(10), default="1.0", nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

class CheckIn(Base):
    __tablename__ = "checkins"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    victim_pseudo_id = Column(String(36), ForeignKey("victims.victim_pseudo_id"), nullable=False, index=True)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    answers = Column(JSON, default=list, nullable=False)  # [{"question_id": "q1", "value": 3}]
    free_text = Column(Text, nullable=True)
    language = Column(String(10), default="en", nullable=False)
    submitted_via = Column(String(20), default="text", nullable=False)  # text | voice
    is_synthetic = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

class TextAnalysis(Base):
    __tablename__ = "text_analyses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    checkin_id = Column(String(36), ForeignKey("checkins.id"), unique=True, nullable=False, index=True)
    sentiment_score = Column(Float, nullable=False)  # -1.0 to 1.0
    emotion_labels = Column(JSON, default=list, nullable=False)  # e.g. [{"label": "fear", "score": 0.82}]
    distress_markers = Column(JSON, default=list, nullable=False)  # e.g. ["fear_for_safety", "sleep_disturbed"]
    language_detected = Column(String(10), nullable=False)
    model_version = Column(String(50), default="transformer-multilingual-v1", nullable=False)
    mode = Column(String(20), default="real", nullable=False)

class VoiceAnalysis(Base):
    __tablename__ = "voice_analyses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    checkin_id = Column(String(36), ForeignKey("checkins.id"), unique=True, nullable=False, index=True)
    pitch_variability = Column(Float, nullable=False)
    pause_ratio = Column(Float, nullable=False)
    speaking_rate = Column(Float, nullable=False)
    personal_z_scores = Column(JSON, default=dict, nullable=False)
    confidence = Column(Float, nullable=False)
    mode = Column(String(20), default="real", nullable=False)
    audio_source = Column(String(20), default="synthetic", nullable=False)

class BehaviorSignal(Base):
    __tablename__ = "behavior_signals"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    victim_pseudo_id = Column(String(36), ForeignKey("victims.victim_pseudo_id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=utc_now, nullable=False)
    response_latency_sec = Column(Float, nullable=False)
    response_length_chars = Column(Integer, nullable=False)
    missed_checkin = Column(Boolean, default=False, nullable=False)

class CaseEvent(Base):
    __tablename__ = "case_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)  # complaint_registration, investigation_update, police_interaction, court_hearing, threat_report, compensation_update, relocation, rehabilitation, counselling_session
    date = Column(DateTime, nullable=False)
    notes = Column(Text, nullable=True)
    stress_weight_prior = Column(Float, default=1.0, nullable=False)  # 0.5 to 3.0
    decay_days = Column(Integer, default=14, nullable=False)
    created_by = Column(String(36), nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

class PersonalBaseline(Base):
    __tablename__ = "personal_baselines"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    victim_pseudo_id = Column(String(36), ForeignKey("victims.victim_pseudo_id"), nullable=False, index=True)
    feature_name = Column(String(100), nullable=False)  # response_latency_sec, self_report_score, pitch_variability, pause_ratio, speaking_rate
    running_mean = Column(Float, nullable=False)
    running_variance = Column(Float, nullable=False)
    n_observations = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

class DistressScore(Base):
    __tablename__ = "distress_scores"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=utc_now, nullable=False)
    ddi_display = Column(Float, nullable=False)  # 0 to 100
    ddi_band = Column(String(30), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL, ABSTAIN
    confidence = Column(Float, nullable=False)
    velocity = Column(Float, nullable=False)  # pts/week
    acceleration = Column(Float, default=0.0, nullable=False)
    risk_state = Column(String(30), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL, ABSTAIN
    component_breakdown = Column(JSON, default=dict, nullable=False)  # {"T": text_z, "V": voice_z, "S": self_report_z, "En": -engagement_z, "Ev": event_impact}

class RiskPrediction(Base):
    __tablename__ = "risk_predictions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    ddi_score_id = Column(String(36), ForeignKey("distress_scores.id"), nullable=False, index=True)
    risk_state = Column(String(30), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL, ABSTAIN
    forecast_probability = Column(Float, nullable=True)
    forecast_horizon_days = Column(Integer, default=7, nullable=False)
    model_version = Column(String(50), default="ddi-fusion-v1.0", nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

class RiskExplanation(Base):
    __tablename__ = "risk_explanations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    risk_prediction_id = Column(String(36), ForeignKey("risk_predictions.id"), unique=True, nullable=False, index=True)
    contributing_factors = Column(JSON, default=list, nullable=False)  # [{"text": "distress increased 27% from baseline", "weight": 0.85}]
    protective_factors = Column(JSON, default=list, nullable=False)    # [{"text": "counselling engagement"}]
    recommended_action = Column(Text, nullable=False)
    generated_from = Column(String(50), default="shap_or_linear_weights", nullable=False)
    model_version = Column(String(50), default="explanation-engine-v1.0", nullable=False)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    risk_prediction_id = Column(String(36), ForeignKey("risk_predictions.id"), nullable=True, index=True)
    level = Column(String(30), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL, ABSTAIN
    contributing_factors = Column(JSON, default=list, nullable=False)
    protective_factors = Column(JSON, default=list, nullable=False)
    recent_case_events = Column(JSON, default=list, nullable=False)
    recommended_action = Column(Text, nullable=False)
    confidence = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=utc_now, nullable=False)
    assigned_officer = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    status = Column(String(50), default="NEW", nullable=False)  # NEW, ACKNOWLEDGED, UNDER_REVIEW, ACTION_INITIATED, RESOLVED, FALSE_POSITIVE, INSUFFICIENT_DATA

class Intervention(Base):
    """
    CRITICAL: Human-in-the-loop.
    The AI proposes recommended_options, but selected_option is NULL until a human counsellor writes to it.
    """
    __tablename__ = "interventions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    alert_id = Column(String(36), ForeignKey("alerts.id"), nullable=True, index=True)
    recommended_options = Column(JSON, default=list, nullable=False)
    selected_option = Column(String(255), nullable=True)  # NULL until selected by human
    selected_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    status = Column(String(50), default="PROPOSED", nullable=False)  # PROPOSED, ACCEPTED, SCHEDULED, COMPLETED, CANCELLED
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

class CounsellingSession(Base):
    __tablename__ = "counselling_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    counsellor_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    date = Column(DateTime, default=utc_now, nullable=False)
    notes = Column(Text, nullable=False)
    linked_alert_id = Column(String(36), ForeignKey("alerts.id"), nullable=True)

class AuditLog(Base):
    """
    CRITICAL: Immutable append-only audit trail.
    No UPDATE or DELETE operations are ever performed on this table.
    """
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_id = Column(String(36), nullable=False, index=True)  # user_id or "SYSTEM"
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(50), nullable=False)
    before_state = Column(JSON, nullable=True)
    after_state = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=utc_now, nullable=False)
