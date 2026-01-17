// PDF Generation
// Creates patient summary PDFs

import type { PatientSummary } from "./types.ts";

/**
 * Generate a simple PDF from patient summary
 * Uses a text-based approach for hackathon simplicity
 * 
 * For production, consider using pdf-lib or similar
 */
export function generateSummaryPdf(
  summary: PatientSummary,
  patientName?: string,
  encounterDate?: string
): Uint8Array {
  const content = buildPdfContent(summary, patientName, encounterDate);
  return createSimplePdf(content);
}

/**
 * Build PDF content string
 */
function buildPdfContent(
  summary: PatientSummary,
  patientName?: string,
  encounterDate?: string
): string {
  const lines: string[] = [];

  // Header
  lines.push("ECHO HEALTH");
  lines.push("Visit Summary");
  lines.push("");
  if (patientName) lines.push(`Patient: ${patientName}`);
  if (encounterDate) lines.push(`Date: ${encounterDate}`);
  lines.push("========================================");
  lines.push("");

  // What You Told Us
  lines.push("WHAT YOU TOLD US");
  lines.push("----------------");
  for (const item of summary.what_you_told_us) {
    lines.push(`• ${item}`);
  }
  lines.push("");

  // What Happened Today
  lines.push("WHAT HAPPENED TODAY");
  lines.push("-------------------");
  lines.push(summary.what_happened_today);
  lines.push("");

  // Referrals
  if (summary.referrals.length > 0) {
    lines.push("REFERRALS");
    lines.push("---------");
    for (const referral of summary.referrals) {
      lines.push(`• ${referral.specialty}`);
      if (referral.provider) lines.push(`  Provider: ${referral.provider}`);
      lines.push(`  Reason: ${referral.reason}`);
    }
    lines.push("");
  }

  // Next Steps
  lines.push("NEXT STEPS");
  lines.push("----------");
  for (const step of summary.next_steps) {
    lines.push(`• ${step}`);
  }
  lines.push("");

  // Follow-up
  if (summary.follow_up) {
    lines.push("FOLLOW-UP");
    lines.push("---------");
    lines.push(summary.follow_up);
    lines.push("");
  }

  // Disclaimer
  lines.push("========================================");
  lines.push("");
  lines.push("IMPORTANT: This summary is for informational");
  lines.push("purposes only and does not constitute medical");
  lines.push("advice. Please consult with your healthcare");
  lines.push("provider for medical decisions.");

  return lines.join("\n");
}

/**
 * Create a simple PDF
 * This is a minimal PDF implementation for hackathon
 * For production, use a proper PDF library
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

  // Page (object 3)
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
  );

  // Content stream (object 4)
  const contentStream = buildContentStream(content);
  objects.push(
    `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`
  );

  // Font (object 5)
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
  let stream = "BT\n/F1 10 Tf\n";

  let y = 750; // Start near top of page
  const lineHeight = 12;
  const leftMargin = 50;

  for (const line of lines) {
    if (y < 50) break; // Don't go below page

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
