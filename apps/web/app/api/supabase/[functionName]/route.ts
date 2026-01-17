import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function POST(
  request: NextRequest,
  { params }: { params: { functionName: string } }
) {
  const { functionName } = params;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    // Handle different functions locally
    switch (functionName) {
      case "start-encounter":
        return handleStartEncounter(body);
      case "upsert-transcript":
        return handleUpsertTranscript(body);
      case "extract-fields":
        return handleExtractFields(body);
      case "generate-draft-note":
        return handleGenerateDraftNote(body);
      case "generate-summary":
        return handleGenerateSummary(body);
      case "assess-urgency":
        return handleAssessUrgency(body);
      case "referral-search":
        return handleReferralSearch(body);
      case "approve-referral":
        return handleApproveReferral(body);
      case "generate-pdf":
        return handleGeneratePdf(body);
      default:
        return NextResponse.json(
          { error: `Function ${functionName} not implemented` },
          { status: 404 }
        );
    }
  } catch (error) {
    console.error(`Error in ${functionName}:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ==================== HANDLERS ====================

async function handleStartEncounter(body: any) {
  const { patient_name, reason_for_visit, patient_id } = body;

  // Get visit number if patient_id provided
  let visitNumber = 1;
  if (patient_id) {
    const { count } = await supabase
      .from("encounters")
      .select("*", { count: "exact", head: true })
      .eq("patient_id", patient_id);

    visitNumber = (count || 0) + 1;
  }

  // Build insert object with only existing columns
  // Status must be: 'intake', 'visit', or 'checkout'
  const insertData: any = {
    patient_name,
    reason_for_visit,
    status: "intake",
  };

  // Only add optional fields if provided
  if (patient_id) insertData.patient_id = patient_id;

  // Create the encounter
  const { data: encounter, error } = await supabase
    .from("encounters")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("Error creating encounter:", error);
    return NextResponse.json(
      { error: `Failed to create encounter: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    encounterId: encounter.id,
    visitNumber,
  });
}

async function handleUpsertTranscript(body: any) {
  const { encounterId, text, timestamp, speaker = "staff" } = body;

  if (!encounterId || !text?.trim()) {
    return NextResponse.json(
      { error: "encounterId and text are required" },
      { status: 400 }
    );
  }

  // Simple speaker detection based on patterns
  let detectedSpeaker = speaker;
  const lowerText = text.toLowerCase();

  const questionPatterns = [
    /^(what|when|where|why|how|do you|are you|can you|have you|is there|did you)/i,
    /\?$/,
    /tell me about/i,
    /describe/i,
    /any (pain|symptoms|allergies|medications)/i,
  ];

  const answerPatterns = [
    /^(yes|no|yeah|nope|i have|i feel|i am|i've been|it hurts|my)/i,
    /\b(hurts|pain|ache|feeling|felt|started|days ago|weeks ago)\b/i,
  ];

  const isQuestion = questionPatterns.some((p) => p.test(lowerText));
  const isAnswer = answerPatterns.some((p) => p.test(lowerText));

  if (isQuestion && !isAnswer) {
    detectedSpeaker = "staff";
  } else if (isAnswer) {
    detectedSpeaker = "patient";
  }

  // Clean text
  const cleanedText = text
    .replace(/\b(um|uh|er|ah|like|you know|basically|actually|literally)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanedText || cleanedText.length < 2) {
    return NextResponse.json({
      id: null,
      success: true,
      skipped: true,
      reason: "Text too short",
    });
  }

  // Insert transcript chunk
  const { data: chunk, error } = await supabase
    .from("transcript_chunks")
    .insert({
      encounter_id: encounterId,
      speaker: detectedSpeaker,
      text: cleanedText,
      timestamp_ms: timestamp || Date.now(),
    })
    .select()
    .single();

  if (error) {
    console.error("Insert error:", error);
    return NextResponse.json(
      { error: "Failed to save transcript" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    id: chunk.id,
    success: true,
    speaker: detectedSpeaker,
    text: cleanedText,
  });
}

async function handleExtractFields(body: any) {
  const { encounterId } = body;

  // Get transcript
  const { data: chunks } = await supabase
    .from("transcript_chunks")
    .select("speaker, text")
    .eq("encounter_id", encounterId)
    .order("created_at", { ascending: true });

  if (!chunks || chunks.length === 0) {
    return NextResponse.json(
      { error: "No transcript found" },
      { status: 400 }
    );
  }

  // Simple extraction based on patterns
  const fullText = chunks.map((c) => c.text).join(" ");
  const patientText = chunks
    .filter((c) => c.speaker === "patient")
    .map((c) => c.text)
    .join(" ");

  const fields: any = {
    symptoms: [],
    medications: [],
    allergies: [],
  };

  // Extract patient name (if mentioned)
  const nameMatch = fullText.match(/(?:my name is|i'm|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (nameMatch) fields.patient_name = nameMatch[1];

  // Extract symptoms from patient statements
  const symptomKeywords = [
    "pain", "ache", "hurt", "headache", "nausea", "fever", "cough",
    "tired", "fatigue", "dizzy", "swelling", "rash", "shortness of breath"
  ];
  symptomKeywords.forEach((kw) => {
    if (patientText.toLowerCase().includes(kw)) {
      fields.symptoms.push(kw);
    }
  });

  // Extract medications
  const medMatch = patientText.match(/(?:taking|on|medication[s]?)\s+([a-zA-Z]+)/gi);
  if (medMatch) {
    fields.medications = medMatch.map((m) =>
      m.replace(/(?:taking|on|medication[s]?)\s+/i, "")
    );
  }

  // Extract allergies
  const allergyMatch = patientText.match(/allergic to\s+([a-zA-Z]+)/gi);
  if (allergyMatch) {
    fields.allergies = allergyMatch.map((a) =>
      a.replace(/allergic to\s+/i, "")
    );
  }

  // Extract reason for visit
  const reasonMatch = fullText.match(/(?:here for|reason for visit|coming in for)\s+(.+?)(?:\.|$)/i);
  if (reasonMatch) fields.reason_for_visit = reasonMatch[1].trim();

  // Save fields as artifact
  await supabase.from("artifacts").insert({
    encounter_id: encounterId,
    type: "fields",
    content: fields,
  });

  return NextResponse.json({
    fields,
    encounterId,
  });
}

async function handleGenerateDraftNote(body: any) {
  const { encounterId } = body;

  // Get transcript
  const { data: chunks } = await supabase
    .from("transcript_chunks")
    .select("speaker, text")
    .eq("encounter_id", encounterId)
    .order("created_at", { ascending: true });

  const patientText = chunks
    ?.filter((c) => c.speaker === "patient")
    .map((c) => c.text)
    .join(". ") || "No patient statements recorded.";

  const draftNote = {
    subjective: `Patient reports: ${patientText}`,
    objective: "Vital signs and physical examination findings to be documented by clinician.",
    assessment: "[DRAFT - Requires clinician review] Based on patient-reported symptoms.",
    plan: "[DRAFT - Requires clinician approval] Treatment plan to be determined.",
    generated_at: new Date().toISOString(),
    disclaimer: "DRAFT ONLY - This note was AI-generated and requires clinician review and approval before use.",
  };

  // Save as artifact
  await supabase.from("artifacts").insert({
    encounter_id: encounterId,
    type: "draft_note",
    content: draftNote,
  });

  return NextResponse.json({
    draftNote,
    encounterId,
  });
}

async function handleGenerateSummary(body: any) {
  const { encounterId } = body;

  // Get encounter info
  const { data: encounter } = await supabase
    .from("encounters")
    .select("*")
    .eq("id", encounterId)
    .single();

  // Get fields
  const { data: fieldsArtifact } = await supabase
    .from("artifacts")
    .select("content")
    .eq("encounter_id", encounterId)
    .eq("type", "fields")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const fields = fieldsArtifact?.content || {};

  const summary = {
    visit_summary: `Patient ${encounter?.patient_name || "Unknown"} visited for ${encounter?.reason_for_visit || "unspecified reason"}.`,
    diagnoses: ["[Pending clinician diagnosis]"],
    treatment_plan: ["[Pending clinician approval]"],
    medications: fields.medications || [],
    follow_up: "Follow-up appointment to be scheduled as needed.",
    patient_instructions: [
      "Take medications as prescribed",
      "Contact clinic if symptoms worsen",
      "Follow up as scheduled",
    ],
    warning_signs: [
      "Severe pain or discomfort",
      "High fever (over 101°F)",
      "Difficulty breathing",
    ],
    generated_at: new Date().toISOString(),
    disclaimer: "This summary is for informational purposes only and does not constitute medical advice.",
  };

  // Save summary
  await supabase.from("artifacts").insert({
    encounter_id: encounterId,
    type: "summary",
    content: summary,
  });

  // Update encounter status to checkout
  await supabase
    .from("encounters")
    .update({ status: "checkout" })
    .eq("id", encounterId);

  return NextResponse.json({
    summary,
    encounterId,
  });
}

async function handleAssessUrgency(body: any) {
  const { encounterId } = body;

  // Get transcript
  const { data: chunks } = await supabase
    .from("transcript_chunks")
    .select("text")
    .eq("encounter_id", encounterId);

  const fullText = chunks?.map((c) => c.text).join(" ").toLowerCase() || "";

  // Check for emergency keywords
  const emergentKeywords = [
    "chest pain", "can't breathe", "difficulty breathing", "severe headache",
    "loss of consciousness", "fainting", "bleeding heavily", "suicidal"
  ];

  const urgentKeywords = [
    "high fever", "severe pain", "vomiting", "infection", "swelling"
  ];

  const specialistIndicators: Record<string, string> = {
    heart: "Cardiologist",
    chest: "Cardiologist",
    headache: "Neurologist",
    joint: "Orthopedic",
    skin: "Dermatologist",
    rash: "Dermatologist",
    stomach: "Gastroenterologist",
    breathing: "Pulmonologist",
    anxiety: "Psychiatrist",
    depression: "Psychiatrist",
  };

  let level: "routine" | "urgent" | "emergent" = "routine";
  let isEmergent = false;
  let reason = "No urgent symptoms detected";
  const redFlags: string[] = [];

  // Check emergent
  emergentKeywords.forEach((kw) => {
    if (fullText.includes(kw)) {
      level = "emergent";
      isEmergent = true;
      redFlags.push(kw);
    }
  });

  // Check urgent (if not already emergent)
  if (!isEmergent) {
    urgentKeywords.forEach((kw) => {
      if (fullText.includes(kw)) {
        level = "urgent";
        redFlags.push(kw);
      }
    });
  }

  if (redFlags.length > 0) {
    reason = `Detected: ${redFlags.join(", ")}`;
  }

  // Check specialist
  let specialistNeeded = false;
  let recommendedSpecialist: string | undefined;

  for (const [keyword, specialist] of Object.entries(specialistIndicators)) {
    if (fullText.includes(keyword)) {
      specialistNeeded = true;
      recommendedSpecialist = specialist;
      break;
    }
  }

  const assessment = {
    level,
    reason,
    specialist_needed: specialistNeeded,
    recommended_specialist: recommendedSpecialist,
    red_flags: redFlags,
  };

  // Try to update encounter (ignore errors if columns don't exist)
  try {
    await supabase
      .from("encounters")
      .update({
        urgency: level,
        urgency_reason: reason,
        specialist_needed: specialistNeeded,
        recommended_specialist: recommendedSpecialist,
      })
      .eq("id", encounterId);
  } catch (e) {
    console.warn("Could not update encounter urgency fields:", e);
  }

  return NextResponse.json({
    assessment,
    encounterId,
  });
}

async function handleReferralSearch(body: any) {
  const { specialty } = body;

  // Mock providers for demo
  const mockProviders = [
    {
      id: "prov-1",
      name: `Dr. Sarah Johnson - ${specialty}`,
      specialty,
      address: "123 Medical Center Dr, Pittsburgh, PA 15213",
      phone: "(412) 555-0101",
      accepting_new_patients: true,
      rating: 4.8,
      distance: "2.3 miles",
    },
    {
      id: "prov-2",
      name: `Dr. Michael Chen - ${specialty}`,
      specialty,
      address: "456 Health Ave, Pittsburgh, PA 15219",
      phone: "(412) 555-0102",
      accepting_new_patients: true,
      rating: 4.6,
      distance: "3.1 miles",
    },
    {
      id: "prov-3",
      name: `${specialty} Associates`,
      specialty,
      address: "789 Care Blvd, Pittsburgh, PA 15232",
      phone: "(412) 555-0103",
      accepting_new_patients: false,
      rating: 4.9,
      distance: "4.5 miles",
    },
  ];

  return NextResponse.json({
    providers: mockProviders,
    encounterId: body.encounterId,
  });
}

async function handleApproveReferral(body: any) {
  const { encounterId, provider, reason } = body;

  const referral = {
    provider,
    referral: {
      reason,
      status: "approved",
    },
    instructions: `Referral to ${provider.name} has been approved. Please contact their office at ${provider.phone} to schedule an appointment.`,
  };

  // Save referral artifact
  await supabase.from("artifacts").insert({
    encounter_id: encounterId,
    type: "referral",
    content: referral,
  });

  return NextResponse.json({
    referral,
    encounterId,
  });
}

async function handleGeneratePdf(body: any) {
  const { encounterId } = body;

  // For demo, just return a placeholder
  // In production, you'd generate a real PDF
  return NextResponse.json({
    pdfUrl: `https://pkkufemzkmykjdtnzueu.supabase.co/storage/v1/object/public/summaries/${encounterId}.pdf`,
    encounterId,
    message: "PDF generation not implemented in demo mode",
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
