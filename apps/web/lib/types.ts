// Frontend TypeScript Types

/**
 * Encounter status flow
 */
export type EncounterStatus = "intake" | "visit" | "checkout";

/**
 * Speaker roles in transcript
 */
export type SpeakerRole = "patient" | "clinician" | "staff";

/**
 * Artifact types
 */
export type ArtifactType = "fields" | "draft_note" | "referral" | "summary";

/**
 * Encounter data
 */
export interface Encounter {
  id: string;
  status: EncounterStatus;
  patient_name: string | null;
  patient_dob: string | null;
  reason_for_visit: string | null;
  livekit_room_name: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Transcript chunk
 */
export interface TranscriptChunk {
  id: string;
  encounter_id: string;
  speaker: SpeakerRole;
  text: string;
  timestamp_ms: number | null;
  created_at: string;
}

/**
 * Provider information
 */
export interface Provider {
  id: string;
  name: string;
  specialty: string;
  address: string;
  phone: string;
  distance?: string;
  accepting_new_patients?: boolean;
}

/**
 * Extracted fields
 */
export interface ExtractedFields {
  patient_name?: string;
  dob?: string;
  reason_for_visit?: string;
  symptoms: string[];
  timeline?: string;
  allergies?: string[];
  medications?: string[];
}

/**
 * Draft SOAP note
 */
export interface DraftNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  formatted?: string;
}

/**
 * Patient summary
 */
export interface PatientSummary {
  what_you_told_us: string[];
  what_happened_today: string;
  referrals: Array<{
    specialty: string;
    provider?: string;
    reason: string;
  }>;
  next_steps: string[];
  follow_up?: string;
}

/**
 * API Response types
 */
export interface StartEncounterResponse {
  encounterId: string;
  roomName: string;
  livekitToken?: string;
}

export interface ExtractFieldsResponse {
  artifactId: string;
  fields: ExtractedFields;
}

export interface DraftNoteResponse {
  artifactId: string;
  draftNote: DraftNote;
}

export interface ReferralSearchResponse {
  providers: Provider[];
  cached: boolean;
  specialty: string;
  location?: string;
}

export interface ReferralApprovalResponse {
  artifactId: string;
  referral: {
    provider: Provider;
    patient: { name: string; encounter_date: string };
    referral: { reason: string; status: string };
    instructions: string;
  };
}

export interface SummaryResponse {
  artifactId: string;
  summary: PatientSummary;
  formatted: string;
}

export interface PdfResponse {
  pdfUrl: string;
  fileName: string;
  expiresIn: number;
}

export interface NarrateResponse {
  text: string;
  audioUrl?: string;
  audioData?: string;
  mimeType?: string;
}

/**
 * UI State types
 */
export interface EncounterState {
  encounter: Encounter | null;
  transcript: TranscriptChunk[];
  fields: ExtractedFields | null;
  draftNote: DraftNote | null;
  providers: Provider[];
  referrals: ReferralApprovalResponse["referral"][];
  summary: PatientSummary | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Panel mode for UI
 */
export type PanelMode = "transcript" | "fields" | "note" | "referral" | "summary";
