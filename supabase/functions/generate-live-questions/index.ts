// Generate Live Questions Edge Function
// Generates questions in real-time based on current transcript
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { callOpenAIJSON, isConfigured as isOpenAIConfigured } from "../_shared/openai.ts";

interface GenerateLiveQuestionsRequest {
  encounterId: string;
}

interface LiveQuestion {
  id: string;
  question: string;
  category: string;
  priority: "critical" | "important" | "helpful";
  context: string;
  suggested_follow_up?: string;
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: GenerateLiveQuestionsRequest = await req.json();
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

    if (!encounter) {
      return errorResponse("Encounter not found", 404);
    }

    // Get current transcript
    const { data: chunks } = await supabaseAdmin
      .from("transcript_chunks")
      .select("speaker, text, created_at")
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: true });

    if (!chunks || chunks.length === 0) {
      return jsonResponse({ questions: [] });
    }

    const transcriptText = chunks
      .map((c) => `${c.speaker.toUpperCase()}: ${c.text}`)
      .join("\n");

    // Get existing fields and clinical focus
    const { data: artifacts } = await supabaseAdmin
      .from("artifacts")
      .select("type, content")
      .eq("encounter_id", encounterId);

    const fields = artifacts?.find(a => a.type === "fields")?.content as any;
    const clinicalFocus = artifacts?.find(a => a.type === "clinical_focus")?.content as any;

    // Get already asked questions from transcript (provider/staff questions)
    const askedQuestions = chunks
      .filter(c => c.speaker === "staff" || c.speaker === "provider" || c.speaker === "clinician")
      .map(c => c.text)
      .filter(text => text.includes("?") || text.toLowerCase().includes("what") || text.toLowerCase().includes("how") || text.toLowerCase().includes("when") || text.toLowerCase().includes("where") || text.toLowerCase().includes("why"));

    let questions: LiveQuestion[] = [];

    if (isOpenAIConfigured()) {
      const prompt = `You are a medical intake assistant. Analyze this ongoing patient encounter transcript and generate relevant follow-up questions that the nurse/provider should ask based on what has been discussed so far.

TRANSCRIPT SO FAR:
${transcriptText.substring(0, 8000)}${transcriptText.length > 8000 ? "..." : ""}

ALREADY ASKED QUESTIONS:
${askedQuestions.slice(-10).join("\n") || "None yet"}

CURRENT CLINICAL DATA:
${JSON.stringify({
  symptoms: fields?.symptoms || [],
  medications: fields?.medications || [],
  allergies: fields?.allergies || [],
  chief_complaint: encounter.reason_for_visit,
}, null, 2)}

CLINICAL FOCUS (if available):
${clinicalFocus ? JSON.stringify(clinicalFocus.possible_conditions?.slice(0, 3), null, 2) : "Not available"}

Based on the conversation so far, generate 5-10 relevant follow-up questions that:
1. Fill in information gaps
2. Clarify symptoms (duration, severity, triggers, location)
3. Explore differential diagnoses mentioned
4. Gather missing medical history
5. Understand medication compliance
6. Assess risk factors
7. Clarify any ambiguous statements

For each question:
- Make it specific and actionable
- Base it on what was actually discussed
- Don't repeat questions already asked
- Prioritize: critical (urgent/important), important (should ask), helpful (nice to know)

Return JSON only:
{
  "questions": [
    {
      "id": "q1",
      "question": "Can you describe the exact location of the pain?",
      "category": "symptoms",
      "priority": "important",
      "context": "Patient mentioned pain but location unclear",
      "suggested_follow_up": "Ask about radiation, quality, and triggers"
    }
  ]
}`;

      const result = await callOpenAIJSON<{ questions: LiveQuestion[] }>(prompt, {
        systemPrompt: "You are a medical intake assistant. Generate relevant, specific follow-up questions based on ongoing patient conversations. Always return valid JSON only.",
        maxTokens: 2000,
      });

      if (result && result.questions) {
        questions = result.questions.map((q, index) => ({
          ...q,
          id: q.id || `live_q_${Date.now()}_${index}`,
        }));
      }
    } else {
      // Fallback: Generate basic questions based on what's missing
      if (!fields?.symptom_duration) {
        questions.push({
          id: `live_q_${Date.now()}_1`,
          question: "How long have you been experiencing these symptoms?",
          category: "symptoms",
          priority: "important",
          context: "Duration not yet discussed",
        });
      }
      if (!fields?.symptom_severity) {
        questions.push({
          id: `live_q_${Date.now()}_2`,
          question: "On a scale of 1-10, how severe are your symptoms?",
          category: "symptoms",
          priority: "important",
          context: "Severity not yet discussed",
        });
      }
      if (fields?.symptoms && fields.symptoms.length > 0 && !fields?.medications) {
        questions.push({
          id: `live_q_${Date.now()}_3`,
          question: "Are you currently taking any medications?",
          category: "medications",
          priority: "important",
          context: "Medications not yet discussed",
        });
      }
    }

    // Store as artifact (update existing live_questions artifact)
    await supabaseAdmin
      .from("artifacts")
      .upsert({
        encounter_id: encounterId,
        type: "live_questions",
        content: {
          questions,
          generated_at: new Date().toISOString(),
          transcript_length: chunks.length,
        },
      }, { onConflict: "encounter_id,type" });

    return jsonResponse({
      questions,
      encounterId,
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse(`Internal server error: ${error}`, 500);
  }
});
