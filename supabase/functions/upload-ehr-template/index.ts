// Upload EHR Template Edge Function
// Handles template upload and extracts text content
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { callOpenAIJSON, isConfigured as isOpenAIConfigured } from "../_shared/openai.ts";

interface UploadTemplateRequest {
  templateName: string;
  templateContent: string; // Extracted text from the template
  fileUrl?: string;
  fileType?: string;
  fileData?: string; // Base64 encoded file data
  fileName?: string;
}

interface Question {
  id: string;
  question: string;
  category: string;
  required: boolean;
  answered: boolean;
  answer?: string;
  field_mapping?: string; // Maps to which field in extracted_fields
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: UploadTemplateRequest = await req.json();
    const { templateName, templateContent, fileUrl, fileType, fileData, fileName } = body;

    if (!templateName) {
      return errorResponse("templateName is required");
    }

    // If we have fileData but no templateContent, we need to extract text
    // For now, we'll use the templateContent if provided, or use a placeholder
    let finalTemplateContent = templateContent;
    
    if (!finalTemplateContent && fileData) {
      // For PDF/DOCX, we would need a library to extract text
      // For now, we'll return an error asking for text content
      // In production, you'd use a library like pdf-parse or mammoth
      return errorResponse("Text extraction from PDF/DOCX files requires server-side processing. Please provide templateContent or use a TXT file.");
    }
    
    if (!finalTemplateContent) {
      return errorResponse("templateContent is required. Please provide the template text or upload a TXT file.");
    }

    // Get user ID from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Unauthorized", 401);
    }

    // Extract user ID from JWT (simplified - in production, verify the JWT)
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    // Save template to database
    const { data: template, error: templateError } = await supabaseAdmin
      .from("ehr_templates")
      .insert({
        uploaded_by: user.id,
        template_name: templateName,
        template_content: templateContent,
        file_url: fileUrl,
        file_type: fileType,
      })
      .select()
      .single();

    if (templateError) {
      console.error("Template save error:", templateError);
      return errorResponse("Failed to save template", 500);
    }

    // Generate questions from template using ChatGPT
    let questions: Question[] = [];

    if (isOpenAIConfigured()) {
      const prompt = `You are a medical intake assistant. Analyze this EHR template and generate a comprehensive list of questions that a nurse should ask the patient during intake.

EHR TEMPLATE:
${templateContent}

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

    // If no questions generated, create default questions
    if (questions.length === 0) {
      questions = createDefaultQuestions();
    }

    return jsonResponse({
      template,
      questions,
      message: `Generated ${questions.length} questions from template`,
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse(`Internal server error: ${error}`, 500);
  }
});

function createDefaultQuestions(): Question[] {
  return [
    {
      id: "q_1",
      question: "What is your full name?",
      category: "demographics",
      required: true,
      answered: false,
      field_mapping: "patient_name",
    },
    {
      id: "q_2",
      question: "What is your date of birth?",
      category: "demographics",
      required: true,
      answered: false,
      field_mapping: "dob",
    },
    {
      id: "q_3",
      question: "What brings you in today? What is your main concern?",
      category: "chief_complaint",
      required: true,
      answered: false,
      field_mapping: "chief_complaint",
    },
    {
      id: "q_4",
      question: "Are you currently taking any medications? If yes, please list them.",
      category: "medications",
      required: true,
      answered: false,
      field_mapping: "medications",
    },
    {
      id: "q_5",
      question: "Do you have any allergies to medications, foods, or other substances?",
      category: "allergies",
      required: true,
      answered: false,
      field_mapping: "allergies",
    },
    {
      id: "q_6",
      question: "Do you have any past medical conditions or chronic illnesses?",
      category: "medical_history",
      required: false,
      answered: false,
      field_mapping: "medical_history",
    },
    {
      id: "q_7",
      question: "Have you had any surgeries or hospitalizations in the past?",
      category: "medical_history",
      required: false,
      answered: false,
      field_mapping: "medical_history",
    },
    {
      id: "q_8",
      question: "Do you smoke, drink alcohol, or use recreational drugs?",
      category: "social_history",
      required: false,
      answered: false,
    },
  ];
}
