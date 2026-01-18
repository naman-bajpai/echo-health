// API Wrappers for Supabase Edge Functions

import { supabase } from "./supabaseClient";
import type {
  StartEncounterResponse,
  ExtractFieldsResponse,
  DraftNoteResponse,
  ReferralSearchResponse,
  ReferralApprovalResponse,
  SummaryResponse,
  PdfResponse,
  NarrateResponse,
  UrgencyResponse,
  DiagnosisResponse,
  Provider,
  Encounter,
  TranscriptChunk,
  ExtractedFields,
} from "./types";

const FUNCTIONS_URL = "/api/supabase";

/**
 * Call a Supabase Edge Function
 */
async function callFunction<T>(
  functionName: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${FUNCTIONS_URL}/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Function ${functionName} failed`);
  }

  return response.json();
}

/**
 * Start a new encounter
 */
export async function startEncounter(
  patientName?: string,
  reasonForVisit?: string,
  patientId?: string,
  createdBy?: string
): Promise<StartEncounterResponse> {
  return callFunction<StartEncounterResponse>("start-encounter", {
    patient_name: patientName,
    reason_for_visit: reasonForVisit,
    patient_id: patientId,
    created_by: createdBy,
  });
}

/**
 * Add a transcript chunk - AI auto-detects speaker
 */
export async function upsertTranscript(
  encounterId: string,
  text: string,
  timestamp?: number
): Promise<{ id: string; success: boolean; speaker: string; text: string }> {
  return callFunction("upsert-transcript", {
    encounterId,
    text,
    timestamp,
    autoDetectSpeaker: true,
  });
}

/**
 * Extract fields from transcript
 */
export async function extractFields(
  encounterId: string
): Promise<ExtractFieldsResponse> {
  return callFunction<ExtractFieldsResponse>("extract-fields", {
    encounterId,
  });
}

/**
 * Update extracted fields (save edits)
 */
export async function updateFields(
  encounterId: string,
  fields: ExtractedFields
): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from("artifacts")
    .update({ content: fields })
    .eq("encounter_id", encounterId)
    .eq("type", "fields")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    const { error: insertError } = await supabase
      .from("artifacts")
      .insert({
        encounter_id: encounterId,
        type: "fields",
        content: fields,
      });

    if (insertError) {
      throw new Error("Failed to save fields");
    }
  }

  const updates: Record<string, unknown> = {};
  if (fields.patient_name) updates.patient_name = fields.patient_name;
  if (fields.dob) updates.patient_dob = fields.dob;
  if (fields.reason_for_visit) updates.reason_for_visit = fields.reason_for_visit;

  if (Object.keys(updates).length > 0) {
    await supabase.from("encounters").update(updates).eq("id", encounterId);
  }

  return { success: true };
}

/**
 * Generate draft SOAP note
 */
export async function generateDraftNote(
  encounterId: string
): Promise<DraftNoteResponse> {
  return callFunction<DraftNoteResponse>("generate-draft-note", {
    encounterId,
  });
}

/**
 * Search for referral providers
 */
export async function searchReferrals(
  encounterId: string,
  specialty: string,
  location?: string
): Promise<ReferralSearchResponse> {
  return callFunction<ReferralSearchResponse>("referral-search", {
    encounterId,
    specialty,
    location,
  });
}

/**
 * Approve a referral
 */
export async function approveReferral(
  encounterId: string,
  provider: Provider,
  reason: string
): Promise<ReferralApprovalResponse> {
  return callFunction<ReferralApprovalResponse>("approve-referral", {
    encounterId,
    provider,
    reason,
  });
}

/**
 * Generate patient summary
 */
export async function generateSummary(
  encounterId: string
): Promise<SummaryResponse> {
  return callFunction<SummaryResponse>("generate-summary", {
    encounterId,
  });
}

/**
 * Get PDF download URL
 */
export async function getSummaryPdfUrl(
  encounterId: string,
  summaryId?: string
): Promise<PdfResponse> {
  return callFunction<PdfResponse>("generate-pdf", {
    encounterId,
    summaryId,
  });
}

/**
 * Generate audio narration
 */
export async function narrateExplanation(
  text: string,
  encounterId?: string
): Promise<NarrateResponse> {
  return callFunction<NarrateResponse>("narrate", {
    text,
    encounterId,
  });
}

/**
 * Assess urgency of encounter
 */
export async function assessUrgency(
  encounterId: string
): Promise<UrgencyResponse> {
  return callFunction<UrgencyResponse>("assess-urgency", {
    encounterId,
  });
}

/**
 * Comprehensive AI analysis of entire encounter
 * Extracts fields, assesses urgency, recommends specialists - all at once
 */
export async function analyzeEncounter(
  encounterId: string
): Promise<{ success: boolean; analysis: any; encounterId: string }> {
  return callFunction("analyze-encounter", {
    encounterId,
  });
}

/**
 * Generate diagnosis recommendations using ChatGPT API
 * Analyzes entire transcript (patient + provider) to suggest diagnoses
 */
export async function generateDiagnosis(
  encounterId: string
): Promise<DiagnosisResponse> {
  return callFunction<DiagnosisResponse>("generate-diagnosis", {
    encounterId,
  });
}

/**
 * Log trace event
 */
export async function logTrace(
  encounterId: string,
  event: string,
  data?: Record<string, unknown>
): Promise<{ success: boolean; traceId: string }> {
  return callFunction("log-trace", {
    encounterId,
    event,
    data,
  });
}

// ===========================================
// Direct Supabase queries
// ===========================================

export async function getEncounter(encounterId: string): Promise<Encounter | null> {
  const { data, error } = await supabase
    .from("encounters")
    .select("*")
    .eq("id", encounterId)
    .single();

  if (error) {
    console.error("Error fetching encounter:", error);
    return null;
  }

  return data;
}

export async function getTranscript(encounterId: string): Promise<TranscriptChunk[]> {
  const { data, error } = await supabase
    .from("transcript_chunks")
    .select("*")
    .eq("encounter_id", encounterId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching transcript:", error);
    return [];
  }

  return data || [];
}

export async function getFields(encounterId: string): Promise<ExtractedFields | null> {
  const { data, error } = await supabase
    .from("artifacts")
    .select("content")
    .eq("encounter_id", encounterId)
    .eq("type", "fields")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data?.content as ExtractedFields;
}

export function subscribeToTranscript(
  encounterId: string,
  callback: (chunk: TranscriptChunk) => void
): () => void {
  const channel = supabase
    .channel(`transcript:${encounterId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "transcript_chunks",
        filter: `encounter_id=eq.${encounterId}`,
      },
      (payload) => {
        callback(payload.new as TranscriptChunk);
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}

export function subscribeToEncounter(
  encounterId: string,
  callback: (encounter: Encounter) => void
): () => void {
  const channel = supabase
    .channel(`encounter:${encounterId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "encounters",
        filter: `id=eq.${encounterId}`,
      },
      (payload) => {
        callback(payload.new as Encounter);
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}
