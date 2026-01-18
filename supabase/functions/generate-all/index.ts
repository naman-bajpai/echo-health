// Generate All Edge Function
// Generates both SOAP draft note and patient summary in one call
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { callOpenAIJSON, isConfigured as isOpenAIConfigured } from "../_shared/openai.ts";

interface GenerateAllRequest {
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

interface PatientSummary {
  visit_summary: string;
  diagnoses: string[];
  treatment_plan: string[];
  medications: string[];
  follow_up: string;
  patient_instructions: string[];
  warning_signs: string[];
  generated_at: string;
  disclaimer: string;
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: GenerateAllRequest = await req.json();
    const { encounterId } = body;

    if (!encounterId) {
      return errorResponse("encounterId is required");
    }

    // Get encounter
    const { data: encounter } = await supabaseAdmin
      .from("encounters")
      .select("*")
      .eq("id", encounterId)
      .single();

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

    if (!transcriptText || transcriptText.length < 10) {
      return errorResponse("Insufficient transcript data. Please ensure transcription has been completed.", 400);
    }

    // Initialize results
    let draftNote: DraftNote | null = null;
    let summary: PatientSummary | null = null;

    if (isOpenAIConfigured()) {
      // Generate SOAP Note
      const soapPrompt = `You are a medical documentation assistant. Analyze the entire patient encounter transcript and generate a professional SOAP note.

TRANSCRIPT:
${transcriptText}

EXTRACTED FIELDS:
${JSON.stringify(extractedFields, null, 2)}

Analyze everything in the transcript and generate a comprehensive SOAP note following this format:

SUBJECTIVE (S): Patient's complaints, symptoms, and history as they reported
OBJECTIVE (O): Clinical findings, vital signs, examination results mentioned
ASSESSMENT (A): Clinical impression - MUST be marked as DRAFT requiring physician review
PLAN (P): Treatment recommendations - MUST be marked as DRAFT requiring physician approval

IMPORTANT RULES:
- Analyze the ENTIRE transcript thoroughly
- Do NOT make definitive diagnoses
- Mark all clinical assessments as "[DRAFT - Requires physician review]"
- Only document information from the transcript
- Use professional medical terminology
- Be concise but thorough
- Include all relevant information from the conversation

Respond with JSON only:
{
  "subjective": "Patient's reported symptoms and history...",
  "objective": "Clinical findings and observations...",
  "assessment": "[DRAFT - Requires physician review] Clinical impression...",
  "plan": "[DRAFT - Requires physician approval] Recommended treatment..."
}`;

      const soapResult = await callOpenAIJSON<Partial<DraftNote>>(soapPrompt, {
        systemPrompt: "You are a medical documentation assistant. Generate professional SOAP notes from patient encounter transcripts. Always respond with valid JSON only.",
      });

      if (soapResult) {
        draftNote = {
          subjective: soapResult.subjective || "",
          objective: soapResult.objective || "",
          assessment: soapResult.assessment || "",
          plan: soapResult.plan || "",
          generated_at: new Date().toISOString(),
          disclaimer: "DRAFT ONLY - This note was AI-generated and requires clinician review and approval before use in medical records.",
        };
      }

      // Generate Summary
      const summaryPrompt = `You are creating a patient-friendly visit summary. Analyze the entire transcript and write in clear, simple language that anyone can understand.

PATIENT: ${encounter?.patient_name || "Unknown"}
REASON FOR VISIT: ${encounter?.reason_for_visit || "Not specified"}

TRANSCRIPT:
${transcriptText}

EXTRACTED INFORMATION:
${JSON.stringify(extractedFields, null, 2)}

Analyze everything in the transcript and create a comprehensive summary that a patient can take home and understand. Use simple, non-medical language where possible.

IMPORTANT RULES:
- Analyze the ENTIRE transcript thoroughly
- Do NOT make definitive diagnoses - use phrases like "discussed" or "being evaluated for"
- Do NOT recommend specific treatments not discussed in the visit
- Be warm and reassuring in tone
- Include practical next steps
- Base ALL content on the actual transcript - don't make up symptoms or treatments
- Include all relevant information from the conversation

Respond with JSON only:
{
  "visit_summary": "Brief 2-3 sentence summary of the visit in friendly language based on actual transcript",
  "diagnoses": ["Conditions being evaluated or discussed in the transcript"],
  "treatment_plan": ["Steps discussed for care and treatment in the conversation"],
  "medications": ["Any medications discussed (with instructions if mentioned)"],
  "follow_up": "When and how to follow up as discussed",
  "patient_instructions": ["Clear instructions for the patient to follow at home"],
  "warning_signs": ["Symptoms that should prompt calling the doctor or seeking emergency care"]
}`;

      const summaryResult = await callOpenAIJSON<Partial<PatientSummary>>(summaryPrompt, {
        systemPrompt: "You are a medical documentation assistant creating patient-friendly visit summaries. Always respond with valid JSON only.",
      });

      if (summaryResult) {
        summary = {
          visit_summary: summaryResult.visit_summary || "",
          diagnoses: summaryResult.diagnoses || [],
          treatment_plan: summaryResult.treatment_plan || [],
          medications: summaryResult.medications || [],
          follow_up: summaryResult.follow_up || "",
          patient_instructions: summaryResult.patient_instructions || [],
          warning_signs: summaryResult.warning_signs || [],
          generated_at: new Date().toISOString(),
          disclaimer: "This summary is for informational purposes only and does not constitute medical advice. Always follow your healthcare provider's instructions.",
        };
      }
    }

    // Fallback if AI didn't work
    if (!draftNote) {
      const patientText = chunks
        ?.filter((c) => c.speaker === "patient")
        .map((c) => c.text)
        .join(". ") || "No patient statements recorded.";

      const providerText = chunks
        ?.filter((c) => c.speaker === "staff" || c.speaker === "clinician")
        .map((c) => c.text)
        .join(". ") || "";

      draftNote = {
        subjective: patientText ? `Patient reports: ${patientText}` : "No patient statements recorded.",
        objective: providerText ? `Provider observations: ${providerText}` : "Vital signs and physical examination findings pending documentation.",
        assessment: "[DRAFT - Requires physician review] Assessment pending clinical evaluation based on full conversation.",
        plan: "[DRAFT - Requires physician approval] Treatment plan to be determined based on complete encounter.",
        generated_at: new Date().toISOString(),
        disclaimer: "DRAFT ONLY - This note was AI-generated and requires clinician review and approval before use in medical records.",
      };
    }

    if (!summary) {
      const fullConversation = chunks
        ?.map(c => `${c.speaker === "patient" ? "You" : "Your provider"}: ${c.text}`)
        .join(". ") || "";

      summary = {
        visit_summary: fullConversation
          ? `You visited today for ${encounter?.reason_for_visit || "your health concern"}. During the visit: ${fullConversation.substring(0, 200)}...`
          : `You visited today for ${encounter?.reason_for_visit || "your health concern"}. Your healthcare team documented your visit.`,
        diagnoses: [],
        treatment_plan: ["Follow up with your healthcare provider as directed"],
        medications: (extractedFields as any).medications || [],
        follow_up: "Please follow up as directed by your healthcare provider.",
        patient_instructions: [
          "Take any prescribed medications as directed",
          "Rest and stay hydrated",
          "Contact your healthcare provider if symptoms worsen",
        ],
        warning_signs: [
          "Severe or worsening pain",
          "High fever (over 101°F / 38.3°C)",
          "Difficulty breathing",
          "Any symptoms that concern you",
        ],
        generated_at: new Date().toISOString(),
        disclaimer: "This summary is for informational purposes only and does not constitute medical advice. Always follow your healthcare provider's instructions.",
      };
    }

    // Save both as artifacts
    await Promise.all([
      supabaseAdmin.from("artifacts").upsert({
        encounter_id: encounterId,
        type: "draft_note",
        content: draftNote,
      }, { onConflict: "encounter_id,type" }),
      supabaseAdmin.from("artifacts").upsert({
        encounter_id: encounterId,
        type: "summary",
        content: summary,
      }, { onConflict: "encounter_id,type" }),
    ]);

    // Update encounter status
    await supabaseAdmin
      .from("encounters")
      .update({ status: "checkout" })
      .eq("id", encounterId);

    return jsonResponse({
      draftNote,
      summary,
      encounterId,
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse(`Internal server error: ${error}`, 500);
  }
});
