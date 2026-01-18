// Type definitions for Echo Health
// 
// Note: LiveKit is not currently wired up. The app uses browser SpeechRecognition
// for real-time transcription which works without any server setup.
// room_name and livekit_token are kept for future LiveKit integration.

export type SpeakerRole = "patient" | "clinician" | "staff";
export type UserRole = "nurse" | "doctor";
export type UrgencyLevel = "routine" | "urgent" | "emergent";
export type EncounterStatus = "active" | "completed" | "reviewed";
export type PanelMode = "transcript" | "fields" | "note" | "referral" | "summary";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  license_number?: string;
  specialty?: string;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  mrn?: string;
  full_name: string;
  dob?: string;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  insurance_provider?: string;
  insurance_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Encounter {
  id: string;
  created_by?: string;
  patient_id?: string;
  patient_name?: string;
  patient_dob?: string;
  reason_for_visit?: string;
  status: EncounterStatus;
  visit_number: number;
  urgency: UrgencyLevel;
  specialist_needed: boolean;
  recommended_specialist?: string;
  urgency_reason?: string;
  room_name?: string;
  livekit_token?: string;
  created_at: string;
  updated_at: string;
}

export interface TranscriptChunk {
  id: string;
  encounter_id: string;
  speaker: SpeakerRole;
  text: string;
  timestamp_ms?: number;
  created_at: string;
}

export interface ExtractedFields {
  patient_name?: string;
  dob?: string;
  chief_complaint?: string;
  reason_for_visit?: string;
  symptoms?: string[];
  symptom_duration?: string;
  symptom_severity?: string;
  medications?: string[];
  allergies?: string[];
  medical_history?: string[];
  vital_signs?: {
    blood_pressure?: string;
    heart_rate?: string;
    temperature?: string;
    respiratory_rate?: string;
    oxygen_saturation?: string;
  };
  insurance_info?: string;
  emergency_contact?: string;
  // New fields for urgency/specialist
  urgency_indicators?: string[];
  recommended_specialists?: string[];
}

export interface DraftNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  generated_at: string;
  disclaimer: string;
}

export interface Provider {
  id: string;
  name: string;
  specialty: string;
  address: string;
  phone: string;
  fax?: string;
  accepting_new_patients: boolean;
  insurance_accepted?: string[];
  rating?: number;
  distance?: string;
}

export interface Referral {
  provider: Provider;
  referral: {
    reason: string;
    status: string;
  };
  instructions: string;
}

export interface PatientSummary {
  visit_summary: string;
  diagnoses: string[];
  treatment_plan: string[];
  medications: string[];
  follow_up: string;
  patient_instructions: string[];
  warning_signs: string[];
  generated_at: string;
  disclaimer: string;
}

export interface UrgencyAssessment {
  level: UrgencyLevel;
  reason: string;
  specialist_needed: boolean;
  recommended_specialist?: string;
  red_flags: string[];
}

// API Response types
export interface StartEncounterResponse {
  encounterId: string;
  roomName?: string;
  livekitToken?: string;
}

export interface ExtractFieldsResponse {
  fields: ExtractedFields;
  encounterId: string;
}

export interface DraftNoteResponse {
  draftNote: DraftNote;
  encounterId: string;
}

export interface ReferralSearchResponse {
  providers: Provider[];
  encounterId: string;
}

export interface ReferralApprovalResponse {
  referral: Referral;
  encounterId: string;
}

export interface SummaryResponse {
  summary: PatientSummary;
  encounterId: string;
}

export interface PdfResponse {
  pdfUrl: string;
  encounterId: string;
}

export interface NarrateResponse {
  audioUrl?: string;
  audioData?: string;
  encounterId?: string;
}

export interface UrgencyResponse {
  assessment: UrgencyAssessment;
  encounterId: string;
}
