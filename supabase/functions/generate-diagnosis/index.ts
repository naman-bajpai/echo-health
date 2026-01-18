// Generate Diagnosis Edge Function
// Uses OpenAI ChatGPT API to analyze entire transcript and generate recommended diagnoses
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { callOpenAI, callOpenAIJSON, isConfigured as isOpenAIConfigured } from "../_shared/openai.ts";

interface GenerateDiagnosisRequest {
  encounterId: string;
}

interface DiagnosisResult {
  primary_diagnoses: Array<{
    diagnosis: string;
    confidence: "high" | "medium" | "low";
    reasoning: string;
    icd10_code?: string;
  }>;
  differential_diagnoses: Array<{
    diagnosis: string;
    reasoning: string;
  }>;
  recommended_tests: Array<{
    test: string;
    reason: string;
  }>;
  treatment_considerations: Array<{
    treatment: string;
    rationale: string;
  }>;
  follow_up_recommendations: {
    timeframe: string;
    reason: string;
    urgency: "routine" | "soon" | "urgent";
  };
  red_flags: string[];
  disclaimer: string;
  generated_at: string;
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: GenerateDiagnosisRequest = await req.json();
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

    // Get ALL transcript chunks (entire conversation)
    const { data: chunks, error: chunksError } = await supabaseAdmin
      .from("transcript_chunks")
      .select("speaker, text, created_at")
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: true });

    if (chunksError) {
      console.error("Transcript fetch error:", chunksError);
      return errorResponse("Failed to fetch transcript");
    }

    if (!chunks || chunks.length === 0) {
      return errorResponse("No transcript found. Please record the conversation first.");
    }

    console.log(`Found ${chunks.length} transcript chunks for diagnosis analysis`);

    // Build full transcript with both patient and provider statements
    const transcriptText = chunks
      .map((c) => `[${c.speaker.toUpperCase()}]: ${c.text}`)
      .join("\n");

    // Get extracted fields for additional context
    const { data: fieldsArtifact } = await supabaseAdmin
      .from("artifacts")
      .select("content")
      .eq("encounter_id", encounterId)
      .eq("type", "fields")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const extractedFields = fieldsArtifact?.content || {};

    let diagnosis: DiagnosisResult = {
      primary_diagnoses: [],
      differential_diagnoses: [],
      recommended_tests: [],
      treatment_considerations: [],
      follow_up_recommendations: {
        timeframe: "As needed",
        reason: "Follow up based on clinical course",
        urgency: "routine",
      },
      red_flags: [],
      disclaimer: "IMPORTANT: This is an AI-generated diagnostic analysis for educational and reference purposes only. It should NOT be used as a substitute for professional medical judgment, diagnosis, or treatment. All diagnoses must be confirmed by a licensed healthcare provider. This analysis is based solely on the conversation transcript and may not include all relevant clinical information.",
      generated_at: new Date().toISOString(),
    };

    if (isOpenAIConfigured()) {
      console.log("Using OpenAI ChatGPT API for diagnosis generation...");

      const prompt = `You are an expert medical diagnostic assistant. Analyze this COMPLETE patient encounter transcript (including both patient statements AND provider questions/observations) to generate diagnostic recommendations.

ENCOUNTER CONTEXT:
- Patient Name: ${encounter.patient_name || "Not provided"}
- Reason for Visit: ${encounter.reason_for_visit || "Not specified"}
- Date: ${new Date().toISOString().split('T')[0]}

COMPLETE TRANSCRIPT (Patient + Provider Conversation):
${transcriptText}

EXTRACTED CLINICAL DATA:
${JSON.stringify(extractedFields, null, 2)}

Based on the ENTIRE conversation (both what the patient said AND what the provider observed/asked), analyze and provide:

1. PRIMARY DIAGNOSES: Most likely diagnoses based on the complete clinical picture
   - Include confidence level (high/medium/low)
   - Provide reasoning based on symptoms, history, and clinical findings from the conversation
   - Include ICD-10 codes if you can confidently identify them

2. DIFFERENTIAL DIAGNOSES: Other conditions to consider
   - Explain why each should be considered
   - Base on information from the full conversation

3. RECOMMENDED TESTS: Diagnostic tests that would help confirm or rule out diagnoses
   - Explain why each test is recommended
   - Base recommendations on what was discussed in the conversation

4. TREATMENT CONSIDERATIONS: Initial treatment approaches discussed or implied
   - Include rationale for each treatment
   - Only include treatments that were mentioned or clearly implied in the conversation

5. FOLLOW-UP RECOMMENDATIONS: When and why to follow up
   - Based on the urgency and nature of the condition discussed

6. RED FLAGS: Any concerning symptoms or findings that require immediate attention

CRITICAL RULES:
- Analyze the ENTIRE conversation, not just patient statements
- Consider both subjective (patient-reported) and objective (provider-observed) information
- Base all recommendations on information explicitly present in the transcript
- Do NOT make up symptoms, findings, or treatments not mentioned
- Mark confidence levels appropriately based on available information
- Include ICD-10 codes only if you are confident about the diagnosis

Respond with JSON only:
{
  "primary_diagnoses": [
    {
      "diagnosis": "Most likely diagnosis name",
      "confidence": "high" | "medium" | "low",
      "reasoning": "Why this diagnosis is likely based on the conversation",
      "icd10_code": "ICD-10 code if confident (optional)"
    }
  ],
  "differential_diagnoses": [
    {
      "diagnosis": "Alternative diagnosis to consider",
      "reasoning": "Why this should be considered based on the conversation"
    }
  ],
  "recommended_tests": [
    {
      "test": "Test name",
      "reason": "Why this test is recommended based on the conversation"
    }
  ],
  "treatment_considerations": [
    {
      "treatment": "Treatment approach",
      "rationale": "Why this treatment is appropriate based on the conversation"
    }
  ],
  "follow_up_recommendations": {
    "timeframe": "When to follow up (e.g., '1 week', '2-3 days', 'As needed')",
    "reason": "Why this follow-up timeframe is recommended",
    "urgency": "routine" | "soon" | "urgent"
  },
  "red_flags": ["List any concerning symptoms or findings that require immediate attention"]
}`;

      const result = await callOpenAIJSON<Omit<DiagnosisResult, 'disclaimer' | 'generated_at'>>(prompt, {
        systemPrompt: "You are an expert medical diagnostic assistant. Analyze complete patient encounter transcripts and provide evidence-based diagnostic recommendations. Always base your analysis on the entire conversation, including both patient statements and provider observations. Return valid JSON only.",
        maxTokens: 3000,
      });

      if (result) {
        diagnosis = {
          ...result,
          disclaimer: diagnosis.disclaimer,
          generated_at: diagnosis.generated_at,
        };
        console.log("OpenAI diagnosis generation completed successfully");
      } else {
        console.error("Failed to parse OpenAI response");
        diagnosis = createFallbackDiagnosis(encounter, chunks, extractedFields);
      }
    } else {
      console.log("OpenAI not configured, using fallback diagnosis");
      diagnosis = createFallbackDiagnosis(encounter, chunks, extractedFields);
    }

    // Save as artifact
    await supabaseAdmin.from("artifacts").insert({
      encounter_id: encounterId,
      type: "diagnosis",
      content: diagnosis,
    });

    return jsonResponse({
      diagnosis,
      encounterId,
      debug: {
        openaiConfigured: isOpenAIConfigured(),
        transcriptChunks: chunks.length,
        hasExtractedFields: !!fieldsArtifact,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse(`Internal server error: ${error}`, 500);
  }
});

// Fallback diagnosis when OpenAI is not available
function createFallbackDiagnosis(
  encounter: any,
  chunks: any[],
  extractedFields: any
): DiagnosisResult {
  // Use full transcript for fallback analysis
  const fullText = chunks.map(c => c.text).join(" ").toLowerCase();
  
  const symptoms = (extractedFields.symptoms || []).map((s: string) => s.toLowerCase());
  
  // Basic pattern matching for common conditions
  const diagnosisMap: Record<string, string> = {
    "chest pain": "Chest pain - requires evaluation (I20.9)",
    "shortness of breath": "Dyspnea - requires evaluation (R06.02)",
    "fever": "Fever - requires evaluation (R50.9)",
    "headache": "Headache - requires evaluation (R51)",
    "abdominal pain": "Abdominal pain - requires evaluation (R10.9)",
    "cough": "Cough - requires evaluation (R05)",
  };

  const primaryDiagnoses: DiagnosisResult["primary_diagnoses"] = [];
  
  for (const [symptom, diagnosis] of Object.entries(diagnosisMap)) {
    if (fullText.includes(symptom) || symptoms.some((s: string) => s.includes(symptom))) {
      primaryDiagnoses.push({
        diagnosis,
        confidence: "low",
        reasoning: `Based on mention of ${symptom} in the conversation`,
      });
      break; // Use first match
    }
  }

  if (primaryDiagnoses.length === 0) {
    primaryDiagnoses.push({
      diagnosis: "Clinical evaluation needed",
      confidence: "low",
      reasoning: "Insufficient information for specific diagnosis. Full clinical evaluation required.",
    });
  }

  return {
    primary_diagnoses: primaryDiagnoses,
    differential_diagnoses: [],
    recommended_tests: [
      {
        test: "Clinical evaluation",
        reason: "Complete physical examination and history review needed",
      },
    ],
    treatment_considerations: [],
    follow_up_recommendations: {
      timeframe: "As needed",
      reason: "Follow up based on clinical course",
      urgency: "routine",
    },
    red_flags: extractedFields.urgency_indicators || [],
    disclaimer: "IMPORTANT: This is an AI-generated diagnostic analysis for educational and reference purposes only. It should NOT be used as a substitute for professional medical judgment, diagnosis, or treatment.",
    generated_at: new Date().toISOString(),
  }
}
