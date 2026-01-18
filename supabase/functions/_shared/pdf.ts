// PDF Generation
// Creates comprehensive patient encounter report PDFs for doctor review

import type { PatientSummary, ExtractedFields, DraftNote } from "./types.ts";

interface BillingCode {
  code: string;
  description: string;
  confidence: string;
  rationale: string;
}

interface BillingCodesResult {
  icd10_codes: BillingCode[];
  cpt_codes: BillingCode[];
  disclaimer: string;
}

interface PossibleCondition {
  condition: string;
  likelihood: "high" | "medium" | "low";
  reasoning: string;
  supporting_symptoms?: string[];
  icd10_hint?: string;
}

interface ClinicalFocus {
  possible_conditions: PossibleCondition[];
  recommended_questions?: any[];
  red_flags: string[];
  key_findings: string[];
  information_gaps: string[];
  suggested_tests: string[];
  urgency_level: string;
  clinical_summary: string;
}

interface DiagnosisResult {
  primary_diagnoses: Array<{
    diagnosis: string;
    confidence: string;
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
    urgency: string;
  };
  red_flags: string[];
}

interface TranscriptChunk {
  speaker: string;
  text: string;
  timestamp?: string;
}

interface EncounterInfo {
  id: string;
  patient_name?: string;
  patient_dob?: string;
  reason_for_visit?: string;
  urgency: string;
  urgency_reason?: string;
  specialist_needed: boolean;
  recommended_specialist?: string;
  status: string;
  created_at: string;
}

interface Referral {
  provider: {
    name: string;
    specialty: string;
    address: string;
    phone: string;
  };
  reason: string;
  status: string;
  instructions?: string;
}

interface PdfOptions {
  summary: PatientSummary;
  fields?: ExtractedFields | null;
  draftNote?: DraftNote | null;
  billingCodes?: BillingCodesResult | null;
  diagnosis?: DiagnosisResult | null;
  clinicalFocus?: ClinicalFocus | null;
  referrals?: Referral[] | null;
  transcript?: TranscriptChunk[] | null;
  encounter?: EncounterInfo | null;
  patientName?: string;
  encounterDate?: string;
  encounterId?: string;
}

/**
 * Generate a comprehensive PDF from encounter data
 */
export function generateSummaryPdf(options: PdfOptions): Uint8Array {
  try {
    const content = buildPdfContent(options);
    if (!content || content.trim().length === 0) {
      console.error("PDF content is empty, using fallback");
      return createMultiPagePdf("ERROR: No content available to generate PDF.\n\nPlease ensure the encounter has been completed and artifacts have been generated.");
    }
    return createMultiPagePdf(content);
  } catch (error) {
    console.error("Error generating PDF:", error);
    return createMultiPagePdf(`ERROR: Failed to generate PDF.\n\n${error instanceof Error ? error.message : String(error)}`);
  }
}

// Keep backward compatibility
export function generateSummaryPdfLegacy(
  summary: PatientSummary,
  patientName?: string,
  encounterDate?: string
): Uint8Array {
  return generateSummaryPdf({ summary, patientName, encounterDate });
}

/**
 * Build comprehensive PDF content string
 */
function buildPdfContent(options: PdfOptions): string {
  const {
    summary,
    fields,
    draftNote,
    billingCodes,
    diagnosis,
    clinicalFocus,
    referrals,
    transcript,
    encounter,
    patientName,
    encounterDate,
    encounterId,
  } = options;

  const lines: string[] = [];
  const divider = "================================================================";
  const subDivider = "----------------------------------------------------------------";
  const thinDivider = "- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -";

  // Ensure we always have at least basic content
  const hasAnyContent = summary || fields || draftNote || billingCodes || diagnosis || 
                        clinicalFocus || (transcript && transcript.length > 0) || encounter;

  if (!hasAnyContent) {
    lines.push("ECHO HEALTH - ENCOUNTER REPORT");
    lines.push(divider);
    lines.push("");
    lines.push("No encounter data available.");
    lines.push("This encounter may still be in progress.");
    lines.push("");
    return lines.join("\n");
  }

  // ==================== PAGE 1: HEADER & PATIENT INFO ====================
  lines.push("");
  lines.push("                         ECHO HEALTH");
  lines.push("                COMPREHENSIVE ENCOUNTER REPORT");
  lines.push("                     FOR PHYSICIAN REVIEW");
  lines.push("");
  lines.push(divider);
  lines.push("");

  // Urgency Alert (if urgent/emergent)
  if (encounter?.urgency && encounter.urgency !== "routine") {
    lines.push(`*** URGENCY: ${encounter.urgency.toUpperCase()} ***`);
    if (encounter.urgency_reason) {
      lines.push(`Reason: ${wrapText(encounter.urgency_reason, 55)}`);
    }
    lines.push("");
  }

  // Patient Information Section
  lines.push("PATIENT INFORMATION");
  lines.push(subDivider);
  lines.push(`Name: ${patientName || encounter?.patient_name || "Not provided"}`);
  if (fields?.dob || encounter?.patient_dob) {
    lines.push(`Date of Birth: ${fields?.dob || encounter?.patient_dob}`);
  }
  lines.push(`Visit Date: ${encounterDate || new Date(encounter?.created_at || "").toLocaleDateString() || new Date().toLocaleDateString()}`);
  lines.push(`Visit Time: ${new Date(encounter?.created_at || "").toLocaleTimeString() || ""}`);
  if (encounterId || encounter?.id) {
    lines.push(`Encounter ID: ${encounterId || encounter?.id}`);
  }
  lines.push(`Status: ${encounter?.status || "Active"}`);
  lines.push("");

  // Reason for Visit
  lines.push("REASON FOR VISIT");
  lines.push(subDivider);
  lines.push(wrapText(
    encounter?.reason_for_visit || fields?.reason_for_visit || fields?.chief_complaint || "General consultation",
    60
  ));
  lines.push("");

  // ==================== RED FLAGS SECTION ====================
  const allRedFlags = [
    ...(clinicalFocus?.red_flags || []),
    ...(diagnosis?.red_flags || []),
    ...(fields?.urgency_indicators || []),
  ];

  if (allRedFlags.length > 0) {
    lines.push("!!! RED FLAGS - REQUIRES IMMEDIATE ATTENTION !!!");
    lines.push(subDivider);
    const uniqueFlags = [...new Set(allRedFlags)];
    for (const flag of uniqueFlags) {
      lines.push(`  [!] ${wrapText(flag, 55)}`);
    }
    lines.push("");
  }

  // ==================== CLINICAL FOCUS / DIFFERENTIAL DIAGNOSIS ====================
  if (clinicalFocus?.possible_conditions && clinicalFocus.possible_conditions.length > 0) {
    lines.push("DIFFERENTIAL DIAGNOSES (AI-GENERATED)");
    lines.push(subDivider);
    
    for (const condition of clinicalFocus.possible_conditions) {
      const likelihood = condition.likelihood.toUpperCase();
      lines.push(`  [${likelihood}] ${condition.condition}`);
      if (condition.icd10_hint) {
        lines.push(`         ICD-10: ${condition.icd10_hint}`);
      }
      lines.push(`         ${wrapText(condition.reasoning, 50)}`);
      if (condition.supporting_symptoms && condition.supporting_symptoms.length > 0) {
        lines.push(`         Supporting: ${condition.supporting_symptoms.join(", ")}`);
      }
      lines.push("");
    }
    
    if (clinicalFocus.clinical_summary) {
      lines.push("Clinical Summary:");
      lines.push(wrapText(clinicalFocus.clinical_summary, 60));
      lines.push("");
    }
  }

  // ==================== PRIMARY DIAGNOSES ====================
  if (diagnosis?.primary_diagnoses && diagnosis.primary_diagnoses.length > 0) {
    lines.push("PRIMARY DIAGNOSES");
    lines.push(subDivider);
    for (const dx of diagnosis.primary_diagnoses) {
      lines.push(`  * ${dx.diagnosis}`);
      if (dx.icd10_code) {
        lines.push(`    Code: ${dx.icd10_code}`);
      }
      lines.push(`    Confidence: ${dx.confidence}`);
      lines.push(`    ${wrapText(dx.reasoning, 50)}`);
      lines.push("");
    }
  }

  // ==================== REPORTED SYMPTOMS ====================
  if (fields?.symptoms && fields.symptoms.length > 0) {
    lines.push("REPORTED SYMPTOMS");
    lines.push(subDivider);
    for (let i = 0; i < fields.symptoms.length; i++) {
      lines.push(`  ${i + 1}. ${wrapText(fields.symptoms[i], 55)}`);
    }
    if (fields.symptom_duration) {
      lines.push(`  Duration: ${fields.symptom_duration}`);
    }
    if (fields.symptom_severity) {
      lines.push(`  Severity: ${fields.symptom_severity}`);
    }
    lines.push("");
  }

  // ==================== KEY FINDINGS ====================
  if (clinicalFocus?.key_findings && clinicalFocus.key_findings.length > 0) {
    lines.push("KEY CLINICAL FINDINGS");
    lines.push(subDivider);
    for (const finding of clinicalFocus.key_findings) {
      lines.push(`  * ${wrapText(finding, 55)}`);
    }
    lines.push("");
  }

  // ==================== DRAFT SOAP NOTE ====================
  if (draftNote) {
    lines.push(divider);
    lines.push("DRAFT SOAP NOTE");
    lines.push(divider);
    lines.push("");
    
    if (draftNote.subjective) {
      lines.push("SUBJECTIVE");
      lines.push(thinDivider);
      lines.push(wrapText(draftNote.subjective, 60));
      lines.push("");
    }
    
    if (draftNote.objective) {
      lines.push("OBJECTIVE");
      lines.push(thinDivider);
      lines.push(wrapText(draftNote.objective, 60));
      lines.push("");
    }
    
    if (draftNote.assessment) {
      lines.push("ASSESSMENT");
      lines.push(thinDivider);
      lines.push(wrapText(draftNote.assessment, 60));
      lines.push("");
    }
    
    if (draftNote.plan) {
      lines.push("PLAN");
      lines.push(thinDivider);
      lines.push(wrapText(draftNote.plan, 60));
      lines.push("");
    }
  }

  // ==================== VISIT SUMMARY ====================
  lines.push(divider);
  lines.push("VISIT SUMMARY");
  lines.push(divider);
  lines.push("");
  lines.push(wrapText(summary.visit_summary || "Summary pending.", 60));
  lines.push("");

  // Summary Diagnoses
  if (summary.diagnoses && summary.diagnoses.length > 0) {
    lines.push("Summary Diagnoses:");
    for (const dx of summary.diagnoses) {
      lines.push(`  * ${wrapText(dx, 55)}`);
    }
    lines.push("");
  }

  // ==================== TREATMENT PLAN ====================
  if (summary.treatment_plan && summary.treatment_plan.length > 0) {
    lines.push("TREATMENT PLAN");
    lines.push(subDivider);
    for (let i = 0; i < summary.treatment_plan.length; i++) {
      lines.push(`  ${i + 1}. ${wrapText(summary.treatment_plan[i], 55)}`);
    }
    lines.push("");
  }

  // Treatment Considerations from diagnosis
  if (diagnosis?.treatment_considerations && diagnosis.treatment_considerations.length > 0) {
    lines.push("TREATMENT CONSIDERATIONS (AI)");
    lines.push(subDivider);
    for (const tc of diagnosis.treatment_considerations) {
      lines.push(`  * ${tc.treatment}`);
      lines.push(`    Rationale: ${wrapText(tc.rationale, 50)}`);
    }
    lines.push("");
  }

  // ==================== MEDICATIONS ====================
  const allMedications = [
    ...(summary.medications || []),
    ...(fields?.medications || []),
  ];
  const uniqueMedications = [...new Set(allMedications)];
  
  if (uniqueMedications.length > 0) {
    lines.push("MEDICATIONS");
    lines.push(subDivider);
    for (const medication of uniqueMedications) {
      lines.push(`  * ${wrapText(medication, 55)}`);
    }
    lines.push("");
  }

  // ==================== ALLERGIES ====================
  if (fields?.allergies && fields.allergies.length > 0) {
    lines.push("KNOWN ALLERGIES");
    lines.push(subDivider);
    for (const allergy of fields.allergies) {
      lines.push(`  * ${allergy}`);
    }
    lines.push("");
  }

  // ==================== SUGGESTED TESTS ====================
  const allTests = [
    ...(clinicalFocus?.suggested_tests || []),
    ...(diagnosis?.recommended_tests?.map(t => `${t.test} - ${t.reason}`) || []),
  ];
  
  if (allTests.length > 0) {
    lines.push("RECOMMENDED DIAGNOSTIC TESTS");
    lines.push(subDivider);
    for (let i = 0; i < allTests.length; i++) {
      lines.push(`  ${i + 1}. ${wrapText(allTests[i], 55)}`);
    }
    lines.push("");
  }

  // ==================== REFERRALS ====================
  if ((referrals && referrals.length > 0) || encounter?.specialist_needed) {
    lines.push("SPECIALIST REFERRALS");
    lines.push(subDivider);
    
    if (encounter?.specialist_needed && encounter?.recommended_specialist) {
      lines.push(`  Recommended Specialist: ${encounter.recommended_specialist}`);
      lines.push("");
    }
    
    if (referrals && referrals.length > 0) {
      for (const referral of referrals) {
        if (referral.provider) {
          lines.push(`  Provider: ${referral.provider.name}`);
          lines.push(`  Specialty: ${referral.provider.specialty}`);
          lines.push(`  Address: ${referral.provider.address}`);
          lines.push(`  Phone: ${referral.provider.phone}`);
        }
        if (referral.reason) {
          lines.push(`  Reason: ${wrapText(referral.reason, 50)}`);
        }
        lines.push(`  Status: ${referral.status || "Pending"}`);
        if (referral.instructions) {
          lines.push(`  Instructions: ${wrapText(referral.instructions, 45)}`);
        }
        lines.push("");
      }
    }
  }

  // ==================== FOLLOW-UP ====================
  if (summary.follow_up || diagnosis?.follow_up_recommendations) {
    lines.push("FOLLOW-UP RECOMMENDATIONS");
    lines.push(subDivider);
    if (summary.follow_up) {
      lines.push(wrapText(summary.follow_up, 60));
    }
    if (diagnosis?.follow_up_recommendations) {
      const fu = diagnosis.follow_up_recommendations;
      lines.push(`  Timeframe: ${fu.timeframe}`);
      lines.push(`  Urgency: ${fu.urgency}`);
      lines.push(`  Reason: ${wrapText(fu.reason, 50)}`);
    }
    lines.push("");
  }

  // ==================== BILLING CODES ====================
  if (billingCodes) {
    lines.push(divider);
    lines.push("BILLING CODES");
    lines.push(divider);
    lines.push("");
    
    // ICD-10 Codes
    if (billingCodes.icd10_codes && billingCodes.icd10_codes.length > 0) {
      lines.push("ICD-10 DIAGNOSIS CODES");
      lines.push(thinDivider);
      for (const code of billingCodes.icd10_codes) {
        lines.push(`  ${code.code} - ${code.description}`);
        lines.push(`    Confidence: ${code.confidence}`);
        if (code.rationale) {
          lines.push(`    ${wrapText(code.rationale, 50)}`);
        }
      }
      lines.push("");
    }
    
    // CPT Codes
    if (billingCodes.cpt_codes && billingCodes.cpt_codes.length > 0) {
      lines.push("CPT PROCEDURE CODES");
      lines.push(thinDivider);
      for (const code of billingCodes.cpt_codes) {
        lines.push(`  ${code.code} - ${code.description}`);
        lines.push(`    Confidence: ${code.confidence}`);
        if (code.rationale) {
          lines.push(`    ${wrapText(code.rationale, 50)}`);
        }
      }
      lines.push("");
    }
  }

  // ==================== PATIENT INSTRUCTIONS ====================
  if (summary.patient_instructions && summary.patient_instructions.length > 0) {
    lines.push("PATIENT INSTRUCTIONS");
    lines.push(subDivider);
    for (let i = 0; i < summary.patient_instructions.length; i++) {
      lines.push(`  ${i + 1}. ${wrapText(summary.patient_instructions[i], 55)}`);
    }
    lines.push("");
  }

  // ==================== WARNING SIGNS ====================
  if (summary.warning_signs && summary.warning_signs.length > 0) {
    lines.push("WARNING SIGNS (FOR PATIENT)");
    lines.push(subDivider);
    lines.push("Seek immediate medical attention if experiencing:");
    for (const sign of summary.warning_signs) {
      lines.push(`  * ${wrapText(sign, 55)}`);
    }
    lines.push("");
  }

  // ==================== INFORMATION GAPS ====================
  if (clinicalFocus?.information_gaps && clinicalFocus.information_gaps.length > 0) {
    lines.push("INFORMATION GAPS IDENTIFIED");
    lines.push(subDivider);
    for (const gap of clinicalFocus.information_gaps) {
      lines.push(`  ? ${wrapText(gap, 55)}`);
    }
    lines.push("");
  }

  // ==================== FULL TRANSCRIPT ====================
  if (transcript && transcript.length > 0) {
    lines.push(divider);
    lines.push("ENCOUNTER TRANSCRIPT");
    lines.push(divider);
    lines.push("");
    lines.push(`Total exchanges: ${transcript.length}`);
    lines.push("");
    
    for (const chunk of transcript) {
      const speaker = chunk.speaker.toUpperCase();
      const prefix = speaker === "PATIENT" ? "[P]" : speaker === "CLINICIAN" ? "[C]" : "[S]";
      lines.push(`${prefix} ${wrapText(chunk.text, 55)}`);
      lines.push("");
    }
  }

  // ==================== FOOTER / DISCLAIMER ====================
  lines.push(divider);
  lines.push("");
  lines.push("                    IMPORTANT NOTICE");
  lines.push("");
  lines.push("This report was generated by Echo Health AI and is intended");
  lines.push("for physician review only. All AI-generated content should");
  lines.push("be verified and validated by a licensed healthcare provider");
  lines.push("before making clinical decisions.");
  lines.push("");
  if (summary.disclaimer) {
    lines.push(wrapText(summary.disclaimer, 60));
  }
  lines.push("");
  lines.push(divider);
  lines.push("");
  lines.push(`Report Generated: ${new Date().toLocaleString()}`);
  lines.push("Echo Health - AI-Powered Clinical Documentation");
  lines.push("");

  return lines.join("\n");
}

/**
 * Wrap text to fit within specified width
 */
function wrapText(text: string, maxWidth: number): string {
  if (!text) return "";
  if (text.length <= maxWidth) return text;
  
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxWidth) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.join("\n      "); // Indent continuation lines
}

/**
 * Escape text for PDF content stream
 */
function escapePdfText(text: string): string {
  if (!text) return "";
  // Remove null bytes and other problematic characters
  return String(text)
    .replace(/\0/g, "") // Remove null bytes
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "    ") // Replace tabs with spaces
    .substring(0, 1000); // Limit length to prevent issues
}

/**
 * Create a multi-page PDF with all content
 */
function createMultiPagePdf(content: string): Uint8Array {
  if (!content || content.trim().length === 0) {
    content = "No content available for this encounter.";
  }

  const lines = content.split("\n");
  const linesPerPage = 60; // Lines per page
  const pages: string[][] = [];
  
  // Split content into pages
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  
  if (pages.length === 0) {
    pages.push(["No content available"]);
  }

  // Build PDF structure - use fixed object numbering
  const objects: string[] = [];
  
  // Object 1: Catalog
  // Object 2: Pages
  // Object 3: Font
  // Objects 4+: Pages and Content streams (alternating)
  
  const catalogObjNum = 1;
  const pagesObjNum = 2;
  const fontObjNum = 3;
  let nextObjNum = 4;
  
  const pageObjs: number[] = [];
  const contentObjs: number[] = [];
  
  // Reserve object numbers for pages
  for (let i = 0; i < pages.length; i++) {
    pageObjs.push(nextObjNum++);
    contentObjs.push(nextObjNum++);
  }
  
  // Build objects array in order
  // 1. Catalog
  objects.push(`${catalogObjNum} 0 obj\n<< /Type /Catalog /Pages ${pagesObjNum} 0 R >>\nendobj\n`);
  
  // 2. Pages
  const pageRefs = pageObjs.map(n => `${n} 0 R`).join(" ");
  objects.push(`${pagesObjNum} 0 obj\n<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>\nendobj\n`);
  
  // 3. Font
  objects.push(`${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n`);
  
  // 4+. Pages and Content streams
  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const pageLines = pages[pageIdx];
    const pageObjNum = pageObjs[pageIdx];
    const contentObjNum = contentObjs[pageIdx];
    
    // Build content stream
    let stream = "BT\n/F1 9 Tf\n";
    let y = 770;
    const lineHeight = 12;
    const leftMargin = 50;
    const rightMargin = 550;
    
    // Add page number at bottom
    const pageNumText = escapePdfText(`Page ${pageIdx + 1} of ${pages.length}`);
    stream += `1 0 0 1 ${rightMargin} 30 Tm\n(${pageNumText}) Tj\n`;
    
    // Add content lines
    for (const line of pageLines) {
      if (y < 50) break; // Leave space for page number
      
      const escaped = escapePdfText(line);
      if (escaped.trim().length === 0) {
        y -= lineHeight / 2; // Smaller spacing for empty lines
        continue;
      }
      
      stream += `1 0 0 1 ${leftMargin} ${y} Tm\n(${escaped}) Tj\n`;
      y -= lineHeight;
    }
    
    stream += "ET\n";
    
    // Page object (must come before content stream)
    objects.push(`${pageObjNum} 0 obj\n<< /Type /Page /Parent ${pagesObjNum} 0 R /MediaBox [0 0 612 792] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> >>\nendobj\n`);
    
    // Content stream object
    objects.push(`${contentObjNum} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}endstream\nendobj\n`);
  }
  
  // Build PDF
  const pdfHeader = "%PDF-1.4\n";
  const pdfBody = objects.join("");
  
  // Calculate xref offsets
  let offset = pdfHeader.length;
  const xref: number[] = [0]; // First entry is free object (index 0)
  
  // Add offsets for all objects (starting from object 1)
  for (const obj of objects) {
    xref.push(offset);
    offset += obj.length;
  }
  
  // Build xref table
  let xrefTable = `xref\n0 ${xref.length}\n`;
  xrefTable += "0000000000 65535 f \n"; // Free object
  for (let i = 1; i < xref.length; i++) {
    xrefTable += `${xref[i].toString().padStart(10, "0")} 00000 n \n`;
  }
  
  // Trailer
  const trailer = `trailer\n<< /Size ${xref.length} /Root ${catalogObjNum} 0 R >>\nstartxref\n${offset}\n%%EOF`;
  
  // Combine all parts
  const fullPdf = pdfHeader + pdfBody + xrefTable + trailer;
  
  const pdfBytes = new TextEncoder().encode(fullPdf);
  console.log(`PDF created: ${pdfBytes.length} bytes, ${pages.length} pages, ${objects.length} objects`);
  
  return pdfBytes;
}

export default generateSummaryPdf;
