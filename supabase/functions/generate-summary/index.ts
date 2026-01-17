// Generate Summary Edge Function
// Creates patient-facing visit summary

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { completeJson, isConfigured } from "../_shared/openai.ts";
import { SYSTEM_PROMPT, PATIENT_SUMMARY_PROMPT, getPrompt } from "../_shared/prompts.ts";
import { sanitizeOutput, addPatientDisclaimer, checkCompliance } from "../_shared/safety.ts";
import type { GenerateSummaryRequest, PatientSummary, ExtractedFields } from "../_shared/types.ts";

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: GenerateSummaryRequest = await req.json();
    const { encounterId } = body;

    if (!encounterId) {
      return errorResponse("encounterId is required");
    }

    // Fetch transcript chunks
    const { data: chunks, error: transcriptError } = await supabaseAdmin
      .from("transcript_chunks")
      .select("*")
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: true });

    if (transcriptError) {
      console.error("Transcript error:", transcriptError);
      return errorResponse("Failed to fetch transcript", 500);
    }

    // Fetch existing fields artifact
    const { data: fieldsArtifact } = await supabaseAdmin
      .from("artifacts")
      .select("content")
      .eq("encounter_id", encounterId)
      .eq("type", "fields")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Fetch referral artifacts
    const { data: referralArtifacts } = await supabaseAdmin
      .from("artifacts")
      .select("content")
      .eq("encounter_id", encounterId)
      .eq("type", "referral");

    // Build transcript text
    const transcript = (chunks || [])
      .map((c) => `[${c.speaker.toUpperCase()}]: ${c.text}`)
      .join("\n");

    const fields: ExtractedFields = (fieldsArtifact?.content as ExtractedFields) || { symptoms: [] };
    const fieldsJson = JSON.stringify(fields, null, 2);

    let summary: PatientSummary;

    if (isConfigured() && transcript) {
      // Use LLM to generate summary
      const prompt = getPrompt(PATIENT_SUMMARY_PROMPT, {
        transcript,
        fields: fieldsJson,
      });
      summary = await completeJson<PatientSummary>(SYSTEM_PROMPT, prompt);

      // Sanitize all text fields
      summary.what_you_told_us = summary.what_you_told_us.map(sanitizeOutput);
      summary.what_happened_today = sanitizeOutput(summary.what_happened_today);
      summary.next_steps = summary.next_steps.map(sanitizeOutput);
      if (summary.follow_up) {
        summary.follow_up = sanitizeOutput(summary.follow_up);
      }

      // Check compliance
      const fullText = [
        ...summary.what_you_told_us,
        summary.what_happened_today,
        ...summary.next_steps,
        summary.follow_up || "",
      ].join(" ");

      const compliance = checkCompliance(fullText);
      if (!compliance.isCompliant) {
        console.warn("Compliance warnings in summary:", compliance.violations);
      }
    } else {
      // Fallback: basic summary generation
      summary = generateBasicSummary(chunks || [], fields, referralArtifacts || []);
    }

    // Add referrals from artifacts
    if (referralArtifacts && referralArtifacts.length > 0) {
      summary.referrals = referralArtifacts.map((r) => {
        const content = r.content as { provider: { specialty: string; name: string }; referral: { reason: string } };
        return {
          specialty: content.provider.specialty,
          provider: content.provider.name,
          reason: content.referral.reason,
        };
      });
    }

    // Store as artifact
    const { data: artifact, error: artifactError } = await supabaseAdmin
      .from("artifacts")
      .insert({
        encounter_id: encounterId,
        type: "summary",
        content: {
          ...summary,
          generated_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (artifactError) {
      console.error("Artifact error:", artifactError);
      return errorResponse("Failed to save summary", 500);
    }

    // Update encounter status to checkout
    await supabaseAdmin
      .from("encounters")
      .update({ status: "checkout" })
      .eq("id", encounterId);

    return jsonResponse({
      artifactId: artifact.id,
      summary,
      formatted: addPatientDisclaimer(formatSummary(summary)),
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Internal server error", 500);
  }
});

/**
 * Generate basic summary without LLM
 */
function generateBasicSummary(
  chunks: Array<{ speaker: string; text: string }>,
  fields: ExtractedFields,
  _referralArtifacts: Array<{ content: unknown }>
): PatientSummary {
  const patientStatements = chunks
    .filter((c) => c.speaker === "patient")
    .map((c) => c.text)
    .slice(0, 5);

  return {
    what_you_told_us: patientStatements.length > 0
      ? patientStatements
      : ["Your concerns were discussed during the visit."],
    what_happened_today: fields.reason_for_visit
      ? `You visited for: ${fields.reason_for_visit}. Your concerns were reviewed and discussed.`
      : "Your healthcare provider reviewed your concerns during this visit.",
    referrals: [],
    next_steps: [
      "Follow up as recommended by your healthcare provider",
      "Contact us if you have any questions",
    ],
  };
}

/**
 * Format summary for display
 */
function formatSummary(summary: PatientSummary): string {
  let text = "## Your Visit Summary\n\n";

  text += "### What You Told Us\n";
  for (const item of summary.what_you_told_us) {
    text += `- ${item}\n`;
  }
  text += "\n";

  text += "### What Happened Today\n";
  text += `${summary.what_happened_today}\n\n`;

  if (summary.referrals.length > 0) {
    text += "### Referrals\n";
    for (const referral of summary.referrals) {
      text += `- **${referral.specialty}**`;
      if (referral.provider) text += ` (${referral.provider})`;
      text += `: ${referral.reason}\n`;
    }
    text += "\n";
  }

  text += "### Next Steps\n";
  for (const step of summary.next_steps) {
    text += `- ${step}\n`;
  }

  if (summary.follow_up) {
    text += `\n### Follow-up\n${summary.follow_up}\n`;
  }

  return text;
}
