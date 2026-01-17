// Safety and Compliance Layer
// Enforces healthcare compliance in all generated content

/**
 * Patterns that indicate diagnosis language (FORBIDDEN)
 */
const DIAGNOSIS_PATTERNS = [
  /\byou have\b/gi,
  /\byou('re| are) (likely|probably|possibly)\b/gi,
  /\bdiagnosis\b/gi,
  /\bdiagnosed with\b/gi,
  /\bsuffering from\b/gi,
  /\bcondition is\b/gi,
  /\byour (condition|illness|disease)\b/gi,
  // Common diseases - should not appear as diagnoses
  /\b(diabetes|hypertension|cancer|arthritis|asthma|copd|pneumonia|bronchitis)\b/gi,
  /\b(infection|syndrome|disorder|disease)\s+(?:is|appears|seems)/gi,
];

/**
 * Patterns that indicate treatment advice (FORBIDDEN)
 */
const TREATMENT_PATTERNS = [
  /\btake\s+\d+\s*(mg|ml|pills?|tablets?|capsules?)/gi,
  /\bprescribed?\b/gi,
  /\bdosage\b/gi,
  /\bmedication\b.*\bshould\b/gi,
  /\byou should (take|start|stop|continue)\b/gi,
  /\btreatment (plan|recommendation|protocol)\b/gi,
  /\bI('m| am) prescribing\b/gi,
  // Medication names (common examples)
  /\b(aspirin|ibuprofen|acetaminophen|metformin|lisinopril|atorvastatin)\s+\d+/gi,
];

/**
 * Safety flags for compliance checking
 */
export const SAFETY_FLAGS = {
  NO_DIAGNOSIS: "no_diagnosis",
  NO_TREATMENT: "no_treatment",
  DRAFT_LABEL: "draft_label",
  DISCLAIMER: "disclaimer",
} as const;

/**
 * Result of compliance check
 */
export interface ComplianceResult {
  isCompliant: boolean;
  violations: string[];
  sanitizedText?: string;
}

/**
 * Check text for compliance violations
 */
export function checkCompliance(text: string): ComplianceResult {
  const violations: string[] = [];

  // Check for diagnosis language
  for (const pattern of DIAGNOSIS_PATTERNS) {
    if (pattern.test(text)) {
      violations.push(`Contains diagnosis language: ${pattern.source}`);
      pattern.lastIndex = 0; // Reset regex state
    }
  }

  // Check for treatment advice
  for (const pattern of TREATMENT_PATTERNS) {
    if (pattern.test(text)) {
      violations.push(`Contains treatment advice: ${pattern.source}`);
      pattern.lastIndex = 0;
    }
  }

  return {
    isCompliant: violations.length === 0,
    violations,
  };
}

/**
 * Sanitize output by removing non-compliant language
 * Returns cleaned text
 */
export function sanitizeOutput(text: string): string {
  let sanitized = text;

  // Replace diagnosis language
  sanitized = sanitized.replace(/\byou have\b/gi, "you reported");
  sanitized = sanitized.replace(/\bdiagnosis\b/gi, "assessment");
  sanitized = sanitized.replace(/\bdiagnosed with\b/gi, "noted symptoms of");
  sanitized = sanitized.replace(/\bsuffering from\b/gi, "experiencing");

  // Replace treatment language
  sanitized = sanitized.replace(
    /\byou should (take|start)\b/gi,
    "discuss with your provider about"
  );
  sanitized = sanitized.replace(
    /\bI('m| am) prescribing\b/gi,
    "your provider may discuss"
  );

  return sanitized;
}

/**
 * Assert text is compliant, throws if not
 */
export function assertCompliant(text: string): void {
  const result = checkCompliance(text);
  if (!result.isCompliant) {
    throw new Error(
      `Compliance violation detected: ${result.violations.join("; ")}`
    );
  }
}

/**
 * Add DRAFT label to clinician-facing content
 */
export function addDraftLabel(text: string): string {
  return `**DRAFT - FOR REVIEW ONLY**\n\n${text}\n\n---\n*This is a draft document and requires clinician review before finalization.*`;
}

/**
 * Add disclaimer to patient-facing content
 */
export function addPatientDisclaimer(text: string): string {
  return `${text}\n\n---\n**Important:** This summary is for informational purposes only and does not constitute medical advice. Please consult with your healthcare provider for medical decisions.`;
}

/**
 * Safe wrapper for LLM output
 * Sanitizes and adds appropriate labels
 */
export function safeOutput(
  text: string,
  options: {
    isPatientFacing?: boolean;
    isDraft?: boolean;
  } = {}
): string {
  let output = sanitizeOutput(text);

  if (options.isDraft) {
    output = addDraftLabel(output);
  }

  if (options.isPatientFacing) {
    output = addPatientDisclaimer(output);
  }

  return output;
}
