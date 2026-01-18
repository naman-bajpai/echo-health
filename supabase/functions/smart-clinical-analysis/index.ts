// Smart Clinical Analysis Edge Function
// Analyzes transcript in real-time and provides:
// 1. Possible conditions (differential diagnoses)
// 2. Recommended follow-up questions
// 3. Red flags and urgency indicators
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { callOpenAIJSON, isConfigured as isOpenAIConfigured } from "../_shared/openai.ts";

interface SmartAnalysisRequest {
  encounterId: string;
  latestTranscript?: string; // Optional: just the latest portion for incremental analysis
}

interface PossibleCondition {
  condition: string;
  likelihood: "high" | "medium" | "low";
  reasoning: string;
  supporting_symptoms: string[];
  icd10_hint?: string;
}

interface RecommendedQuestion {
  question: string;
  purpose: string;
  priority: "critical" | "important" | "helpful";
  category: string;
  related_conditions: string[];
}

interface ClinicalFocus {
  possible_conditions: PossibleCondition[];
  recommended_questions: RecommendedQuestion[];
  red_flags: string[];
  key_findings: string[];
  information_gaps: string[];
  suggested_tests: string[];
  urgency_level: "routine" | "urgent" | "emergent";
  clinical_summary: string;
  generated_at: string;
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: SmartAnalysisRequest = await req.json();
    const { encounterId, latestTranscript } = body;

    if (!encounterId) {
      return errorResponse("encounterId is required");
    }

    // Get encounter details
    const { data: encounter } = await supabaseAdmin
      .from("encounters")
      .select("*")
      .eq("id", encounterId)
      .single();

    // Get full transcript
    const { data: chunks } = await supabaseAdmin
      .from("transcript_chunks")
      .select("speaker, text")
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: true });

    const transcriptText = chunks
      ?.map((c) => `${c.speaker.toUpperCase()}: ${c.text}`)
      .join("\n") || "";

    if (!transcriptText || transcriptText.length < 10) {
      return jsonResponse({
        clinicalFocus: createEmptyClinicalFocus(),
        encounterId,
      });
    }

    // Get existing fields if available
    const { data: fieldsArtifact } = await supabaseAdmin
      .from("artifacts")
      .select("content")
      .eq("encounter_id", encounterId)
      .eq("type", "fields")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const extractedFields = fieldsArtifact?.content || {};

    let clinicalFocus: ClinicalFocus = createEmptyClinicalFocus();

    if (isOpenAIConfigured()) {
      const prompt = `You are an expert clinical decision support system. Analyze this patient encounter transcript and provide intelligent clinical insights.

ENCOUNTER CONTEXT:
- Patient: ${encounter?.patient_name || "Unknown"}
- Reason for Visit: ${encounter?.reason_for_visit || "Not specified"}

COMPLETE TRANSCRIPT:
${transcriptText}

EXTRACTED DATA SO FAR:
${JSON.stringify(extractedFields, null, 2)}

Based on this conversation, provide a comprehensive clinical analysis:

1. POSSIBLE CONDITIONS (Differential Diagnoses):
   - List ALL conditions that could explain the patient's symptoms
   - Rank by likelihood (high/medium/low)
   - Explain why each condition is being considered
   - Include ICD-10 code hints where confident

2. RECOMMENDED QUESTIONS TO ASK:
   - What additional questions should the nurse/provider ask?
   - Prioritize: critical (must ask), important (should ask), helpful (nice to know)
   - Explain the purpose of each question (what condition it helps rule in/out)
   - Group by category (symptom clarification, medical history, red flags, etc.)

3. RED FLAGS:
   - Any symptoms or findings requiring immediate attention
   - Signs of serious conditions

4. INFORMATION GAPS:
   - What important information is missing from the conversation?
   - What hasn't been asked that should be?

5. SUGGESTED DIAGNOSTIC TESTS:
   - What tests might help confirm or rule out conditions?

6. CLINICAL SUMMARY:
   - Brief summary of the clinical picture so far

CRITICAL RULES:
- Base ALL analysis on the actual transcript content
- Be thorough in differential diagnosis - consider common AND less common conditions
- Questions should be specific and actionable
- Prioritize patient safety - highlight any concerning findings
- Consider the full clinical context

Respond with JSON only:
{
  "possible_conditions": [
    {
      "condition": "Condition name",
      "likelihood": "high" | "medium" | "low",
      "reasoning": "Why this condition is being considered",
      "supporting_symptoms": ["symptom1", "symptom2"],
      "icd10_hint": "ICD-10 code if confident"
    }
  ],
  "recommended_questions": [
    {
      "question": "Specific question to ask",
      "purpose": "What this helps determine",
      "priority": "critical" | "important" | "helpful",
      "category": "symptom_clarification" | "medical_history" | "red_flags" | "social_history" | "medications" | "allergies" | "family_history",
      "related_conditions": ["conditions this question helps evaluate"]
    }
  ],
  "red_flags": ["Any concerning findings requiring attention"],
  "key_findings": ["Important clinical findings from the conversation"],
  "information_gaps": ["Missing information that should be gathered"],
  "suggested_tests": ["Diagnostic tests that might be helpful"],
  "urgency_level": "routine" | "urgent" | "emergent",
  "clinical_summary": "Brief clinical summary"
}`;

      const result = await callOpenAIJSON<Omit<ClinicalFocus, 'generated_at'>>(prompt, {
        systemPrompt: "You are an expert clinical decision support system. Analyze patient encounters and provide comprehensive differential diagnoses, recommended questions, and clinical insights. Always prioritize patient safety. Return valid JSON only.",
        maxTokens: 4000,
      });

      if (result) {
        clinicalFocus = {
          ...result,
          generated_at: new Date().toISOString(),
        };
      }
    }

    // Save as artifact
    await supabaseAdmin.from("artifacts").upsert({
      encounter_id: encounterId,
      type: "clinical_focus",
      content: clinicalFocus,
    }, { onConflict: "encounter_id,type" });

    return jsonResponse({
      clinicalFocus,
      encounterId,
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse(`Internal server error: ${error}`, 500);
  }
});

function createEmptyClinicalFocus(): ClinicalFocus {
  return {
    possible_conditions: [],
    recommended_questions: [],
    red_flags: [],
    key_findings: [],
    information_gaps: [],
    suggested_tests: [],
    urgency_level: "routine",
    clinical_summary: "Awaiting more clinical information...",
    generated_at: new Date().toISOString(),
  };
}
