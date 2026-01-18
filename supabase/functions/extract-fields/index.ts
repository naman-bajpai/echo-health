// Extract Fields Edge Function
// Uses Claude for intelligent field extraction
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { callClaudeJSON, isConfigured as isClaudeConfigured } from "../_shared/claude.ts";

interface ExtractFieldsRequest {
  encounterId: string;
}

interface ExtractedFields {
  patient_name?: string;
  dob?: string;
  chief_complaint?: string;
  reason_for_visit?: string;
  symptoms?: string[];
  symptom_duration?: string;
  symptom_severity?: string;
  medications?: string[];
  allergies?: string[];
  medical_history?: string[];
  vital_signs?: Record<string, string>;
  urgency_indicators?: string[];
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: ExtractFieldsRequest = await req.json();
    const { encounterId } = body;

    if (!encounterId) {
      return errorResponse("encounterId is required");
    }

    // Debug: Check if Claude is configured
    const claudeConfigured = isClaudeConfigured();
    console.log(`Claude API configured: ${claudeConfigured}`);

    // Get transcript
    const { data: chunks, error: chunksError } = await supabaseAdmin
      .from("transcript_chunks")
      .select("speaker, text")
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: true });

    if (chunksError) {
      console.error("Transcript fetch error:", chunksError);
      return errorResponse("Failed to fetch transcript");
    }

    if (!chunks || chunks.length === 0) {
      return errorResponse("No transcript found for this encounter");
    }

    console.log(`Found ${chunks.length} transcript chunks`);

    const transcriptText = chunks
      .map((c) => `${c.speaker.toUpperCase()}: ${c.text}`)
      .join("\n");

    console.log("Transcript preview:", transcriptText.substring(0, 300));

    let fields: ExtractedFields = {
      symptoms: [],
      medications: [],
      allergies: [],
      medical_history: [],
    };

    let aiUsed = false;

    if (claudeConfigured) {
      console.log("Calling Claude API for field extraction...");

      const prompt = `You are a medical documentation assistant. Extract structured information from this patient encounter transcript.

TRANSCRIPT:
${transcriptText}

Extract the following fields. Only include information EXPLICITLY mentioned in the transcript - do not infer or assume anything not directly stated.

Respond with JSON only:
{
  "patient_name": "patient's name if mentioned, or null",
  "dob": "date of birth if mentioned, or null",
  "chief_complaint": "the main reason the patient came in",
  "reason_for_visit": "detailed reason for visit",
  "symptoms": ["list every symptom the patient mentioned - be specific and comprehensive"],
  "symptom_duration": "how long the patient said symptoms have lasted",
  "symptom_severity": "severity description if mentioned (mild, moderate, severe, or specific descriptions)",
  "medications": ["all current medications the patient mentioned taking"],
  "allergies": ["all allergies mentioned"],
  "medical_history": ["relevant medical history mentioned"],
  "vital_signs": {
    "blood_pressure": "value if mentioned",
    "heart_rate": "value if mentioned",
    "temperature": "value if mentioned",
    "weight": "value if mentioned"
  },
  "urgency_indicators": ["any symptoms that might need urgent attention like chest pain, difficulty breathing, etc."]
}`;

      const result = await callClaudeJSON<ExtractedFields>(prompt);

      if (result) {
        console.log("Claude extraction successful");
        fields = { ...fields, ...result };
        aiUsed = true;
      } else {
        console.log("Claude returned no result, using fallback");
      }
    } else {
      console.log("Claude not configured, using fallback extraction");
    }

    // Fallback: basic pattern extraction
    if (!aiUsed) {
      const fullText = chunks.map((c) => c.text).join(" ").toLowerCase();
      const patientText = chunks
        .filter((c) => c.speaker === "patient")
        .map((c) => c.text)
        .join(" ")
        .toLowerCase();

      // Extract symptoms
      const symptomKeywords = [
        "pain", "ache", "headache", "nausea", "fever", "cough",
        "tired", "fatigue", "dizzy", "dizziness", "swelling", "rash",
        "shortness of breath", "chest pain", "stomach ache", "sore throat",
        "runny nose", "congestion", "vomiting", "diarrhea"
      ];

      symptomKeywords.forEach((kw) => {
        if (patientText.includes(kw) && !fields.symptoms?.includes(kw)) {
          fields.symptoms?.push(kw);
        }
      });

      // Extract duration patterns
      const durationMatch = patientText.match(/(\d+)\s*(days?|weeks?|months?|hours?)\s*(ago)?/i);
      if (durationMatch) {
        fields.symptom_duration = durationMatch[0];
      }

      // Extract medications
      const medPatterns = /(?:taking|on|medication[s]?|medicine)\s+(\w+)/gi;
      let medMatch;
      while ((medMatch = medPatterns.exec(fullText)) !== null) {
        const med = medMatch[1];
        if (med.length > 2 && !fields.medications?.includes(med)) {
          fields.medications?.push(med);
        }
      }

      // Extract allergies
      const allergyPatterns = /allergic\s+to\s+(\w+)/gi;
      let allergyMatch;
      while ((allergyMatch = allergyPatterns.exec(fullText)) !== null) {
        const allergy = allergyMatch[1];
        if (!fields.allergies?.includes(allergy)) {
          fields.allergies?.push(allergy);
        }
      }

      // Extract chief complaint from first patient statement
      const firstPatientChunk = chunks.find(c => c.speaker === "patient");
      if (firstPatientChunk) {
        fields.chief_complaint = firstPatientChunk.text.substring(0, 100);
      }
    }

    // Save as artifact
    const { error: artifactError } = await supabaseAdmin.from("artifacts").insert({
      encounter_id: encounterId,
      type: "fields",
      content: fields,
    });

    if (artifactError) {
      console.error("Artifact save error:", artifactError);
    }

    return jsonResponse({
      fields,
      encounterId,
      debug: {
        claudeConfigured,
        aiUsed,
        transcriptChunks: chunks.length,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse(`Internal server error: ${error}`, 500);
  }
});
