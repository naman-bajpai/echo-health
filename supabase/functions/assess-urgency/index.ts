// Assess Urgency Edge Function
// AI analyzes transcript to determine urgency and specialist needs

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { completeJson, isConfigured as isClaudeConfigured } from "../_shared/claude.ts";

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

const URGENCY_PROMPT = `You are a medical triage assistant. Analyze the following patient encounter transcript and determine:

1. URGENCY LEVEL:
   - "routine": Standard care, can wait for regular appointment
   - "urgent": Needs attention within 24-48 hours
   - "emergent": Requires immediate attention (ER-level)

2. SPECIALIST NEEDED: Whether a specialist referral is recommended

3. RECOMMENDED SPECIALIST: If specialist is needed, which type (e.g., Cardiologist, Neurologist, Orthopedic, etc.)

4. RED FLAGS: Any concerning symptoms or findings

IMPORTANT:
- Be conservative - when in doubt, escalate urgency
- Look for red flag symptoms (chest pain, difficulty breathing, sudden severe headache, etc.)
- Consider patient history and medications
- This is for triage guidance only, not diagnosis

Respond in JSON format:
{
  "level": "routine" | "urgent" | "emergent",
  "reason": "Brief explanation of urgency level",
  "specialist_needed": true/false,
  "recommended_specialist": "Specialty type or null",
  "red_flags": ["list", "of", "concerning", "findings"]
}`;

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: AssessUrgencyRequest = await req.json();
    const { encounterId } = body;

    if (!encounterId) {
      return errorResponse("encounterId is required");
    }

    // Verify encounter exists
    const { data: encounter, error: encounterError } = await supabaseAdmin
      .from("encounters")
      .select("*")
      .eq("id", encounterId)
      .single();

    if (encounterError || !encounter) {
      return errorResponse("Encounter not found", 404);
    }

    // Get transcript
    const { data: transcriptChunks } = await supabaseAdmin
      .from("transcript_chunks")
      .select("speaker, text")
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: true });

    if (!transcriptChunks || transcriptChunks.length === 0) {
      return errorResponse("No transcript found for this encounter");
    }

    const transcriptText = transcriptChunks
      .map(c => `${c.speaker.toUpperCase()}: ${c.text}`)
      .join("\n");

    // Get any extracted fields for additional context
    const { data: fieldsArtifact } = await supabaseAdmin
      .from("artifacts")
      .select("content")
      .eq("encounter_id", encounterId)
      .eq("type", "fields")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let contextInfo = "";
    if (fieldsArtifact?.content) {
      const fields = fieldsArtifact.content as Record<string, unknown>;
      if (fields.symptoms) contextInfo += `\nSymptoms: ${(fields.symptoms as string[]).join(", ")}`;
      if (fields.medications) contextInfo += `\nMedications: ${(fields.medications as string[]).join(", ")}`;
      if (fields.allergies) contextInfo += `\nAllergies: ${(fields.allergies as string[]).join(", ")}`;
      if (fields.medical_history) contextInfo += `\nMedical History: ${(fields.medical_history as string[]).join(", ")}`;
    }

    // Default assessment if AI not configured
    let assessment: UrgencyAssessment = {
      level: "routine",
      reason: "Unable to assess - AI not configured",
      specialist_needed: false,
      red_flags: [],
    };

    if (isClaudeConfigured()) {
      const prompt = `${URGENCY_PROMPT}

PATIENT INFO:
- Visit Number: ${encounter.visit_number}
- Reason for Visit: ${encounter.reason_for_visit || "Not specified"}
${contextInfo}

TRANSCRIPT:
${transcriptText}

Respond with JSON only.`;

      const result = await completeJson<UrgencyAssessment>(prompt);
      if (result) {
        assessment = result;
      }
    } else {
      // Basic rule-based assessment as fallback
      const lowerTranscript = transcriptText.toLowerCase();
      
      const emergentKeywords = [
        "chest pain", "can't breathe", "difficulty breathing", "severe headache",
        "worst headache", "sudden weakness", "numbness", "slurred speech",
        "loss of consciousness", "fainting", "unconscious", "bleeding heavily",
        "severe allergic", "anaphylaxis", "suicidal", "overdose"
      ];
      
      const urgentKeywords = [
        "high fever", "fever over 103", "vomiting blood", "blood in stool",
        "severe pain", "persistent vomiting", "dehydration", "infection",
        "swelling", "can't walk", "broken", "fracture"
      ];
      
      const specialistIndicators: Record<string, string> = {
        "heart": "Cardiologist",
        "chest": "Cardiologist",
        "headache": "Neurologist",
        "dizziness": "Neurologist",
        "joint": "Orthopedic",
        "bone": "Orthopedic",
        "skin": "Dermatologist",
        "rash": "Dermatologist",
        "stomach": "Gastroenterologist",
        "digestive": "Gastroenterologist",
        "breathing": "Pulmonologist",
        "lung": "Pulmonologist",
        "mental": "Psychiatrist",
        "anxiety": "Psychiatrist",
        "depression": "Psychiatrist",
      };

      // Check for emergent keywords
      const foundEmergent = emergentKeywords.filter(kw => lowerTranscript.includes(kw));
      if (foundEmergent.length > 0) {
        assessment.level = "emergent";
        assessment.reason = "Potential emergency symptoms detected";
        assessment.red_flags = foundEmergent;
      } else {
        // Check for urgent keywords
        const foundUrgent = urgentKeywords.filter(kw => lowerTranscript.includes(kw));
        if (foundUrgent.length > 0) {
          assessment.level = "urgent";
          assessment.reason = "Symptoms requiring prompt attention";
          assessment.red_flags = foundUrgent;
        }
      }

      // Check for specialist needs
      for (const [keyword, specialist] of Object.entries(specialistIndicators)) {
        if (lowerTranscript.includes(keyword)) {
          assessment.specialist_needed = true;
          assessment.recommended_specialist = specialist;
          break;
        }
      }
    }

    // Update encounter with assessment
    await supabaseAdmin
      .from("encounters")
      .update({
        urgency: assessment.level,
        urgency_reason: assessment.reason,
        specialist_needed: assessment.specialist_needed,
        recommended_specialist: assessment.recommended_specialist,
      })
      .eq("id", encounterId);

    // Store assessment as artifact
    await supabaseAdmin
      .from("artifacts")
      .insert({
        encounter_id: encounterId,
        type: "urgency_assessment",
        content: assessment,
      });

    return jsonResponse({
      assessment,
      encounterId,
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Internal server error", 500);
  }
});
