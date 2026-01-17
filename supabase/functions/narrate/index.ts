// Narrate Edge Function
// Text-to-speech for patient explanations

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse, corsHeaders } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { textToSpeech, isConfigured } from "../_shared/elevenlabs.ts";
import { sanitizeOutput } from "../_shared/safety.ts";
import type { NarrateRequest } from "../_shared/types.ts";

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: NarrateRequest = await req.json();
    const { text, encounterId } = body;

    if (!text) {
      return errorResponse("text is required");
    }

    // Sanitize text before narration
    const sanitizedText = sanitizeOutput(text);

    if (!isConfigured()) {
      // ElevenLabs not configured - return text only
      return jsonResponse({
        text: sanitizedText,
        audioUrl: null,
        message: "Audio narration not configured",
      });
    }

    // Generate speech
    const audioBytes = await textToSpeech(sanitizedText);

    // If encounter ID provided, store the audio
    if (encounterId) {
      const fileName = `${encounterId}/${crypto.randomUUID()}.mp3`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("audio")
        .upload(fileName, audioBytes, {
          contentType: "audio/mpeg",
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        // Continue without storing - still return the audio
      }

      // Generate signed URL
      const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
        .from("audio")
        .createSignedUrl(fileName, 3600);

      if (!signedUrlError && signedUrlData) {
        return jsonResponse({
          text: sanitizedText,
          audioUrl: signedUrlData.signedUrl,
          expiresIn: 3600,
        });
      }
    }

    // Return audio directly as base64
    const base64Audio = btoa(String.fromCharCode(...audioBytes));

    return jsonResponse({
      text: sanitizedText,
      audioData: base64Audio,
      mimeType: "audio/mpeg",
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Internal server error", 500);
  }
});

// Also support direct audio streaming
export async function streamAudio(text: string): Promise<Response> {
  try {
    const sanitizedText = sanitizeOutput(text);

    if (!isConfigured()) {
      return errorResponse("Audio narration not configured", 501);
    }

    const audioBytes = await textToSpeech(sanitizedText);

    return new Response(audioBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBytes.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Failed to generate audio", 500);
  }
}
