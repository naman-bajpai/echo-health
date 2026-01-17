// Start Encounter Edge Function
// Creates a new encounter with visit tracking

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { generateRoomName, generateToken, isConfigured as isLiveKitConfigured } from "../_shared/livekit.ts";

interface StartEncounterRequest {
  patient_name?: string;
  reason_for_visit?: string;
  patient_id?: string;
  created_by?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: StartEncounterRequest = await req.json();
    const { patient_name, reason_for_visit, patient_id, created_by } = body;

    // Get visit number if patient_id provided
    let visitNumber = 1;
    if (patient_id) {
      const { count } = await supabaseAdmin
        .from("encounters")
        .select("*", { count: "exact", head: true })
        .eq("patient_id", patient_id);
      
      visitNumber = (count || 0) + 1;
    }

    // Generate room name for LiveKit
    const roomName = generateRoomName();

    // Create the encounter
    const { data: encounter, error: encounterError } = await supabaseAdmin
      .from("encounters")
      .insert({
        patient_name,
        reason_for_visit,
        patient_id,
        created_by,
        visit_number: visitNumber,
        status: "active",
        room_name: roomName,
        urgency: "routine", // Default, will be updated by AI
        specialist_needed: false,
      })
      .select()
      .single();

    if (encounterError) {
      console.error("Error creating encounter:", encounterError);
      return errorResponse("Failed to create encounter", 500);
    }

    // Generate LiveKit token if configured
    let livekitToken: string | undefined;
    if (isLiveKitConfigured()) {
      try {
        livekitToken = generateToken(roomName, `staff-${encounter.id}`);
      } catch (err) {
        console.warn("Failed to generate LiveKit token:", err);
      }
    }

    return jsonResponse({
      encounterId: encounter.id,
      roomName,
      livekitToken,
      visitNumber,
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Internal server error", 500);
  }
});
