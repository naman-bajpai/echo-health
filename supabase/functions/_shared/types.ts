// Shared TypeScript types for Edge Functions

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
 * Database: Encounter row
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
 * Database: Transcript chunk row
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
 * Database: Artifact row
 */
export interface Artifact {
  id: string;
  encounter_id: string;
  type: ArtifactType;
  content: Record<string, unknown>;
  version: number;
  created_at: string;
}

/**
 * Database: Provider cache row
 */
export interface ProviderCache {
  id: string;
  query_hash: string;
  specialty: string;
  location: string | null;
  providers: Provider[];
  created_at: string;
  expires_at: string;
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
 * Extracted fields from transcript (non-diagnostic)
 */
export interface ExtractedFields {
  patient_name?: string;
  dob?: string;
  reason_for_visit?: string;
  symptoms: string[]; // Verbatim patient quotes
  timeline?: string; // "started X days ago"
  allergies?: string[];
  medications?: string[];
}

/**
 * Draft SOAP note content
 */
export interface DraftNote {
  subjective: string; // Patient-reported only
  objective: string; // Observable facts
  assessment: string; // "Clinician discussed..." (no diagnosis)
  plan: string; // Referrals/follow-ups explicitly stated
}

/**
 * Patient summary content
 */
export interface PatientSummary {
  what_you_told_us: string[]; // Verbatim
  what_happened_today: string; // Admin summary
  referrals: Array<{
    specialty: string;
    provider?: string;
    reason: string;
  }>;
  next_steps: string[];
  follow_up?: string;
}

/**
 * API request types
 */
export interface StartEncounterRequest {
  patient_name?: string;
  reason_for_visit?: string;
}

export interface StartEncounterResponse {
  encounterId: string;
  roomName: string;
  livekitToken?: string;
}

export interface UpsertTranscriptRequest {
  encounterId: string;
  speaker: SpeakerRole;
  text: string;
  timestamp?: number;
}

export interface ExtractFieldsRequest {
  encounterId: string;
}

export interface GenerateDraftNoteRequest {
  encounterId: string;
}

export interface ReferralSearchRequest {
  encounterId: string;
  specialty: string;
  location?: string;
}

export interface ApproveReferralRequest {
  encounterId: string;
  provider: Provider;
  reason: string;
}

export interface GenerateSummaryRequest {
  encounterId: string;
}

export interface GeneratePdfRequest {
  encounterId: string;
  summaryId?: string;
}

export interface NarrateRequest {
  text: string;
  encounterId?: string;
}

export interface LogTraceRequest {
  encounterId: string;
  event: string;
  data?: Record<string, unknown>;
}
