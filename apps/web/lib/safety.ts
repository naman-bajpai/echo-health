// UI-level Safety Helpers
// Compliance helpers for frontend

/**
 * Check if text contains potentially sensitive medical content
 */
export function containsSensitiveContent(text: string): boolean {
  const sensitivePatterns = [
    /\bdiagnosis\b/i,
    /\bprescribed?\b/i,
    /\bdosage\b/i,
    /\bmedication\b/i,
    /\btreatment plan\b/i,
  ];

  return sensitivePatterns.some((pattern) => pattern.test(text));
}

/**
 * Disclaimer text for patient-facing content
 */
export const PATIENT_DISCLAIMER =
  "This summary is for informational purposes only and does not constitute medical advice. Please consult with your healthcare provider for medical decisions.";

/**
 * Draft warning for clinician-facing content
 */
export const DRAFT_WARNING =
  "DRAFT - FOR REVIEW ONLY. This document requires clinician review before finalization.";

/**
 * Safety banner messages
 */
export const SAFETY_MESSAGES = {
  intake: "Patient information is being collected. All data is stored securely.",
  visit: "Encounter in progress. All generated content requires clinician review.",
  checkout: "Visit complete. Patient summary is available for review.",
} as const;

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format time for display
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Speaker display names
 */
export const SPEAKER_NAMES = {
  patient: "Patient",
  clinician: "Clinician",
  staff: "Staff",
} as const;

/**
 * Status display names
 */
export const STATUS_NAMES = {
  intake: "Intake",
  visit: "Visit",
  checkout: "Checkout",
} as const;

/**
 * Status colors for UI
 */
export const STATUS_COLORS = {
  intake: "bg-yellow-100 text-yellow-800",
  visit: "bg-blue-100 text-blue-800",
  checkout: "bg-green-100 text-green-800",
} as const;
