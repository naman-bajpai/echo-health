// Generate Draft Note Edge Function
// Uses Claude to generate SOAP notes
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { callClaudeJSON, isConfigured as isClaudeConfigured } from "../_shared/claude.ts";

interface GenerateDraftNoteRequest {
  encounterId: string;
}

interface DraftNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  generated_at: string;
  disclaimer: string;
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: GenerateDraftNoteRequest = await req.json();
    const { encounterId } = body;

    if (!encounterId) {
      return errorResponse("encounterId is required");
    }

    // Get transcript
    const { data: chunks } = await supabaseAdmin
      .from("transcript_chunks")
      .select("speaker, text")
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: true });

    // Get extracted fields
    const { data: fieldsArtifact } = await supabaseAdmin
      .from("artifacts")
      .select("content")
      .eq("encounter_id", encounterId)
      .eq("type", "fields")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const transcriptText = chunks
      ?.map((c) => `${c.speaker.toUpperCase()}: ${c.text}`)
      .join("\n") || "";

    const extractedFields = fieldsArtifact?.content || {};

    let draftNote: DraftNote = {
      subjective: "",
      objective: "",
      assessment: "",
      plan: "",
      generated_at: new Date().toISOString(),
      disclaimer: "DRAFT ONLY - This note was AI-generated and requires clinician review and approval before use in medical records.",
    };

    if (isClaudeConfigured()) {
      const prompt = `You are a medical documentation assistant. Generate a professional SOAP note from this patient encounter.

TRANSCRIPT:
${transcriptText}

EXTRACTED FIELDS:
${JSON.stringify(extractedFields, null, 2)}

Generate a SOAP note following this format:

SUBJECTIVE (S): Patient's complaints, symptoms, and history as they reported
OBJECTIVE (O): Clinical findings, vital signs, examination results mentioned
ASSESSMENT (A): Clinical impression - MUST be marked as DRAFT requiring physician review
PLAN (P): Treatment recommendations - MUST be marked as DRAFT requiring physician approval

IMPORTANT RULES:
- Do NOT make definitive diagnoses
- Mark all clinical assessments as "[DRAFT - Requires physician review]"
- Only document information from the transcript
- Use professional medical terminology
- Be concise but thorough

Respond with JSON only:
{
  "subjective": "Patient's reported symptoms and history...",
  "objective": "Clinical findings and observations...",
  "assessment": "[DRAFT - Requires physician review] Clinical impression...",
  "plan": "[DRAFT - Requires physician approval] Recommended treatment..."
}`;

      const result = await callClaudeJSON<Partial<DraftNote>>(prompt);
      if (result) {
        draftNote = { ...draftNote, ...result };
      }
    } else {
      // Fallback - use full transcript (both patient and provider)
      const fullTranscript = chunks
        ?.map((c) => `${c.speaker === "patient" ? "Patient" : "Provider"}: ${c.text}`)
        .join("\n") || "No conversation recorded.";

      // Extract patient statements for subjective
      const patientText = chunks
        ?.filter((c) => c.speaker === "patient")
        .map((c) => c.text)
        .join(". ") || "No patient statements recorded.";

      // Extract provider statements for objective
      const providerText = chunks
        ?.filter((c) => c.speaker === "staff" || c.speaker === "clinician")
        .map((c) => c.text)
        .join(". ") || "";

      draftNote.subjective = patientText 
        ? `Patient reports: ${patientText}`
        : "No patient statements recorded.";
      
      draftNote.objective = providerText
        ? `Provider observations: ${providerText}`
        : "Vital signs and physical examination findings pending documentation.";
      
      draftNote.assessment = "[DRAFT - Requires physician review] Assessment pending clinical evaluation based on full conversation.";
      draftNote.plan = "[DRAFT - Requires physician approval] Treatment plan to be determined based on complete encounter.";
    }

    // Save as artifact
    await supabaseAdmin.from("artifacts").insert({
      encounter_id: encounterId,
      type: "draft_note",
      content: draftNote,
    });

    return jsonResponse({
      draftNote,
      encounterId,
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Internal server error", 500);
  }
});
