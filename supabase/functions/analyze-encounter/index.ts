// Analyze Encounter Edge Function
// Comprehensive AI analysis of the entire encounter
// Extracts fields, assesses urgency, recommends specialists - all in one call
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { callClaude, parseJSON, isConfigured as isClaudeConfigured } from "../_shared/claude.ts";

interface AnalyzeRequest {
  encounterId: string;
}

interface AnalysisResult {
  // Patient Info
  patient_info: {
    name?: string;
    dob?: string;
    age?: string;
    gender?: string;
  };
  
  // Visit Details
  visit: {
    chief_complaint: string;
    reason_for_visit: string;
    visit_type: "new_patient" | "follow_up" | "urgent" | "routine";
  };
  
  // Clinical Data
  clinical: {
    symptoms: Array<{
      symptom: string;
      duration?: string;
      severity?: string;
      location?: string;
      description?: string;
    }>;
    vital_signs: {
      blood_pressure?: string;
      heart_rate?: string;
      temperature?: string;
      respiratory_rate?: string;
      oxygen_saturation?: string;
      weight?: string;
      height?: string;
    };
    medications: Array<{
      name: string;
      dosage?: string;
      frequency?: string;
    }>;
    allergies: string[];
    medical_history: string[];
    family_history: string[];
    social_history: string[];
  };
  
  // Urgency Assessment
  urgency: {
    level: "routine" | "urgent" | "emergent";
    score: number; // 1-10
    reason: string;
    red_flags: string[];
    time_sensitive: boolean;
  };
  
  // Specialist Recommendation
  specialist: {
    needed: boolean;
    type?: string;
    reason?: string;
    urgency?: "routine" | "soon" | "urgent";
  };
  
  // Summary
  summary: {
    brief: string; // 1-2 sentences
    detailed: string; // Full paragraph
    key_findings: string[];
    concerns: string[];
  };
  
  // Metadata
  analysis_timestamp: string;
  ai_confidence: "high" | "medium" | "low";
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: AnalyzeRequest = await req.json();
    const { encounterId } = body;

    if (!encounterId) {
      return errorResponse("encounterId is required");
    }

    console.log(`Analyzing encounter: ${encounterId}`);

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

    // Get ALL transcript chunks
    const { data: chunks, error: chunksError } = await supabaseAdmin
      .from("transcript_chunks")
      .select("speaker, text, created_at")
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: true });

    if (chunksError) {
      console.error("Transcript fetch error:", chunksError);
      return errorResponse("Failed to fetch transcript");
    }

    if (!chunks || chunks.length === 0) {
      return errorResponse("No transcript found. Please record the conversation first.");
    }

    console.log(`Found ${chunks.length} transcript chunks`);

    // Build full transcript
    const transcriptText = chunks
      .map((c) => `[${c.speaker.toUpperCase()}]: ${c.text}`)
      .join("\n");

    // Separate by speaker for analysis
    const staffStatements = chunks
      .filter(c => c.speaker === "staff")
      .map(c => c.text)
      .join(" ");
    
    const patientStatements = chunks
      .filter(c => c.speaker === "patient")
      .map(c => c.text)
      .join(" ");

    console.log(`Staff statements: ${staffStatements.length} chars`);
    console.log(`Patient statements: ${patientStatements.length} chars`);

    let analysis: AnalysisResult;

    if (isClaudeConfigured()) {
      console.log("Using Claude AI for comprehensive analysis...");
      
      const prompt = `You are an expert medical documentation AI assistant. Analyze this complete patient encounter transcript and extract ALL relevant medical information.

ENCOUNTER CONTEXT:
- Patient Name: ${encounter.patient_name || "Not provided"}
- Reason for Visit: ${encounter.reason_for_visit || "Not specified"}
- Date: ${new Date().toISOString().split('T')[0]}

FULL TRANSCRIPT:
${transcriptText}

---

Analyze this conversation thoroughly and extract:

1. PATIENT INFORMATION - Any demographics mentioned
2. VISIT DETAILS - Chief complaint, reason for visit
3. SYMPTOMS - Every symptom mentioned with duration, severity, location
4. VITAL SIGNS - Any measurements mentioned
5. MEDICATIONS - Current medications with dosages
6. ALLERGIES - All allergies mentioned
7. MEDICAL HISTORY - Past conditions, surgeries, hospitalizations
8. URGENCY ASSESSMENT - How urgent is this case (1-10 scale)?
9. RED FLAGS - Any concerning symptoms requiring immediate attention
10. SPECIALIST NEEDS - Does patient need referral?
11. KEY FINDINGS - Most important takeaways

URGENCY GUIDELINES:
- Score 1-3: Routine (can wait days/weeks)
- Score 4-6: Moderate (should be seen within days)  
- Score 7-8: Urgent (needs attention within 24-48 hours)
- Score 9-10: Emergent (immediate attention needed)

RED FLAG SYMPTOMS (always elevate urgency):
- Chest pain, difficulty breathing, severe headache
- Sudden weakness, numbness, vision changes
- High fever with stiff neck, confusion
- Severe abdominal pain, blood in stool/urine
- Suicidal thoughts, severe psychiatric symptoms

Respond with complete JSON only:
{
  "patient_info": {
    "name": "extracted name or null",
    "dob": "date of birth or null",
    "age": "age if mentioned or null",
    "gender": "gender if mentioned or null"
  },
  "visit": {
    "chief_complaint": "primary reason for visit in patient's words",
    "reason_for_visit": "clinical description of visit reason",
    "visit_type": "new_patient" | "follow_up" | "urgent" | "routine"
  },
  "clinical": {
    "symptoms": [
      {
        "symptom": "symptom name",
        "duration": "how long",
        "severity": "mild/moderate/severe or description",
        "location": "body location if applicable",
        "description": "additional details"
      }
    ],
    "vital_signs": {
      "blood_pressure": "value or null",
      "heart_rate": "value or null",
      "temperature": "value or null",
      "respiratory_rate": "value or null",
      "oxygen_saturation": "value or null",
      "weight": "value or null",
      "height": "value or null"
    },
    "medications": [
      {"name": "med name", "dosage": "dose", "frequency": "how often"}
    ],
    "allergies": ["list of allergies"],
    "medical_history": ["past conditions"],
    "family_history": ["family medical history"],
    "social_history": ["smoking, alcohol, occupation, etc"]
  },
  "urgency": {
    "level": "routine" | "urgent" | "emergent",
    "score": 1-10,
    "reason": "explanation of urgency level",
    "red_flags": ["list of concerning findings"],
    "time_sensitive": true/false
  },
  "specialist": {
    "needed": true/false,
    "type": "specialist type if needed",
    "reason": "why specialist is recommended",
    "urgency": "routine" | "soon" | "urgent"
  },
  "summary": {
    "brief": "1-2 sentence summary",
    "detailed": "comprehensive paragraph summary",
    "key_findings": ["most important findings"],
    "concerns": ["areas of concern"]
  },
  "ai_confidence": "high" | "medium" | "low"
}`;

      const response = await callClaude(prompt, { maxTokens: 4000 });
      const parsed = parseJSON<Omit<AnalysisResult, 'analysis_timestamp'>>(response);

      if (parsed) {
        analysis = {
          ...parsed,
          analysis_timestamp: new Date().toISOString(),
        };
        console.log("Claude analysis completed successfully");
      } else {
        console.error("Failed to parse Claude response");
        analysis = createFallbackAnalysis(encounter, chunks, patientStatements);
      }
    } else {
      console.log("Claude not configured, using fallback analysis");
      analysis = createFallbackAnalysis(encounter, chunks, patientStatements);
    }

    // Save analysis as artifact
    await supabaseAdmin.from("artifacts").upsert({
      encounter_id: encounterId,
      type: "fields",
      content: {
        patient_name: analysis.patient_info.name,
        dob: analysis.patient_info.dob,
        chief_complaint: analysis.visit.chief_complaint,
        reason_for_visit: analysis.visit.reason_for_visit,
        symptoms: analysis.clinical.symptoms.map(s => s.symptom),
        symptom_details: analysis.clinical.symptoms,
        medications: analysis.clinical.medications.map(m => m.name),
        medication_details: analysis.clinical.medications,
        allergies: analysis.clinical.allergies,
        medical_history: analysis.clinical.medical_history,
        vital_signs: analysis.clinical.vital_signs,
        urgency_indicators: analysis.urgency.red_flags,
      },
    }, { onConflict: 'encounter_id,type' });

    // Save full analysis
    await supabaseAdmin.from("artifacts").insert({
      encounter_id: encounterId,
      type: "analysis",
      content: analysis,
    });

    // Update encounter with urgency info
    const updateData: Record<string, unknown> = {
      status: "visit",
    };

    // Try to update urgency fields (may not exist in all schemas)
    try {
      await supabaseAdmin
        .from("encounters")
        .update({
          ...updateData,
          urgency: analysis.urgency.level,
          urgency_reason: analysis.urgency.reason,
          specialist_needed: analysis.specialist.needed,
          recommended_specialist: analysis.specialist.type,
        })
        .eq("id", encounterId);
    } catch (e) {
      // Fallback: just update status
      await supabaseAdmin
        .from("encounters")
        .update(updateData)
        .eq("id", encounterId);
    }

    console.log("Analysis saved successfully");

    return jsonResponse({
      success: true,
      analysis,
      encounterId,
      debug: {
        claudeConfigured: isClaudeConfigured(),
        transcriptChunks: chunks.length,
        staffStatements: staffStatements.length,
        patientStatements: patientStatements.length,
      },
    });

  } catch (error) {
    console.error("Analysis error:", error);
    return errorResponse(`Analysis failed: ${error}`, 500);
  }
});

// Fallback analysis when Claude is not available
function createFallbackAnalysis(
  encounter: any,
  chunks: any[],
  patientStatements: string
): AnalysisResult {
  const lowerText = patientStatements.toLowerCase();
  
  // Extract symptoms with pattern matching
  const symptomPatterns = [
    { pattern: /pain/i, symptom: "pain" },
    { pattern: /headache/i, symptom: "headache" },
    { pattern: /fever/i, symptom: "fever" },
    { pattern: /cough/i, symptom: "cough" },
    { pattern: /nausea/i, symptom: "nausea" },
    { pattern: /tired|fatigue/i, symptom: "fatigue" },
    { pattern: /dizzy|dizziness/i, symptom: "dizziness" },
    { pattern: /chest pain/i, symptom: "chest pain" },
    { pattern: /shortness of breath|can't breathe/i, symptom: "shortness of breath" },
    { pattern: /vomit/i, symptom: "vomiting" },
    { pattern: /diarrhea/i, symptom: "diarrhea" },
  ];

  const symptoms = symptomPatterns
    .filter(p => p.pattern.test(lowerText))
    .map(p => ({
      symptom: p.symptom,
      duration: undefined,
      severity: undefined,
      location: undefined,
      description: undefined,
    }));

  // Check for red flags
  const redFlagPatterns = [
    "chest pain", "difficulty breathing", "can't breathe",
    "severe headache", "worst headache", "sudden weakness",
    "numbness", "confusion", "fainting", "suicidal",
  ];
  
  const redFlags = redFlagPatterns.filter(rf => lowerText.includes(rf));

  // Determine urgency
  let urgencyLevel: "routine" | "urgent" | "emergent" = "routine";
  let urgencyScore = 3;
  
  if (redFlags.length > 0) {
    urgencyLevel = "emergent";
    urgencyScore = 9;
  } else if (symptoms.length > 3 || lowerText.includes("severe")) {
    urgencyLevel = "urgent";
    urgencyScore = 6;
  }

  // Check for specialist needs
  const specialistMap: Record<string, string> = {
    "heart": "Cardiologist",
    "chest": "Cardiologist",
    "head": "Neurologist",
    "skin": "Dermatologist",
    "stomach": "Gastroenterologist",
    "joint": "Orthopedist",
    "anxiety": "Psychiatrist",
    "depression": "Psychiatrist",
  };

  let specialistNeeded = false;
  let specialistType: string | undefined;
  
  for (const [keyword, specialist] of Object.entries(specialistMap)) {
    if (lowerText.includes(keyword)) {
      specialistNeeded = true;
      specialistType = specialist;
      break;
    }
  }

  return {
    patient_info: {
      name: encounter.patient_name || undefined,
    },
    visit: {
      chief_complaint: chunks.find(c => c.speaker === "patient")?.text || "Not specified",
      reason_for_visit: encounter.reason_for_visit || "General consultation",
      visit_type: "routine",
    },
    clinical: {
      symptoms,
      vital_signs: {},
      medications: [],
      allergies: [],
      medical_history: [],
      family_history: [],
      social_history: [],
    },
    urgency: {
      level: urgencyLevel,
      score: urgencyScore,
      reason: redFlags.length > 0 
        ? `Red flags detected: ${redFlags.join(", ")}`
        : "No urgent symptoms detected",
      red_flags: redFlags,
      time_sensitive: urgencyLevel === "emergent",
    },
    specialist: {
      needed: specialistNeeded,
      type: specialistType,
      reason: specialistNeeded ? `Symptoms suggest ${specialistType} consultation` : undefined,
      urgency: specialistNeeded ? "routine" : undefined,
    },
    summary: {
      brief: `Patient visited for ${encounter.reason_for_visit || "health concern"}. ${symptoms.length} symptoms identified.`,
      detailed: `Patient ${encounter.patient_name || "Unknown"} presented with ${encounter.reason_for_visit || "unspecified concerns"}. During the visit, ${symptoms.length} symptoms were documented${symptoms.length > 0 ? `: ${symptoms.map(s => s.symptom).join(", ")}` : ""}. ${redFlags.length > 0 ? `Red flags identified: ${redFlags.join(", ")}.` : "No immediate red flags identified."}`,
      key_findings: symptoms.map(s => s.symptom),
      concerns: redFlags,
    },
    analysis_timestamp: new Date().toISOString(),
    ai_confidence: "low",
  };
}
