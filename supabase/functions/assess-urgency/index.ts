// Assess Urgency Edge Function
// Uses Claude for intelligent urgency triage
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { callClaudeJSON, isConfigured as isClaudeConfigured } from "../_shared/claude.ts";

interface AssessUrgencyRequest {
  encounterId: string;
}

interface UrgencyAssessment {
  level: "routine" | "urgent" | "emergent";
  reason: string;
  specialist_needed: boolean;
  recommended_specialist?: string;
  red_flags: string[];
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: AssessUrgencyRequest = await req.json();
    const { encounterId } = body;

    if (!encounterId) {
      return errorResponse("encounterId is required");
    }

    // Get transcript
    const { data: chunks } = await supabaseAdmin
      .from("transcript_chunks")
      .select("speaker, text")
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: true });

    // Get extracted fields if available
    const { data: fieldsArtifact } = await supabaseAdmin
      .from("artifacts")
      .select("content")
      .eq("encounter_id", encounterId)
      .eq("type", "fields")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const transcriptText = chunks
      ?.map((c) => `${c.speaker.toUpperCase()}: ${c.text}`)
      .join("\n") || "";

    const fields = fieldsArtifact?.content || {};

    let assessment: UrgencyAssessment = {
      level: "routine",
      reason: "No urgent symptoms detected",
      specialist_needed: false,
      red_flags: [],
    };

    if (isClaudeConfigured()) {
      const prompt = `You are a medical triage assistant. Analyze this patient encounter for urgency level.

TRANSCRIPT:
${transcriptText}

EXTRACTED SYMPTOMS:
${JSON.stringify(fields, null, 2)}

Assess the urgency level:
- "routine": Standard care, can wait for regular appointment (days to weeks)
- "urgent": Needs attention within 24-48 hours
- "emergent": Requires immediate attention (same day / ER level)

Look for RED FLAGS:
- Chest pain, difficulty breathing, severe headache
- Signs of stroke (sudden weakness, slurred speech)
- Severe allergic reactions
- High fever with other concerning symptoms
- Suicidal ideation or severe mental health crisis

Also determine if a specialist referral might be appropriate.

BE CONSERVATIVE: When in doubt, escalate the urgency level.

Respond with JSON only:
{
  "level": "routine" | "urgent" | "emergent",
  "reason": "Brief explanation of why this urgency level was chosen",
  "specialist_needed": true or false,
  "recommended_specialist": "Type of specialist if needed, or null",
  "red_flags": ["list of concerning symptoms or findings"]
}`;

      const result = await callClaudeJSON<UrgencyAssessment>(prompt);
      if (result) {
        assessment = { ...assessment, ...result };
      }
    } else {
      // Fallback pattern matching
      const fullText = chunks?.map((c) => c.text).join(" ").toLowerCase() || "";

      const emergentKeywords = [
        "chest pain", "can't breathe", "difficulty breathing", "severe headache",
        "worst headache", "sudden weakness", "numbness", "slurred speech",
        "loss of consciousness", "fainting", "bleeding heavily", "suicidal",
      ];

      const urgentKeywords = [
        "high fever", "fever over 103", "severe pain", "persistent vomiting",
        "blood in stool", "infection", "can't walk",
      ];

      const specialistMap: Record<string, string> = {
        heart: "Cardiologist",
        chest: "Cardiologist",
        headache: "Neurologist",
        joint: "Orthopedic Surgeon",
        skin: "Dermatologist",
        stomach: "Gastroenterologist",
        anxiety: "Psychiatrist",
        depression: "Psychiatrist",
      };

      // Check emergent
      for (const kw of emergentKeywords) {
        if (fullText.includes(kw)) {
          assessment.level = "emergent";
          assessment.red_flags.push(kw);
        }
      }

      // Check urgent (if not emergent)
      if (assessment.level !== "emergent") {
        for (const kw of urgentKeywords) {
          if (fullText.includes(kw)) {
            assessment.level = "urgent";
            assessment.red_flags.push(kw);
          }
        }
      }

      // Check specialist
      for (const [keyword, specialist] of Object.entries(specialistMap)) {
        if (fullText.includes(keyword)) {
          assessment.specialist_needed = true;
          assessment.recommended_specialist = specialist;
          break;
        }
      }

      if (assessment.red_flags.length > 0) {
        assessment.reason = `Detected concerning symptoms: ${assessment.red_flags.join(", ")}`;
      }
    }

    // Try to update encounter with urgency (columns may not exist)
    try {
      await supabaseAdmin
        .from("encounters")
        .update({
          urgency: assessment.level,
          urgency_reason: assessment.reason,
          specialist_needed: assessment.specialist_needed,
          recommended_specialist: assessment.recommended_specialist,
        })
        .eq("id", encounterId);
    } catch (e) {
      console.warn("Could not update encounter urgency fields:", e);
    }

    return jsonResponse({
      assessment,
      encounterId,
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Internal server error", 500);
  }
});
