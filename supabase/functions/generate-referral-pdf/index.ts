// Generate Referral PDF Edge Function
// Creates an editable referral PDF with suggested content from encounter
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { callOpenAIJSON, isConfigured as isOpenAIConfigured } from "../_shared/openai.ts";
import { createMultiPagePdf } from "../_shared/pdf.ts";

interface GenerateReferralPdfRequest {
  encounterId: string;
  specialistType?: string;
  providerId?: string;
  providerName?: string;
}

interface ReferralPdfContent {
  patient_name: string;
  patient_dob?: string;
  patient_mrn?: string;
  referring_provider: string;
  specialist_type: string;
  chief_complaint: string;
  reason_for_referral: string;
  clinical_summary: string;
  current_medications: string[];
  allergies: string[];
  relevant_history: string;
  diagnostic_findings: string;
  requested_evaluation: string;
  urgency: string;
  follow_up_instructions: string;
  generated_at: string;
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: GenerateReferralPdfRequest = await req.json();
    const { encounterId, specialistType, providerId, providerName } = body;

    if (!encounterId) {
      return errorResponse("encounterId is required");
    }

    // Get encounter data
    const { data: encounter, error: encounterError } = await supabaseAdmin
      .from("encounters")
      .select("*")
      .eq("id", encounterId)
      .single();

    if (encounterError || !encounter) {
      return errorResponse("Encounter not found", 404);
    }

    // Get patient data if available
    let patientData: any = null;
    if (encounter.patient_id) {
      const { data: patient } = await supabaseAdmin
        .from("patients")
        .select("*")
        .eq("id", encounter.patient_id)
        .single();
      patientData = patient;
    }

    // Get transcript
    const { data: chunks } = await supabaseAdmin
      .from("transcript_chunks")
      .select("speaker, text")
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: true });

    const transcriptText = chunks
      ?.map((c) => `${c.speaker.toUpperCase()}: ${c.text}`)
      .join("\n") || "";

    // Get artifacts
    const { data: artifacts } = await supabaseAdmin
      .from("artifacts")
      .select("type, content")
      .eq("encounter_id", encounterId);

    const fields = artifacts?.find(a => a.type === "fields")?.content as any;
    const draftNote = artifacts?.find(a => a.type === "draft_note")?.content as any;
    const summary = artifacts?.find(a => a.type === "summary")?.content as any;
    const clinicalFocus = artifacts?.find(a => a.type === "clinical_focus")?.content as any;
    const diagnosis = artifacts?.find(a => a.type === "diagnosis")?.content as any;

    // Determine specialist type
    const finalSpecialistType = specialistType || encounter.recommended_specialist || "Specialist";

    // Generate referral content using AI
    let referralContent: ReferralPdfContent = {
      patient_name: encounter.patient_name || patientData?.full_name || "Patient",
      patient_dob: patientData?.dob || undefined,
      patient_mrn: patientData?.mrn || undefined,
      referring_provider: "Primary Care Provider", // Could be from user profile
      specialist_type: finalSpecialistType,
      chief_complaint: encounter.reason_for_visit || "Not specified",
      reason_for_referral: "",
      clinical_summary: "",
      current_medications: fields?.medications || [],
      allergies: fields?.allergies || [],
      relevant_history: "",
      diagnostic_findings: "",
      requested_evaluation: "",
      urgency: encounter.urgency || "routine",
      follow_up_instructions: "",
      generated_at: new Date().toISOString(),
    };

    if (isOpenAIConfigured()) {
      const prompt = `You are a medical referral specialist. Generate a comprehensive referral letter based on this patient encounter.

ENCOUNTER DATA:
Patient: ${referralContent.patient_name}
Chief Complaint: ${referralContent.chief_complaint}
Specialist Type Needed: ${finalSpecialistType}

TRANSCRIPT:
${transcriptText.substring(0, 5000)}${transcriptText.length > 5000 ? "..." : ""}

CLINICAL DATA:
${JSON.stringify({
  symptoms: fields?.symptoms || [],
  medications: fields?.medications || [],
  allergies: fields?.allergies || [],
  medical_history: fields?.medical_history || [],
  vital_signs: fields?.vital_signs || {},
}, null, 2)}

SOAP NOTE:
${draftNote ? JSON.stringify(draftNote, null, 2) : "Not available"}

CLINICAL FOCUS:
${clinicalFocus ? JSON.stringify(clinicalFocus, null, 2) : "Not available"}

DIAGNOSIS:
${diagnosis ? JSON.stringify(diagnosis, null, 2) : "Not available"}

Generate a professional referral letter with the following sections. Be specific and include relevant clinical details from the encounter:

1. REASON FOR REFERRAL: Clear explanation of why this specialist consultation is needed
2. CLINICAL SUMMARY: Brief summary of the patient's presentation and key findings
3. RELEVANT HISTORY: Relevant medical history, medications, and allergies
4. DIAGNOSTIC FINDINGS: Any relevant test results, physical exam findings, or observations
5. REQUESTED EVALUATION: What specific evaluation or treatment is being requested from the specialist
6. URGENCY: Indicate if this is routine, urgent, or emergent
7. FOLLOW-UP INSTRUCTIONS: Any specific instructions for the specialist or patient

Return JSON only:
{
  "reason_for_referral": "Detailed reason...",
  "clinical_summary": "Comprehensive summary...",
  "relevant_history": "Relevant history...",
  "diagnostic_findings": "Findings...",
  "requested_evaluation": "Specific evaluation requested...",
  "urgency": "routine|urgent|emergent",
  "follow_up_instructions": "Instructions..."
}`;

      const result = await callOpenAIJSON<Partial<ReferralPdfContent>>(prompt, {
        systemPrompt: "You are a medical referral specialist. Generate professional, comprehensive referral letters. Always return valid JSON only.",
        maxTokens: 2000,
      });

      if (result) {
        referralContent = {
          ...referralContent,
          ...result,
          current_medications: result.current_medications || referralContent.current_medications,
          allergies: result.allergies || referralContent.allergies,
        };
      }
    } else {
      // Fallback content
      referralContent.reason_for_referral = `Patient presents with ${referralContent.chief_complaint}. Specialist consultation recommended for further evaluation and management.`;
      referralContent.clinical_summary = summary?.summary || "Clinical summary pending.";
      referralContent.relevant_history = fields?.medical_history?.join(", ") || "No significant history documented.";
      referralContent.diagnostic_findings = draftNote?.objective || "Diagnostic findings pending.";
      referralContent.requested_evaluation = `Please evaluate patient for ${finalSpecialistType} consultation regarding ${referralContent.chief_complaint}.`;
      referralContent.follow_up_instructions = "Please provide evaluation and treatment recommendations. Patient will follow up with primary care provider.";
    }

    // Generate PDF content
    const pdfText = buildReferralPdfText(referralContent, providerName);
    const pdfBytes = createMultiPagePdf(pdfText);

    // Store referral PDF as artifact
    const { data: artifact, error: artifactError } = await supabaseAdmin
      .from("artifacts")
      .upsert({
        encounter_id: encounterId,
        type: "referral_pdf",
        content: {
          ...referralContent,
          pdf_base64: btoa(String.fromCharCode(...pdfBytes)),
          provider_id: providerId,
          provider_name: providerName,
        },
      }, { onConflict: "encounter_id,type" })
      .select()
      .single();

    if (artifactError) {
      console.error("Artifact error:", artifactError);
      // Continue anyway - PDF was generated
    }

    return jsonResponse({
      pdfBase64: btoa(String.fromCharCode(...pdfBytes)),
      referralContent,
      artifactId: artifact?.id,
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse(`Internal server error: ${error}`, 500);
  }
});

/**
 * Build referral PDF text content
 */
function buildReferralPdfText(content: ReferralPdfContent, providerName?: string): string {
  const lines: string[] = [];

  lines.push("MEDICAL REFERRAL LETTER");
  lines.push("=".repeat(80));
  lines.push("");

  lines.push(`Date: ${new Date(content.generated_at).toLocaleDateString()}`);
  lines.push(`To: ${providerName || content.specialist_type}`);
  lines.push(`From: ${content.referring_provider}`);
  lines.push("");

  lines.push("PATIENT INFORMATION");
  lines.push("-".repeat(80));
  lines.push(`Name: ${content.patient_name}`);
  if (content.patient_dob) {
    lines.push(`Date of Birth: ${content.patient_dob}`);
  }
  if (content.patient_mrn) {
    lines.push(`MRN: ${content.patient_mrn}`);
  }
  lines.push("");

  lines.push("REASON FOR REFERRAL");
  lines.push("-".repeat(80));
  lines.push(content.reason_for_referral || "Specialist consultation requested.");
  lines.push("");

  lines.push("CHIEF COMPLAINT");
  lines.push("-".repeat(80));
  lines.push(content.chief_complaint);
  lines.push("");

  lines.push("CLINICAL SUMMARY");
  lines.push("-".repeat(80));
  lines.push(content.clinical_summary || "Clinical summary pending.");
  lines.push("");

  if (content.relevant_history) {
    lines.push("RELEVANT MEDICAL HISTORY");
    lines.push("-".repeat(80));
    lines.push(content.relevant_history);
    lines.push("");
  }

  if (content.current_medications && content.current_medications.length > 0) {
    lines.push("CURRENT MEDICATIONS");
    lines.push("-".repeat(80));
    content.current_medications.forEach(med => lines.push(`  - ${med}`));
    lines.push("");
  }

  if (content.allergies && content.allergies.length > 0) {
    lines.push("ALLERGIES");
    lines.push("-".repeat(80));
    content.allergies.forEach(allergy => lines.push(`  - ${allergy}`));
    lines.push("");
  }

  if (content.diagnostic_findings) {
    lines.push("DIAGNOSTIC FINDINGS");
    lines.push("-".repeat(80));
    lines.push(content.diagnostic_findings);
    lines.push("");
  }

  lines.push("REQUESTED EVALUATION");
  lines.push("-".repeat(80));
  lines.push(content.requested_evaluation || `Please evaluate patient for ${content.specialist_type} consultation.`);
  lines.push("");

  lines.push("URGENCY");
  lines.push("-".repeat(80));
  lines.push(content.urgency.toUpperCase());
  lines.push("");

  lines.push("FOLLOW-UP INSTRUCTIONS");
  lines.push("-".repeat(80));
  lines.push(content.follow_up_instructions || "Please provide evaluation and treatment recommendations. Patient will follow up with primary care provider.");
  lines.push("");

  lines.push("=".repeat(80));
  lines.push("This referral was generated using AI-assisted documentation. Please review all information for accuracy.");
  lines.push("");

  return lines.join("\n");
}
