// Upload EHR Template Edge Function
// Handles template upload and extracts text content
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { callOpenAIJSON, isConfigured as isOpenAIConfigured } from "../_shared/openai.ts";

// PDF extraction library for Deno/serverless
import { getDocument } from "npm:pdfjs-serverless@0.3.2"; 

// DOCX extraction library
import mammoth from "npm:mammoth@1.6.0"; 

interface UploadTemplateRequest {
  templateName: string;
  templateContent: string; // Extracted text from the template
  fileUrl?: string;
  fileType?: string;
  fileData?: string; // Base64 encoded file data
  fileName?: string;
  customFields?: string; // Custom fields definition
}

interface CustomField {
  name: string;
  type: "text" | "number" | "array" | "boolean" | "date";
  required?: boolean;
  placeholder?: string;
  options?: string[]; // For select/dropdown
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
    const { templateName, templateContent, fileUrl, fileType, fileData, fileName, customFields } = body;

    if (!templateName) {
      return errorResponse("templateName is required");
    }

    // If we have fileData but no templateContent, we need to extract text
    let finalTemplateContent = templateContent;
    
    if (!finalTemplateContent && fileData) {
      try {
        // Decode base64 file data
        const fileBytes = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));
        
        // Determine file type from fileName or fileType
        const fileExtension = fileName?.split(".").pop()?.toLowerCase() || 
                             fileType?.split("/").pop()?.toLowerCase() || "";
        
        if (fileExtension === "pdf" || fileType === "application/pdf") {
          // Extract text from PDF
          console.log("Extracting text from PDF...");
          finalTemplateContent = await extractTextFromPdf(fileBytes);
        } else if (fileExtension === "docx" || fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          // Extract text from DOCX
          console.log("Extracting text from DOCX...");
          finalTemplateContent = await extractTextFromDocx(fileBytes);
        } else {
          return errorResponse(`Unsupported file type: ${fileExtension}. Please upload PDF, DOCX, or TXT file.`);
        }
        
        if (!finalTemplateContent || finalTemplateContent.trim().length === 0) {
          return errorResponse("Failed to extract text from file. The file may be empty or corrupted.");
        }
        
        console.log(`Successfully extracted ${finalTemplateContent.length} characters from ${fileExtension.toUpperCase()} file`);
      } catch (error) {
        console.error("Error extracting text from file:", error);
        return errorResponse(`Failed to extract text from file: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    if (!finalTemplateContent) {
      return errorResponse("templateContent is required. Please provide the template text or upload a PDF, DOCX, or TXT file.");
    }

    // Get user ID from auth header (optional for demo mode)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      // Only try to get user if it looks like a JWT (not the anon key)
      if (token.includes(".") && token.split(".").length === 3) {
        try {
          const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
          if (!authError && user) {
            userId = user.id;
          }
        } catch (e) {
          // Ignore auth errors in demo mode
          console.log("Auth check skipped (demo mode)");
        }
      }
    }

    // Parse custom fields
    let parsedCustomFields: CustomField[] = [];
    if (customFields && customFields.trim()) {
      try {
        // Try parsing as JSON first
        const jsonFields = JSON.parse(customFields);
        if (Array.isArray(jsonFields)) {
          parsedCustomFields = jsonFields;
        }
      } catch {
        // If not JSON, parse as simple text format: "Field Name: Type"
        const lines = customFields.split('\n').filter(l => l.trim());
        parsedCustomFields = lines.map((line, index) => {
          const match = line.match(/^(.+?):\s*(.+?)(?:\s*\(required\))?$/i);
          if (match) {
            const [, name, type] = match;
            return {
              name: name.trim(),
              type: (type.trim().toLowerCase() as CustomField["type"]) || "text",
              required: line.toLowerCase().includes("required"),
            };
          }
          // Fallback: treat whole line as field name
          return {
            name: line.trim(),
            type: "text" as const,
            required: false,
          };
        });
      }
    }

    // Save template to database (uploaded_by is optional for demo mode)
    const insertData: Record<string, unknown> = {
      template_name: templateName,
      template_content: templateContent,
      file_url: fileUrl,
      file_type: fileType,
      custom_fields: parsedCustomFields.length > 0 ? parsedCustomFields : null,
    };
    
    if (userId) {
      insertData.uploaded_by = userId;
    }

    const { data: template, error: templateError } = await supabaseAdmin
      .from("ehr_templates")
      .insert(insertData)
      .select()
      .single();

    if (templateError) {
      console.error("Template save error:", templateError);
      return errorResponse("Failed to save template", 500);
    }

    // Generate questions from template and custom fields using ChatGPT
    let questions: Question[] = [];

    // First, generate questions from custom fields if provided
    if (parsedCustomFields.length > 0 && isOpenAIConfigured()) {
      const customFieldsPrompt = `Generate patient-friendly questions for these custom fields:

${parsedCustomFields.map(f => `- ${f.name} (${f.type}${f.required ? ', required' : ''})`).join('\n')}

For each field, create a clear, patient-friendly question that will help collect this information during intake.

Return JSON:
{
  "questions": [
    {
      "id": "field_1",
      "question": "What is your blood pressure?",
      "category": "vital_signs",
      "required": true,
      "answered": false,
      "field_mapping": "blood_pressure"
    }
  ]
}`;

      try {
        const customQuestionsResult = await callOpenAIJSON<{ questions: Question[] }>(customFieldsPrompt, {
          systemPrompt: "You are a medical intake assistant. Generate patient-friendly questions for custom EHR fields. Always return valid JSON only.",
          model: "gpt-4o-mini",
        });

        if (customQuestionsResult && customQuestionsResult.questions) {
          questions = customQuestionsResult.questions.map((q, index) => ({
            ...q,
            id: q.id || `custom_${index + 1}`,
            answered: false,
            field_mapping: parsedCustomFields[index]?.name.toLowerCase().replace(/\s+/g, '_') || q.field_mapping,
          }));
        }
      } catch (e) {
        console.error("Error generating questions from custom fields:", e);
      }
    }

    // Then generate additional questions from template content
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
        model: "gpt-4o-mini",
      });

      if (result && result.questions) {
        // Merge template questions with custom field questions
        const templateQuestions = result.questions.map((q, index) => ({
          ...q,
          id: q.id || `template_q_${index + 1}`,
          answered: false,
        }));
        questions = [...questions, ...templateQuestions];
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

/**
 * Extract text from PDF file
 */
async function extractTextFromPdf(pdfBytes: Uint8Array): Promise<string> {
  try {
    const pdf = await getDocument({ data: pdfBytes }).promise;
    const numPages = pdf.numPages;
    const textParts: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      textParts.push(pageText);
    }

    return textParts.join("\n\n");
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract text from DOCX file
 */
async function extractTextFromDocx(docxBytes: Uint8Array): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer: docxBytes });
    return result.value;
  } catch (error) {
    console.error("DOCX extraction error:", error);
    throw new Error(`Failed to extract text from DOCX: ${error instanceof Error ? error.message : String(error)}`);
  }
}

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
