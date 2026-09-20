export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  district_id?: string;
  state_id?: string;
  victim_pseudo_id?: string;
  case_id?: string;
}

export interface PersonalEmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface BiometricProfile {
  age?: number;
  height_cm?: number;
  weight_kg?: number;
  activity_level?: 'sedentary' | 'moderate' | 'active' | 'very_active';
  initial_distress_rating?: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  caseId: string | null;
  victimPseudoId: string | null;
  emergencyContacts: PersonalEmergencyContact[];
  biometrics: BiometricProfile | null;
  isLoading: boolean;
}

export interface NearbyCounsellor {
  id: string;
  name: string;
  title: string;
  organization: string;
  phone: string;
  distance_km: number;
  latitude: number;
  longitude: number;
  district: string;
  availability: string;
}

export interface Appointment {
  appointment_id: string;
  case_id: string;
  counsellor_id: string;
  status: string;
  scheduled_time: string;
  message: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  detected_crisis?: boolean;
  emergency_pathway_suggested?: boolean;
  suggested_coping_exercise?: string | null;
  prompt_counsellor_booking?: boolean;
  trigger_point3_sos?: boolean;
  somatic_alert?: string | null;
}

export interface CheckInPayload {
  victim_pseudo_id: string;
  case_id: string;
  answers: { question_id: string; value: number }[];
  free_text?: string;
  language: string;
  submitted_via: 'text' | 'voice';
  current_weight_kg?: number;
  physical_activity_rating?: number;
  response_latency_sec?: number;
  audio_base64?: string;
}

export interface CheckInResult {
  checkin_id: string;
  status: string;
  risk_state: string;
  ddi_display?: number;
  message: string;
}

export interface SOSTriggerResult {
  status: string;
  automated_call: {
    call_id: string;
    recipient_name: string;
    recipient_phone: string;
    contact_phone?: string;
    relationship: string;
    ai_voice_message: string;
    ai_voice_script?: string;
    status: string;
    timestamp: string;
  };
  sms_dispatched: {
    sms_id: string;
    recipient_index: number;
    recipient_name: string;
    recipient_phone: string;
    message: string;
    status: string;
    timestamp: string;
  }[];
  helplines: {
    national_sc_st_poa: string;
    tele_manas_mental_health: string;
    national_emergency: string;
  };
  message: string;
}
