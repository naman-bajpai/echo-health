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
  SpeakerRole,
  Provider,
  Encounter,
  TranscriptChunk,
  ExtractedFields,
} from "./types";

const FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + "/functions/v1";

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
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Function ${functionName} failed`);
  }

  return response.json();
}

/**
 * Start a new encounter
 */
export async function startEncounter(
  patientName?: string,
  reasonForVisit?: string
): Promise<StartEncounterResponse> {
  return callFunction<StartEncounterResponse>("start-encounter", {
    patient_name: patientName,
    reason_for_visit: reasonForVisit,
  });
}

/**
 * Add a transcript chunk
 */
export async function upsertTranscript(
  encounterId: string,
  speaker: SpeakerRole,
  text: string,
  timestamp?: number
): Promise<{ id: string; success: boolean }> {
  return callFunction("upsert-transcript", {
    encounterId,
    speaker,
    text,
    timestamp,
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
  // Update the artifact directly in Supabase
  const { error } = await supabase
    .from("artifacts")
    .update({ content: fields })
    .eq("encounter_id", encounterId)
    .eq("type", "fields")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    // If no existing artifact, create one
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

  // Also update encounter with patient info
  const updates: Record<string, unknown> = {};
  if (fields.patient_name) updates.patient_name = fields.patient_name;
  if (fields.dob) updates.patient_dob = fields.dob;
  if (fields.reason_for_visit) updates.reason_for_visit = fields.reason_for_visit;

  if (Object.keys(updates).length > 0) {
    await supabase
      .from("encounters")
      .update(updates)
      .eq("id", encounterId);
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
// Direct Supabase queries (for real-time data)
// ===========================================

/**
 * Get encounter by ID
 */
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

/**
 * Get transcript chunks for encounter
 */
export async function getTranscript(
  encounterId: string
): Promise<TranscriptChunk[]> {
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

/**
 * Get extracted fields for encounter
 */
export async function getFields(encounterId: string): Promise<ExtractedFields | null> {
  const { data, error } = await supabase
    .from("artifacts")
    .select("content")
    .eq("encounter_id", encounterId)
    .eq("type", "fields")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return null;
  }

  return data?.content as ExtractedFields;
}

/**
 * Subscribe to transcript updates
 */
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

/**
 * Subscribe to encounter updates
 */
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
