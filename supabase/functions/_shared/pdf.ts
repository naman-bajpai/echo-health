// PDF Generation
// Creates comprehensive patient summary PDFs

import type { PatientSummary, ExtractedFields, DraftNote } from "./types.ts";

interface PdfOptions {
  summary: PatientSummary;
  fields?: ExtractedFields | null;
  draftNote?: DraftNote | null;
  patientName?: string;
  encounterDate?: string;
  encounterId?: string;
}

/**
 * Generate a comprehensive PDF from encounter data
 */
export function generateSummaryPdf(options: PdfOptions): Uint8Array {
  const { summary, fields, patientName, encounterDate, encounterId } = options;
  const content = buildPdfContent(summary, fields, patientName, encounterDate, encounterId);
  return createSimplePdf(content);
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
 * Build PDF content string
 */
function buildPdfContent(
  summary: PatientSummary,
  fields?: ExtractedFields | null,
  patientName?: string,
  encounterDate?: string,
  encounterId?: string
): string {
  const lines: string[] = [];
  const divider = "================================================";
  const subDivider = "------------------------------------------------";

  // Header
  lines.push("");
  lines.push("                    ECHO HEALTH");
  lines.push("                  VISIT SUMMARY");
  lines.push("");
  lines.push(divider);
  lines.push("");

  // Patient Info
  lines.push("PATIENT INFORMATION");
  lines.push(subDivider);
  lines.push(`Name: ${patientName || "Not provided"}`);
  if (fields?.dob) lines.push(`Date of Birth: ${fields.dob}`);
  lines.push(`Visit Date: ${encounterDate || new Date().toLocaleDateString()}`);
  if (encounterId) lines.push(`Reference: ${encounterId.slice(0, 8)}`);
  lines.push("");

  // Reason for Visit
  if (fields?.reason_for_visit || summary.what_happened_today) {
    lines.push("REASON FOR VISIT");
    lines.push(subDivider);
    lines.push(fields?.reason_for_visit || "General consultation");
    lines.push("");
  }

  // What You Told Us
  lines.push("WHAT YOU TOLD US");
  lines.push(subDivider);
  for (const item of summary.what_you_told_us) {
    lines.push(`  * ${wrapText(item, 50)}`);
  }
  lines.push("");

  // Symptoms (if available)
  if (fields?.symptoms && fields.symptoms.length > 0) {
    lines.push("REPORTED SYMPTOMS");
    lines.push(subDivider);
    for (let i = 0; i < fields.symptoms.length; i++) {
      lines.push(`  ${i + 1}. ${wrapText(fields.symptoms[i], 48)}`);
    }
    lines.push("");
  }

  // What Happened Today
  lines.push("WHAT HAPPENED TODAY");
  lines.push(subDivider);
  lines.push(wrapText(summary.what_happened_today, 55));
  lines.push("");

  // Referrals
  if (summary.referrals.length > 0) {
    lines.push("REFERRALS");
    lines.push(subDivider);
    for (const referral of summary.referrals) {
      lines.push(`  Specialty: ${referral.specialty}`);
      if (referral.provider) lines.push(`  Provider: ${referral.provider}`);
      lines.push(`  Reason: ${referral.reason}`);
      lines.push("");
    }
  }

  // Next Steps
  lines.push("NEXT STEPS");
  lines.push(subDivider);
  for (let i = 0; i < summary.next_steps.length; i++) {
    lines.push(`  ${i + 1}. ${wrapText(summary.next_steps[i], 48)}`);
  }
  lines.push("");

  // Follow-up
  if (summary.follow_up) {
    lines.push("FOLLOW-UP");
    lines.push(subDivider);
    lines.push(wrapText(summary.follow_up, 55));
    lines.push("");
  }

  // Allergies & Medications
  if ((fields?.allergies && fields.allergies.length > 0) || 
      (fields?.medications && fields.medications.length > 0)) {
    lines.push("MEDICAL INFORMATION ON FILE");
    lines.push(subDivider);
    
    if (fields?.allergies && fields.allergies.length > 0) {
      lines.push("  Allergies: " + fields.allergies.join(", "));
    }
    if (fields?.medications && fields.medications.length > 0) {
      lines.push("  Current Medications: " + fields.medications.join(", "));
    }
    lines.push("");
  }

  // Footer / Disclaimer
  lines.push(divider);
  lines.push("");
  lines.push("                    IMPORTANT NOTICE");
  lines.push("");
  lines.push("This summary is for informational purposes only and");
  lines.push("does not constitute medical advice. Please consult");
  lines.push("with your healthcare provider for medical decisions.");
  lines.push("");
  lines.push(divider);
  lines.push("");
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push("Echo Health - Nexhacks 2026");

  return lines.join("\n");
}

/**
 * Wrap text to fit within specified width
 */
function wrapText(text: string, maxWidth: number): string {
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
 * Create a simple PDF
 */
function createSimplePdf(content: string): Uint8Array {
  // PDF header
  const header = "%PDF-1.4\n";

  // Objects
  const objects: string[] = [];

  // Catalog (object 1)
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  // Pages (object 2)
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  // Page (object 3) - Letter size
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
  );

  // Content stream (object 4)
  const contentStream = buildContentStream(content);
  objects.push(
    `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`
  );

  // Font (object 5) - Courier for monospace
  objects.push(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n"
  );

  // Build xref table
  let offset = header.length;
  const xref: number[] = [];
  for (const obj of objects) {
    xref.push(offset);
    offset += obj.length;
  }

  // Cross-reference table
  let xrefTable = `xref\n0 ${objects.length + 1}\n`;
  xrefTable += "0000000000 65535 f \n";
  for (const pos of xref) {
    xrefTable += `${pos.toString().padStart(10, "0")} 00000 n \n`;
  }

  // Trailer
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`;

  // Combine all parts
  const pdfContent = header + objects.join("") + xrefTable + trailer;

  return new TextEncoder().encode(pdfContent);
}

/**
 * Build PDF content stream
 */
function buildContentStream(text: string): string {
  const lines = text.split("\n");
  let stream = "BT\n/F1 9 Tf\n"; // Slightly smaller font

  let y = 760; // Start near top of page
  const lineHeight = 11;
  const leftMargin = 50;

  for (const line of lines) {
    if (y < 40) break; // Don't go below page margin

    // Escape special PDF characters
    const escaped = line
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");

    stream += `1 0 0 1 ${leftMargin} ${y} Tm\n`;
    stream += `(${escaped}) Tj\n`;
    y -= lineHeight;
  }

  stream += "ET\n";
  return stream;
}

export default generateSummaryPdf;
