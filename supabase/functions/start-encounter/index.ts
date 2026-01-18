// Start Encounter Edge Function
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { generateLivekitToken } from "../_shared/livekit.ts";

interface StartEncounterRequest {
  patient_name?: string;
  reason_for_visit?: string;
  patient_id?: string;
  participant_identity?: string; // Staff member name/id
  template_id?: string; // EHR template ID
  created_by?: string; // User ID who created the encounter
}

// Generate unique room name
function generateRoomName(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `encounter-${timestamp}-${random}`;
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: StartEncounterRequest = await req.json();
    const { patient_name, reason_for_visit, patient_id, participant_identity, template_id, created_by } = body;

    // Get visit number if patient_id provided
    let visitNumber = 1;
    if (patient_id) {
      const { count } = await supabaseAdmin
        .from("encounters")
        .select("*", { count: "exact", head: true })
        .eq("patient_id", patient_id);
      visitNumber = (count || 0) + 1;
    }

    // Generate LiveKit room name
    const roomName = generateRoomName();

    // Build insert data
    const insertData: Record<string, unknown> = {
      patient_name,
      reason_for_visit,
      status: "intake",
    };

    if (patient_id) {
      insertData.patient_id = patient_id;
    }

    if (template_id) {
      insertData.template_id = template_id;
    }

    if (created_by) {
      insertData.created_by = created_by;
    }

    const { data: encounter, error } = await supabaseAdmin
      .from("encounters")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error creating encounter:", error);
      return errorResponse(`Failed to create encounter: ${error.message}`, 500);
    }

    // Generate LiveKit token for the participant
    let livekitToken: string | null = null;
    try {
      const identity = participant_identity || `staff-${encounter.id}`;
      livekitToken = await generateLivekitToken(roomName, identity, {
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        ttlSeconds: 7200, // 2 hours
      });
      console.log(`Generated LiveKit token for room: ${roomName}`);
    } catch (err) {
      console.warn("LiveKit token generation failed (will use browser STT):", err);
      // Don't fail the request - fall back to browser STT
    }

    return jsonResponse({
      encounterId: encounter.id,
      visitNumber,
      roomName,
      livekitToken,
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Internal server error", 500);
  }
});
