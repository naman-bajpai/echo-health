// Generate Summary Edge Function
// Uses OpenAI/ChatGPT to create patient-friendly visit summaries
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { callOpenAIJSON, isConfigured as isOpenAIConfigured } from "../_shared/openai.ts";

interface GenerateSummaryRequest {
  encounterId: string;
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
    const body: GenerateSummaryRequest = await req.json();
    const { encounterId } = body;

    if (!encounterId) {
      return errorResponse("encounterId is required");
    }

    // Debug: Check if OpenAI is configured
    const openAIConfigured = isOpenAIConfigured();
    console.log(`OpenAI API configured: ${openAIConfigured}`);

    // Get encounter
    const { data: encounter, error: encounterError } = await supabaseAdmin
      .from("encounters")
      .select("*")
      .eq("id", encounterId)
      .single();

    if (encounterError) {
      console.error("Encounter fetch error:", encounterError);
    }

    // Get transcript
    const { data: chunks, error: chunksError } = await supabaseAdmin
      .from("transcript_chunks")
      .select("speaker, text")
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: true });

    if (chunksError) {
      console.error("Transcript fetch error:", chunksError);
    }

    console.log(`Found ${chunks?.length || 0} transcript chunks`);

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

    const fields = fieldsArtifact?.content || {};

    console.log("Transcript text:", transcriptText.substring(0, 200));
    console.log("Extracted fields:", JSON.stringify(fields).substring(0, 200));

    let summary: PatientSummary = {
      visit_summary: "",
      diagnoses: [],
      treatment_plan: [],
      medications: [],
      follow_up: "",
      patient_instructions: [],
      warning_signs: [],
      generated_at: new Date().toISOString(),
      disclaimer: "This summary is for informational purposes only and does not constitute medical advice. Always follow your healthcare provider's instructions.",
    };

    let aiUsed = false;

    if (openAIConfigured && transcriptText.length > 10) {
      console.log("Calling OpenAI API for summary generation...");
      
      const prompt = `You are creating a patient-friendly visit summary. Analyze the entire transcript and write in clear, simple language that anyone can understand.

PATIENT: ${encounter?.patient_name || "Unknown"}
REASON FOR VISIT: ${encounter?.reason_for_visit || "Not specified"}

TRANSCRIPT:
${transcriptText}

EXTRACTED INFORMATION:
${JSON.stringify(fields, null, 2)}

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

      const result = await callOpenAIJSON<Partial<PatientSummary>>(prompt, {
        systemPrompt: "You are a medical documentation assistant creating patient-friendly visit summaries. Always respond with valid JSON only.",
      });
      
      if (result) {
        console.log("OpenAI response received successfully");
        summary = { ...summary, ...result };
        aiUsed = true;
      } else {
        console.log("OpenAI returned no result, using fallback");
      }
    } else {
      console.log(`Using fallback (OpenAI configured: ${openAIConfigured}, transcript length: ${transcriptText.length})`);
    }

    // Fallback if AI didn't work - use full transcript (both patient and provider)
    if (!aiUsed) {
      // Use full conversation for summary
      const fullConversation = chunks
        ?.map(c => `${c.speaker === "patient" ? "You" : "Your provider"}: ${c.text}`)
        .join(". ") || "";

      const patientStatements = chunks
        ?.filter(c => c.speaker === "patient")
        .map(c => c.text)
        .join(". ") || "";

      summary.visit_summary = fullConversation
        ? `You visited today for ${encounter?.reason_for_visit || "your health concern"}. During the visit: ${fullConversation.substring(0, 200)}...`
        : patientStatements
        ? `You visited today for ${encounter?.reason_for_visit || "your health concern"}. You mentioned: ${patientStatements.substring(0, 150)}...`
        : `You visited today for ${encounter?.reason_for_visit || "your health concern"}. Your healthcare team documented your visit.`;
      
      summary.diagnoses = ["[Pending doctor review] Your condition is being evaluated based on the complete conversation"];
      summary.treatment_plan = ["Follow up with your healthcare provider as directed"];
      summary.medications = (fields as any).medications || [];
      summary.follow_up = "Please follow up as directed by your healthcare provider.";
      summary.patient_instructions = [
        "Take any prescribed medications as directed",
        "Rest and stay hydrated",
        "Contact your healthcare provider if symptoms worsen",
      ];
      summary.warning_signs = [
        "Severe or worsening pain",
        "High fever (over 101°F / 38.3°C)",
        "Difficulty breathing",
        "Any symptoms that concern you",
      ];
    }

    // Save as artifact
    const { error: artifactError } = await supabaseAdmin.from("artifacts").insert({
      encounter_id: encounterId,
      type: "summary",
      content: summary,
    });

    if (artifactError) {
      console.error("Artifact save error:", artifactError);
    }

    // Update encounter status (no approval required - summary is auto-generated)
    await supabaseAdmin
      .from("encounters")
      .update({ status: "checkout" })
      .eq("id", encounterId);

    return jsonResponse({
      summary,
      encounterId,
      debug: {
        openAIConfigured,
        aiUsed,
        transcriptChunks: chunks?.length || 0,
        hasExtractedFields: !!fieldsArtifact,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse(`Internal server error: ${error}`, 500);
  }
});
