// Upsert Transcript Edge Function
// Processes transcription with AI - detects speaker and cleans text

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { processTranscription, isConfigured as isOpenAIConfigured } from "../_shared/openai.ts";

interface UpsertRequest {
  encounterId: string;
  text: string;
  timestamp?: number;
  autoDetectSpeaker?: boolean;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: UpsertRequest = await req.json();
    const { encounterId, text, timestamp, autoDetectSpeaker = true } = body;

    // Validate required fields
    if (!encounterId) {
      return errorResponse("encounterId is required");
    }
    if (!text || text.trim() === "") {
      return errorResponse("text is required");
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

    // Get recent conversation context for better speaker detection
    const { data: recentChunks } = await supabaseAdmin
      .from("transcript_chunks")
      .select("speaker, text")
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: false })
      .limit(5);

    const conversationContext = recentChunks
      ?.reverse()
      .map(c => `${c.speaker}: ${c.text}`)
      .join("\n") || "";

    // Process with OpenAI - detect speaker and clean text
    let speaker = "staff";
    let cleanedText = text.trim();

    if (autoDetectSpeaker && isOpenAIConfigured()) {
      try {
        const processed = await processTranscription(text, conversationContext);
        speaker = processed.speaker;
        cleanedText = processed.text;
      } catch (err) {
        console.warn("AI processing failed, using raw text:", err);
      }
    }

    // Skip empty or very short text
    if (!cleanedText || cleanedText.length < 2) {
      return jsonResponse({
        id: null,
        success: true,
        skipped: true,
        reason: "Text too short"
      });
    }

    // Insert transcript chunk
    const { data: chunk, error: insertError } = await supabaseAdmin
      .from("transcript_chunks")
      .insert({
        encounter_id: encounterId,
        speaker,
        text: cleanedText,
        timestamp_ms: timestamp || Date.now(),
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
      speaker,
      text: cleanedText,
      originalText: text,
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Internal server error", 500);
  }
});
