// Verify with Claude Edge Function
// Double-verifies AI-generated data using Claude API for accuracy

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { callClaude, parseJSON, isConfigured as isClaudeConfigured } from "../_shared/claude.ts";

interface VerifyRequest {
  encounterId: string;
}

interface VerificationResult {
  verified: boolean;
  confidence: "high" | "medium" | "low";
  corrections: Array<{
    field: string;
    original: string;
    corrected: string;
    reason: string;
  }>;
  warnings: string[];
  suggestions: string[];
  summary: string;
  verificationTimestamp: string;
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: VerifyRequest = await req.json();
    const { encounterId } = body;

    if (!encounterId) {
      return errorResponse("encounterId is required");
    }

    if (!isClaudeConfigured()) {
      return errorResponse("Claude API is not configured. Please set ANTHROPIC_API_KEY.");
    }

    console.log(`Verifying encounter with Claude: ${encounterId}`);

    // Get encounter details
    const { data: encounter, error: encounterError } = await supabaseAdmin
      .from("encounters")
      .select("*")
      .eq("id", encounterId)
      .single();

    if (encounterError || !encounter) {
      console.error("Encounter not found:", encounterError);
      return errorResponse("Encounter not found", 404);
    }

    // Get transcript
    const { data: chunks } = await supabaseAdmin
      .from("transcript_chunks")
      .select("speaker, text, created_at")
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: true });

    if (!chunks || chunks.length === 0) {
      return errorResponse("No transcript found for verification");
    }

    // Get all artifacts (AI-generated data)
    const { data: artifacts } = await supabaseAdmin
      .from("artifacts")
      .select("type, content")
      .eq("encounter_id", encounterId);

    // Build transcript text
    const transcriptText = chunks
      .map((c) => `[${c.speaker.toUpperCase()}]: ${c.text}`)
      .join("\n");

    // Collect all AI-generated content to verify
    const fieldsArtifact = artifacts?.find((a) => a.type === "fields");
    const analysisArtifact = artifacts?.find((a) => a.type === "analysis");
    const diagnosisArtifact = artifacts?.find((a) => a.type === "diagnosis");
    const summaryArtifact = artifacts?.find((a) => a.type === "summary");
    const draftNoteArtifact = artifacts?.find((a) => a.type === "draft_note");

    const aiGeneratedData = {
      fields: fieldsArtifact?.content || null,
      analysis: analysisArtifact?.content || null,
      diagnosis: diagnosisArtifact?.content || null,
      summary: summaryArtifact?.content || null,
      draftNote: draftNoteArtifact?.content || null,
    };

    console.log("AI-generated data to verify:", Object.keys(aiGeneratedData).filter(k => aiGeneratedData[k as keyof typeof aiGeneratedData]));

    // Claude verification prompt
    const verificationPrompt = `You are a senior medical documentation reviewer. Your task is to VERIFY the accuracy of AI-generated clinical data by comparing it against the original transcript.

## ORIGINAL TRANSCRIPT:
${transcriptText}

## AI-GENERATED DATA TO VERIFY:

### Extracted Fields:
${JSON.stringify(fieldsArtifact?.content || {}, null, 2)}

### Analysis:
${JSON.stringify(analysisArtifact?.content || {}, null, 2)}

### Diagnosis:
${JSON.stringify(diagnosisArtifact?.content || {}, null, 2)}

### Summary:
${JSON.stringify(summaryArtifact?.content || {}, null, 2)}

### Draft Note:
${JSON.stringify(draftNoteArtifact?.content || {}, null, 2)}

---

## YOUR TASK:
1. Compare each piece of AI-generated data against the transcript
2. Identify ANY inaccuracies, hallucinations, or missing information
3. Note any data that was ADDED by AI but NOT mentioned in the transcript
4. Check for medical accuracy and proper terminology
5. Verify urgency levels are appropriate based on symptoms
6. Check that ICD-10 and CPT codes (if present) match the documented conditions

## VERIFICATION CRITERIA:
- Patient demographics must match what's stated in transcript
- Symptoms must be explicitly mentioned (not inferred)
- Medications must be correctly spelled and dosed
- Allergies must be accurately captured
- Vital signs must match any numbers mentioned
- Urgency assessment should align with red flags
- Diagnoses should be supported by documented findings

Respond with JSON only:
{
  "verified": true/false (true if data is accurate with minor issues, false if significant problems found),
  "confidence": "high" | "medium" | "low",
  "corrections": [
    {
      "field": "field name (e.g., 'chief_complaint', 'urgency.level')",
      "original": "what AI generated",
      "corrected": "what it should be based on transcript",
      "reason": "why this correction is needed"
    }
  ],
  "warnings": [
    "List of potential issues or things that couldn't be verified"
  ],
  "suggestions": [
    "Recommendations for improving documentation quality"
  ],
  "summary": "Brief 2-3 sentence summary of verification results"
}`;

    console.log("Calling Claude for verification...");
    const response = await callClaude(verificationPrompt, { 
      maxTokens: 3000,
      temperature: 0.2, // Lower temperature for more precise verification
      system: "You are a meticulous medical documentation auditor. Be precise, thorough, and flag any discrepancies between AI-generated data and the source transcript. Patient safety is paramount."
    });

    const verificationResult = parseJSON<Omit<VerificationResult, 'verificationTimestamp'>>(response);

    if (!verificationResult) {
      console.error("Failed to parse Claude verification response");
      return errorResponse("Failed to parse verification results");
    }

    const result: VerificationResult = {
      ...verificationResult,
      verificationTimestamp: new Date().toISOString(),
    };

    console.log(`Verification complete. Verified: ${result.verified}, Corrections: ${result.corrections.length}`);

    // Save verification result as artifact
    await supabaseAdmin.from("artifacts").upsert({
      encounter_id: encounterId,
      type: "verification",
      content: result,
    }, { onConflict: 'encounter_id,type' });

    // If there are corrections, apply them to the fields artifact
    if (result.corrections.length > 0 && fieldsArtifact?.content) {
      const updatedFields = { ...fieldsArtifact.content };
      let fieldsUpdated = false;

      for (const correction of result.corrections) {
        // Handle nested fields (e.g., "urgency.level")
        const fieldPath = correction.field.split('.');
        if (fieldPath.length === 1 && fieldPath[0] in updatedFields) {
          (updatedFields as any)[fieldPath[0]] = correction.corrected;
          fieldsUpdated = true;
        } else if (fieldPath.length === 2) {
          const [parent, child] = fieldPath;
          if (parent in updatedFields && typeof (updatedFields as any)[parent] === 'object') {
            (updatedFields as any)[parent][child] = correction.corrected;
            fieldsUpdated = true;
          }
        }
      }

      if (fieldsUpdated) {
        await supabaseAdmin.from("artifacts").upsert({
          encounter_id: encounterId,
          type: "fields",
          content: updatedFields,
        }, { onConflict: 'encounter_id,type' });
        console.log("Applied corrections to fields artifact");
      }
    }

    return jsonResponse({
      success: true,
      verification: result,
      encounterId,
      correctionsApplied: result.corrections.length > 0,
    });

  } catch (error) {
    console.error("Verification error:", error);
    return errorResponse(`Verification failed: ${error}`, 500);
  }
});
