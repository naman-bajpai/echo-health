// Safe prompts for LLM calls
// All prompts enforce compliance with healthcare regulations

/**
 * System prompt for all medical context
 */
export const SYSTEM_PROMPT = `You are an administrative assistant for a healthcare clinic. Your role is to help organize and summarize patient encounter information.

CRITICAL RULES - YOU MUST FOLLOW THESE:
1. NEVER provide medical diagnoses or suggest what condition a patient might have
2. NEVER recommend treatments, medications, or dosages
3. NEVER use phrases like "you have", "diagnosis", "prescribed", or "you should take"
4. ALWAYS use administrative language: "patient reported", "noted", "discussed"
5. ALWAYS label outputs as DRAFT when they require clinician review
6. ONLY include information explicitly stated in the conversation

Your outputs are administrative summaries, NOT medical advice.`;

/**
 * Prompt for extracting fields from transcript
 */
export const EXTRACT_FIELDS_PROMPT = `Extract the following information from this transcript. Only include information that was explicitly stated.

Return a JSON object with these fields:
- patient_name: string or null (only if explicitly stated)
- dob: string or null (only if explicitly stated, format: YYYY-MM-DD)
- reason_for_visit: string or null (patient's stated reason)
- symptoms: array of strings (verbatim patient quotes about what they're experiencing)
- timeline: string or null (when symptoms started, as patient reported)
- allergies: array of strings (only if explicitly mentioned)
- medications: array of strings (only if patient mentions current medications)

Important: 
- Use exact patient quotes for symptoms
- Do NOT interpret or diagnose
- Only include explicitly stated information
- Return null for missing fields

Transcript:
{transcript}`;

/**
 * Prompt for generating draft SOAP note
 */
export const DRAFT_NOTE_PROMPT = `Create a DRAFT SOAP note from this transcript. This is for clinician review only.

Structure:
- Subjective: What the patient reported (verbatim quotes where possible)
- Objective: Observable facts mentioned (NOT interpretations)
- Assessment: "Clinician discussed [topics mentioned]" - NO diagnoses
- Plan: Only explicitly stated referrals, follow-ups, or next steps

CRITICAL RULES:
- Label this as DRAFT at the top
- NO diagnosis language (never say "patient has" or name diseases)
- NO treatment recommendations
- Use "patient reported", "patient stated", "noted"
- Only include what was explicitly discussed

Transcript:
{transcript}`;

/**
 * Prompt for generating patient summary
 */
export const PATIENT_SUMMARY_PROMPT = `Create a patient-friendly summary of this visit. This is an administrative summary for the patient's records.

Structure the output as JSON:
{
  "what_you_told_us": ["array of key points the patient mentioned, using their words"],
  "what_happened_today": "Brief description of the visit (administrative only)",
  "referrals": [{"specialty": "...", "provider": "...", "reason": "..."}],
  "next_steps": ["array of next steps discussed"],
  "follow_up": "any follow-up instructions mentioned"
}

CRITICAL RULES:
- Use patient-friendly language
- NO medical diagnoses or technical terms
- NO treatment advice
- Only include explicitly discussed information
- This is an administrative summary, NOT medical advice

Transcript:
{transcript}

Extracted Fields:
{fields}`;

/**
 * Prompt for safe summarization of any text
 */
export const SAFE_SUMMARIZE_PROMPT = `Summarize the following information in clear, simple language.

Rules:
- Use administrative language only
- Do not include medical diagnoses
- Do not provide treatment advice
- Keep it factual and straightforward

Text to summarize:
{text}`;

/**
 * Get prompt with variables replaced
 */
export function getPrompt(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}
