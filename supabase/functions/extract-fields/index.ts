// Extract Fields Edge Function
// Extracts structured fields from transcript (non-diagnostic)

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { completeJson, isConfigured } from "../_shared/claude.ts";
import { SYSTEM_PROMPT, EXTRACT_FIELDS_PROMPT, getPrompt } from "../_shared/prompts.ts";
import { checkCompliance } from "../_shared/safety.ts";
import type { ExtractFieldsRequest, ExtractedFields } from "../_shared/types.ts";

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: ExtractFieldsRequest = await req.json();
    const { encounterId } = body;

    if (!encounterId) {
      return errorResponse("encounterId is required");
    }

    // Fetch transcript chunks
    const { data: chunks, error: fetchError } = await supabaseAdmin
      .from("transcript_chunks")
      .select("*")
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return errorResponse("Failed to fetch transcript", 500);
    }

    if (!chunks || chunks.length === 0) {
      return errorResponse("No transcript found for encounter", 404);
    }

    // Build transcript text
    const transcript = chunks
      .map((c) => `[${c.speaker.toUpperCase()}]: ${c.text}`)
      .join("\n");

    let fields: ExtractedFields;

    // Check if OpenAI is configured
    if (isConfigured()) {
      // Use LLM to extract fields
      const prompt = getPrompt(EXTRACT_FIELDS_PROMPT, { transcript });
      fields = await completeJson<ExtractedFields>(SYSTEM_PROMPT, prompt);

      // Verify compliance
      const symptomsText = fields.symptoms?.join(" ") || "";
      const compliance = checkCompliance(symptomsText);
      if (!compliance.isCompliant) {
        console.warn("Compliance warnings:", compliance.violations);
      }
    } else {
      // Fallback: basic extraction without LLM
      fields = extractFieldsBasic(chunks);
    }

    // Store as artifact
    const { data: artifact, error: artifactError } = await supabaseAdmin
      .from("artifacts")
      .insert({
        encounter_id: encounterId,
        type: "fields",
        content: fields,
      })
      .select()
      .single();

    if (artifactError) {
      console.error("Artifact error:", artifactError);
      return errorResponse("Failed to save fields", 500);
    }

    // Update encounter with extracted info
    const updates: Record<string, unknown> = {};
    if (fields.patient_name) updates.patient_name = fields.patient_name;
    if (fields.dob) updates.patient_dob = fields.dob;
    if (fields.reason_for_visit) updates.reason_for_visit = fields.reason_for_visit;

    if (Object.keys(updates).length > 0) {
      await supabaseAdmin
        .from("encounters")
        .update(updates)
        .eq("id", encounterId);
    }

    return jsonResponse({
      artifactId: artifact.id,
      fields,
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Internal server error", 500);
  }
});

/**
 * Basic field extraction without LLM
 */
function extractFieldsBasic(
  chunks: Array<{ speaker: string; text: string }>
): ExtractedFields {
  const fields: ExtractedFields = {
    symptoms: [],
  };

  for (const chunk of chunks) {
    const text = chunk.text.toLowerCase();

    // Extract name patterns
    if (text.includes("my name is") || text.includes("i'm") || text.includes("i am")) {
      const nameMatch = chunk.text.match(/(?:my name is|i'm|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
      if (nameMatch) {
        fields.patient_name = nameMatch[1];
      }
    }

    // Extract date of birth patterns
    if (text.includes("born") || text.includes("birthday") || text.includes("dob")) {
      const dobMatch = chunk.text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/);
      if (dobMatch) {
        fields.dob = dobMatch[1];
      }
    }

    // Collect patient statements as symptoms
    if (chunk.speaker === "patient") {
      const symptomKeywords = ["pain", "hurt", "ache", "feeling", "symptom", "problem", "issue", "started"];
      if (symptomKeywords.some((kw) => text.includes(kw))) {
        fields.symptoms.push(`"${chunk.text}"`);
      }
    }

    // Extract reason for visit
    if (text.includes("here for") || text.includes("came for") || text.includes("appointment for")) {
      const reasonMatch = chunk.text.match(/(?:here for|came for|appointment for)\s+(.+?)(?:\.|$)/i);
      if (reasonMatch) {
        fields.reason_for_visit = reasonMatch[1];
      }
    }
  }

  return fields;
}
