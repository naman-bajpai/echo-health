// Upsert Transcript Edge Function
// Stores transcript chunks from real-time transcription

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import type { UpsertTranscriptRequest } from "../_shared/types.ts";

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Parse request body
    const body: UpsertTranscriptRequest = await req.json();
    const { encounterId, speaker, text, timestamp } = body;

    // Validate required fields
    if (!encounterId) {
      return errorResponse("encounterId is required");
    }
    if (!speaker) {
      return errorResponse("speaker is required");
    }
    if (!text || text.trim() === "") {
      return errorResponse("text is required");
    }
    if (!["patient", "clinician", "staff"].includes(speaker)) {
      return errorResponse("speaker must be patient, clinician, or staff");
    }

    // Verify encounter exists
    const { data: encounter, error: encounterError } = await supabaseAdmin
      .from("encounters")
      .select("id")
      .eq("id", encounterId)
      .single();

    if (encounterError || !encounter) {
      return errorResponse("Encounter not found", 404);
    }

    // Insert transcript chunk
    const { data: chunk, error: insertError } = await supabaseAdmin
      .from("transcript_chunks")
      .insert({
        encounter_id: encounterId,
        speaker,
        text: text.trim(),
        timestamp_ms: timestamp || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return errorResponse("Failed to save transcript", 500);
    }

    return jsonResponse({
      id: chunk.id,
      success: true,
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Internal server error", 500);
  }
});
