from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# ----------------- Mode & Disclaimer Mixins -----------------
class BaseResponse(BaseModel):
    mode: str = Field(default="real", description="'real' or 'simulated'")
    disclaimer: str = Field(
        default="Prototype AI risk estimate — not a clinical diagnosis.",
        description="Mandatory non-diagnostic legal label"
    )

# ----------------- Auth Schemas -----------------
class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    name: str
    district_id: Optional[str] = None
    state_id: Optional[str] = None
    victim_pseudo_id: Optional[str] = None
    case_id: Optional[str] = None

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    district_id: Optional[str] = None
    state_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Consent Schemas -----------------
class ConsentCreate(BaseModel):
    victim_pseudo_id: Optional[str] = None
    granted_scopes: List[str] = Field(
        default=["text"],
        description="Allowed scopes: 'text', 'voice', 'case_linkage'"
    )
    status: str = "ACTIVE"
    version: str = "1.0"

class ConsentUpdate(BaseModel):
    status: Optional[str] = Field(
        None,
        description="ACTIVE, PAUSED, WITHDRAWN, DELETION_REQUESTED"
    )
    granted_scopes: Optional[List[str]] = None

class ConsentOut(BaseModel):
    id: str
    victim_pseudo_id: str
    status: str
    granted_scopes: List[str]
    version: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ----------------- Victim Schemas -----------------
class VictimProfileOut(BaseModel):
    victim_pseudo_id: str
    preferred_language: str
    safety_preferences: Dict[str, Any]
    case_id: Optional[str] = None
    enrolled_at: datetime
    is_synthetic: bool

    class Config:
        from_attributes = True

class VictimProfileUpdate(BaseModel):
    preferred_language: Optional[str] = None
    safety_preferences: Optional[Dict[str, Any]] = None

# ----------------- Check-In Schemas -----------------
class CheckInAnswer(BaseModel):
    question_id: str
    value: int = Field(ge=1, le=5, description="Likert scale rating 1-5")

class CheckInCreate(BaseModel):
    victim_pseudo_id: str
    case_id: str
    answers: List[CheckInAnswer]
    free_text: Optional[str] = None
    language: str = "en"
    submitted_via: str = "text"  # text or voice
    response_latency_sec: Optional[float] = 8.0
    audio_base64: Optional[str] = None  # Base64 simulated/synthetic audio if submitted_via == "voice"
    current_weight_kg: Optional[float] = None
    physical_activity_rating: Optional[int] = None

class CheckInResponse(BaseResponse):
    checkin_id: str
    status: str
    risk_state: str
    ddi_display: Optional[float] = None
    message: str

# ----------------- Chat / Conversational Assistant -----------------
class ChatMessageRequest(BaseModel):
    victim_pseudo_id: str
    case_id: str
    message: str
    language: str = "en"

class ChatMessageResponse(BaseResponse):
    reply: str
    detected_crisis: bool = False
    emergency_pathway_suggested: bool = False
    suggested_coping_exercise: Optional[str] = None  # "box_breathing", "grounding_54321", etc.
    prompt_counsellor_booking: bool = False
    trigger_point3_sos: bool = False
    somatic_alert: Optional[str] = None
    checkin_id: Optional[str] = None

# ----------------- Case Events & Coupling -----------------
class CaseEventCreate(BaseModel):
    case_id: str
    event_type: str  # complaint_registration, investigation_update, police_interaction, court_hearing, threat_report, compensation_update, relocation, rehabilitation, counselling_session
    date: datetime
    notes: Optional[str] = None
    stress_weight_prior: float = 1.0
    decay_days: int = 14

class CaseEventOut(BaseModel):
    id: str
    case_id: str
    event_type: str
    date: datetime
    notes: Optional[str] = None
    stress_weight_prior: float
    decay_days: int
    created_by: str
    created_at: datetime

    class Config:
        from_attributes = True

class EventCouplingResponse(BaseResponse):
    event_id: str
    event_type: str
    event_date: datetime
    pre_event_ddi: float
    post_event_ddi: float
    delta: float
    delta_pct: float
    confounded: bool
    caveat: str = "Temporal association — not proof of causation."
    annotation: str

# ----------------- Distress Score & Trajectory -----------------
class DistressScoreOut(BaseModel):
    id: str
    case_id: str
    timestamp: datetime
    ddi_display: float
    ddi_band: str
    confidence: float
    velocity: float
    acceleration: float
    risk_state: str
    component_breakdown: Dict[str, Any]

    class Config:
        from_attributes = True

class TrajectoryPoint(BaseModel):
    timestamp: str
    ddi: Optional[float] = None
    is_forecast: bool = False
    upper_bound: Optional[float] = None
    lower_bound: Optional[float] = None

class BaselineBand(BaseModel):
    feature: str
    running_mean: float
    running_variance: float
    band_low: float
    band_high: float
    n_observations: int
    confidence_label: str  # "normal" or "early baseline — low confidence"

class TrajectoryResponse(BaseResponse):
    case_id: str
    history: List[TrajectoryPoint]
    baseline_band: Optional[BaselineBand] = None
    forecast: Optional[List[TrajectoryPoint]] = None
    events: List[CaseEventOut] = []

# ----------------- Risk Explanation -----------------
class ContributingFactor(BaseModel):
    text: str
    weight: float

class ProtectiveFactor(BaseModel):
    text: str

class RiskExplanationOut(BaseModel):
    contributing_factors: List[ContributingFactor]
    protective_factors: List[ProtectiveFactor]
    recommended_action: str
    generated_from: str
    model_version: str

# ----------------- Alerts & Review Queue -----------------
class AlertOut(BaseResponse):
    id: str
    case_id: str
    risk_prediction_id: str
    level: str
    contributing_factors: List[Dict[str, Any]]
    protective_factors: List[Dict[str, Any]]
    recent_case_events: List[Dict[str, Any]]
    recommended_action: str
    confidence: float
    timestamp: datetime
    assigned_officer: Optional[str] = None
    status: str
    victim_pseudo_id: Optional[str] = None
    velocity: Optional[float] = None
    priority_score: Optional[float] = None
    sla_hours_remaining: Optional[int] = None

    class Config:
        from_attributes = True

class AlertStatusUpdate(BaseModel):
    status: str  # ACKNOWLEDGED, UNDER_REVIEW, ACTION_INITIATED, RESOLVED, FALSE_POSITIVE, INSUFFICIENT_DATA
    notes: Optional[str] = None

# ----------------- Interventions -----------------
class InterventionCreate(BaseModel):
    case_id: str
    alert_id: Optional[str] = None
    notes: Optional[str] = None

class InterventionSelect(BaseModel):
    selected_option: str
    notes: Optional[str] = None

class InterventionOut(BaseModel):
    id: str
    case_id: str
    alert_id: Optional[str] = None
    recommended_options: List[str]
    selected_option: Optional[str] = None
    selected_by: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Dashboards (k >= 5) -----------------
class DistrictDashboardOut(BaseResponse):
    district_id: str
    total_monitored_cases: int
    active_high_risk_count: int
    rising_risk_count: int
    unresolved_alerts_count: int
    intervention_completion_rate: float
    avg_response_time_hours: float
    k_anonymity_satisfied: bool = True
    risk_band_distribution: Dict[str, Any]
    case_type_distribution: Dict[str, Any]
    weekly_trend: List[Dict[str, Any]]

class StateDashboardOut(BaseResponse):
    state_id: str
    total_monitored_cases: int
    active_high_risk_count: int
    unresolved_alerts_count: int
    district_comparison: List[Dict[str, Any]]
    risk_band_distribution: Dict[str, Any]

class NationalDashboardOut(BaseResponse):
    total_monitored_cases: int
    active_high_risk_count: int
    emerging_clusters: List[Dict[str, Any]]
    service_gaps: List[Dict[str, Any]]
    multilingual_engagement: Dict[str, int]
    disengagement_trend: List[Dict[str, Any]]

# ----------------- Audit Log -----------------
class AuditLogOut(BaseModel):
    id: str
    actor_id: str
    action: str
    entity_type: str
    entity_id: str
    before_state: Optional[Dict[str, Any]] = None
    after_state: Optional[Dict[str, Any]] = None
    timestamp: datetime

    class Config:
        from_attributes = True

# ----------------- Emergency Response -----------------
class EmergencyContact(BaseModel):
    name: str
    phone: str
    category: str
    available_hours: str

class EmergencyResponse(BaseModel):
    mode: str = "real"
    notice: str = "Static human emergency contact pathway — completely autonomous from AI models."
    helpline_national: str = "14566 (National Helpline for SC/ST PoA)"
    police_emergency: str = "112"
    tele_manas_mental_health: str = "14416"
    local_contacts: List[EmergencyContact]

# ----------------- Mobile & SOS Schemas -----------------
class PersonalEmergencyContact(BaseModel):
    name: str
    phone: str
    relationship: str

class SignupRequest(BaseModel):
    email: str
    password: str
    name: str
    phone: Optional[str] = ""
    age: Optional[int] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    activity_level: Optional[str] = "moderate"
    district_id: Optional[str] = "DIST-PUN-01"
    state_id: Optional[str] = "MH"
    preferred_language: Optional[str] = "en"
    emergency_contacts: Optional[List[PersonalEmergencyContact]] = []

class NearbyCounsellorOut(BaseModel):
    id: str
    name: str
    title: str
    organization: str
    phone: str
    distance_km: float
    latitude: float
    longitude: float
    district: str
    availability: str

class AppointmentCreateRequest(BaseModel):
    case_id: str
    counsellor_id: str
    preferred_date: Optional[str] = None
    notes: Optional[str] = None

class AppointmentOut(BaseResponse):
    appointment_id: str
    case_id: str
    counsellor_id: str
    status: str
    scheduled_time: str
    message: str

class SOSTriggerRequest(BaseModel):
    victim_pseudo_id: str
    case_id: str
    user_name: str
    user_phone: Optional[str] = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    trigger_source: str = "ai_chatbot_crisis"
    emergency_contacts: Optional[List[PersonalEmergencyContact]] = []
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None

class SOSTriggerResponse(BaseResponse):
    status: str
    automated_call: Dict[str, Any]
    sms_dispatched: List[Dict[str, Any]]
    helplines: Dict[str, str]
    message: str
