// Generate Questions from EHR Template
// Analyzes template and creates questions for nurse to ask
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { callOpenAIJSON, isConfigured as isOpenAIConfigured } from "../_shared/openai.ts";

interface GenerateQuestionsRequest {
  templateId: string;
  encounterId?: string;
}

interface Question {
  id: string;
  question: string;
  category: string;
  required: boolean;
  answered: boolean;
  answer?: string;
  field_mapping?: string;
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: GenerateQuestionsRequest = await req.json();
    const { templateId, encounterId } = body;

    if (!templateId) {
      return errorResponse("templateId is required");
    }

    // Get template
    const { data: template, error: templateError } = await supabaseAdmin
      .from("ehr_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (templateError || !template) {
      return errorResponse("Template not found", 404);
    }

    let questions: Question[] = [];

    if (isOpenAIConfigured()) {
      const prompt = `You are a medical intake assistant. Analyze this EHR template and generate a comprehensive list of questions that a nurse should ask the patient during intake.

EHR TEMPLATE:
${template.template_content}

Based on this template, generate questions that will help collect all the necessary information. Consider:
1. Patient demographics and contact information
2. Chief complaint and reason for visit
3. Medical history (past conditions, surgeries, hospitalizations)
4. Current medications and dosages
5. Allergies (medications, food, environmental)
6. Family medical history
7. Social history (smoking, alcohol, drugs, occupation)
8. Review of systems (symptoms by body system)
9. Vital signs to be measured
10. Any template-specific fields

For each question, provide:
- The question text (clear, patient-friendly language)
- Category (demographics, chief_complaint, medical_history, medications, allergies, social_history, review_of_systems, vital_signs, other)
- Whether it's required (true/false)
- Field mapping (which field in the system this maps to: patient_name, dob, chief_complaint, symptoms, medications, allergies, medical_history, vital_signs, etc.)

Respond with JSON only:
{
  "questions": [
    {
      "id": "unique_id",
      "question": "What is your full name?",
      "category": "demographics",
      "required": true,
      "answered": false,
      "field_mapping": "patient_name"
    }
  ]
}`;

      const result = await callOpenAIJSON<{ questions: Question[] }>(prompt, {
        systemPrompt: "You are a medical intake specialist. Generate comprehensive, patient-friendly questions based on EHR templates. Always return valid JSON only.",
        maxTokens: 3000,
      });

      if (result && result.questions) {
        questions = result.questions.map((q, index) => ({
          ...q,
          id: q.id || `q_${index + 1}`,
          answered: false,
        }));
      }
    }

    // Save questions to database
    const { data: savedQuestions, error: saveError } = await supabaseAdmin
      .from("generated_questions")
      .insert({
        template_id: templateId,
        encounter_id: encounterId,
        questions: questions,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Save questions error:", saveError);
      return errorResponse("Failed to save questions", 500);
    }

    return jsonResponse({
      questions,
      questionsId: savedQuestions.id,
      templateId,
      encounterId,
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse(`Internal server error: ${error}`, 500);
  }
});
