// Generate Draft Note Edge Function
// Creates DRAFT SOAP note from transcript (no diagnosis)

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { complete, isConfigured } from "../_shared/claude.ts";
import { SYSTEM_PROMPT, DRAFT_NOTE_PROMPT, getPrompt } from "../_shared/prompts.ts";
import { sanitizeOutput, addDraftLabel, checkCompliance } from "../_shared/safety.ts";
import type { GenerateDraftNoteRequest, DraftNote } from "../_shared/types.ts";

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: GenerateDraftNoteRequest = await req.json();
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

    let draftNote: DraftNote;

    if (isConfigured()) {
      // Use LLM to generate draft note
      const prompt = getPrompt(DRAFT_NOTE_PROMPT, { transcript });
      const rawNote = await complete(SYSTEM_PROMPT, prompt);

      // Parse SOAP sections
      draftNote = parseSoapNote(rawNote);

      // Sanitize each section
      draftNote.subjective = sanitizeOutput(draftNote.subjective);
      draftNote.objective = sanitizeOutput(draftNote.objective);
      draftNote.assessment = sanitizeOutput(draftNote.assessment);
      draftNote.plan = sanitizeOutput(draftNote.plan);

      // Check compliance
      const fullNote = Object.values(draftNote).join(" ");
      const compliance = checkCompliance(fullNote);
      if (!compliance.isCompliant) {
        console.warn("Compliance warnings in draft note:", compliance.violations);
      }
    } else {
      // Fallback: basic note generation
      draftNote = generateBasicNote(chunks);
    }

    // Store as artifact
    const { data: artifact, error: artifactError } = await supabaseAdmin
      .from("artifacts")
      .insert({
        encounter_id: encounterId,
        type: "draft_note",
        content: {
          ...draftNote,
          is_draft: true,
          generated_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (artifactError) {
      console.error("Artifact error:", artifactError);
      return errorResponse("Failed to save draft note", 500);
    }

    return jsonResponse({
      artifactId: artifact.id,
      draftNote: {
        ...draftNote,
        formatted: addDraftLabel(formatSoapNote(draftNote)),
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Internal server error", 500);
  }
});

/**
 * Parse SOAP note from LLM response
 */
function parseSoapNote(text: string): DraftNote {
  const sections: DraftNote = {
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  };

  // Try to extract sections
  const subjectiveMatch = text.match(/subjective[:\s]*([\s\S]*?)(?=objective|$)/i);
  const objectiveMatch = text.match(/objective[:\s]*([\s\S]*?)(?=assessment|$)/i);
  const assessmentMatch = text.match(/assessment[:\s]*([\s\S]*?)(?=plan|$)/i);
  const planMatch = text.match(/plan[:\s]*([\s\S]*?)$/i);

  if (subjectiveMatch) sections.subjective = subjectiveMatch[1].trim();
  if (objectiveMatch) sections.objective = objectiveMatch[1].trim();
  if (assessmentMatch) sections.assessment = assessmentMatch[1].trim();
  if (planMatch) sections.plan = planMatch[1].trim();

  return sections;
}

/**
 * Format SOAP note for display
 */
function formatSoapNote(note: DraftNote): string {
  return `**SUBJECTIVE**
${note.subjective}

**OBJECTIVE**
${note.objective}

**ASSESSMENT**
${note.assessment}

**PLAN**
${note.plan}`;
}

/**
 * Generate basic note without LLM
 */
function generateBasicNote(
  chunks: Array<{ speaker: string; text: string }>
): DraftNote {
  const patientStatements = chunks
    .filter((c) => c.speaker === "patient")
    .map((c) => c.text);

  const clinicianStatements = chunks
    .filter((c) => c.speaker === "clinician")
    .map((c) => c.text);

  return {
    subjective: patientStatements.length > 0
      ? `Patient reported: "${patientStatements.join('" "')}`
      : "No patient statements recorded.",
    objective: "As observed during encounter.",
    assessment: clinicianStatements.length > 0
      ? `Clinician discussed: ${clinicianStatements.join("; ")}`
      : "Discussion documented in transcript.",
    plan: "To be determined by clinician review.",
  };
}
