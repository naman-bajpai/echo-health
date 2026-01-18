// Generate Billing Codes Edge Function
// Uses OpenAI/ChatGPT to generate ICD-10 (diagnosis) and CPT (procedure) codes
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { callOpenAIJSON, isConfigured as isOpenAIConfigured } from "../_shared/openai.ts";

interface GenerateBillingCodesRequest {
  encounterId: string;
}

interface BillingCode {
  code: string;
  description: string;
  type: "ICD-10" | "CPT";
  confidence: "high" | "medium" | "low";
  rationale: string;
}

interface BillingCodesResult {
  icd10_codes: Array<{
    code: string;
    description: string;
    confidence: "high" | "medium" | "low";
    rationale: string;
  }>;
  cpt_codes: Array<{
    code: string;
    description: string;
    confidence: "high" | "medium" | "low";
    rationale: string;
  }>;
  generated_at: string;
  disclaimer: string;
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: GenerateBillingCodesRequest = await req.json();
    const { encounterId } = body;

    if (!encounterId) {
      return errorResponse("encounterId is required");
    }

    // Get encounter details
    const { data: encounter, error: encounterError } = await supabaseAdmin
      .from("encounters")
      .select("*")
      .eq("id", encounterId)
      .single();

    if (encounterError || !encounter) {
      return errorResponse("Encounter not found", 404);
    }

    // Get transcript
    const { data: chunks } = await supabaseAdmin
      .from("transcript_chunks")
      .select("speaker, text")
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: true });

    // Get draft note and diagnosis for context
    const { data: draftNoteArtifact } = await supabaseAdmin
      .from("artifacts")
      .select("content")
      .eq("encounter_id", encounterId)
      .eq("type", "draft_note")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: diagnosisArtifact } = await supabaseAdmin
      .from("artifacts")
      .select("content")
      .eq("encounter_id", encounterId)
      .eq("type", "diagnosis")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const transcriptText = chunks
      ?.map((c) => `${c.speaker.toUpperCase()}: ${c.text}`)
      .join("\n") || "";

    const draftNote = draftNoteArtifact?.content as any;
    const diagnosis = diagnosisArtifact?.content as any;

    if (!transcriptText || transcriptText.length < 10) {
      return errorResponse("Insufficient transcript data. Please ensure transcription has been completed.", 400);
    }

    let billingCodes: BillingCodesResult = {
      icd10_codes: [],
      cpt_codes: [],
      generated_at: new Date().toISOString(),
      disclaimer: "IMPORTANT: These billing codes are AI-generated suggestions based on the encounter transcript. All codes must be verified by a qualified medical coder or billing specialist before submission. Codes should be reviewed against current ICD-10 and CPT code sets and official coding guidelines.",
    };

    if (isOpenAIConfigured()) {
      const prompt = `You are an expert medical coder. Analyze this patient encounter to generate appropriate ICD-10 diagnosis codes and CPT procedure codes.

ENCOUNTER CONTEXT:
- Patient: ${encounter.patient_name || "Unknown"}
- Reason for Visit: ${encounter.reason_for_visit || "Not specified"}

COMPLETE TRANSCRIPT:
${transcriptText}

DRAFT SOAP NOTE:
${draftNote ? JSON.stringify(draftNote, null, 2) : "Not available"}

DIAGNOSIS ANALYSIS:
${diagnosis ? JSON.stringify(diagnosis.primary_diagnoses || [], null, 2) : "Not available"}

Based on the encounter transcript, SOAP note, and diagnosis information, generate:

1. ICD-10 CODES (Diagnosis Codes):
   - Primary diagnosis codes based on the chief complaint and clinical findings
   - Secondary diagnosis codes for any comorbidities or additional conditions mentioned
   - Use the most specific codes available
   - Include confidence level (high/medium/low) based on how clearly the condition is documented

2. CPT CODES (Procedure Codes):
   - Evaluation and Management (E&M) codes based on the complexity of the visit
   - Procedure codes for any tests, treatments, or interventions performed or discussed
   - Use appropriate modifiers if applicable
   - Include confidence level based on documentation clarity

CRITICAL RULES:
- Only generate codes that are clearly supported by the transcript and documentation
- Use official ICD-10 and CPT code formats
- For ICD-10: Use format like "I10" or "E11.9" (with appropriate specificity)
- For CPT: Use format like "99213" or "85025" (5-digit codes)
- Include full descriptions for each code
- Explain the rationale for each code selection
- Mark confidence appropriately - only use "high" if the documentation clearly supports the code

Respond with JSON only:
{
  "icd10_codes": [
    {
      "code": "I10",
      "description": "Essential (primary) hypertension",
      "confidence": "high" | "medium" | "low",
      "rationale": "Why this code is appropriate based on the encounter"
    }
  ],
  "cpt_codes": [
    {
      "code": "99213",
      "description": "Office or other outpatient visit for the evaluation and management of an established patient",
      "confidence": "high" | "medium" | "low",
      "rationale": "Why this code is appropriate based on the encounter complexity"
    }
  ]
}`;

      const result = await callOpenAIJSON<Omit<BillingCodesResult, 'generated_at' | 'disclaimer'>>(prompt, {
        systemPrompt: "You are an expert medical coder specializing in ICD-10 and CPT coding. Analyze patient encounters and generate accurate, appropriate billing codes based on documentation. Always return valid JSON only.",
        maxTokens: 2000,
      });

      if (result) {
        billingCodes = {
          ...result,
          generated_at: billingCodes.generated_at,
          disclaimer: billingCodes.disclaimer,
        };
        console.log("Billing codes generated successfully");
      } else {
        console.log("Failed to parse billing codes response, using fallback");
        billingCodes = createFallbackBillingCodes(encounter, chunks, diagnosis);
      }
    } else {
      console.log("OpenAI not configured, using fallback billing codes");
      billingCodes = createFallbackBillingCodes(encounter, chunks, diagnosis);
    }

    // Save as artifact
    await supabaseAdmin.from("artifacts").upsert({
      encounter_id: encounterId,
      type: "billing_codes",
      content: billingCodes,
    }, { onConflict: "encounter_id,type" });

    return jsonResponse({
      billingCodes,
      encounterId,
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse(`Internal server error: ${error}`, 500);
  }
});

// Fallback billing codes when AI is not available
function createFallbackBillingCodes(
  encounter: any,
  chunks: any[],
  diagnosis: any
): BillingCodesResult {
  const icd10Codes: BillingCodesResult["icd10_codes"] = [];
  const cptCodes: BillingCodesResult["cpt_codes"] = [];

  // Extract ICD-10 codes from diagnosis if available
  if (diagnosis?.primary_diagnoses) {
    for (const diag of diagnosis.primary_diagnoses) {
      if (diag.icd10_code) {
        icd10Codes.push({
          code: diag.icd10_code,
          description: diag.diagnosis,
          confidence: diag.confidence || "low",
          rationale: diag.reasoning || "Based on diagnosis analysis",
        });
      }
    }
  }

  // If no ICD-10 codes from diagnosis, add a generic one
  if (icd10Codes.length === 0) {
    icd10Codes.push({
      code: "Z00.00",
      description: "Encounter for general adult medical examination without abnormal findings",
      confidence: "low",
      rationale: "Generic code - requires clinical review for appropriate diagnosis code",
    });
  }

  // Add a standard E&M code
  cptCodes.push({
    code: "99213",
    description: "Office or other outpatient visit for the evaluation and management of an established patient",
    confidence: "low",
    rationale: "Standard E&M code - requires review based on visit complexity and documentation",
  });

  return {
    icd10_codes: icd10Codes,
    cpt_codes: cptCodes,
    generated_at: new Date().toISOString(),
    disclaimer: "IMPORTANT: These billing codes are AI-generated suggestions. All codes must be verified by a qualified medical coder before submission.",
  };
}
