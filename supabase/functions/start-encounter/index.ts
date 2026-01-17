// Start Encounter Edge Function
// Creates a new encounter and returns LiveKit credentials

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { generateLivekitToken } from "../_shared/livekit.ts";
import type { StartEncounterRequest, StartEncounterResponse } from "../_shared/types.ts";

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Parse request body
    const body: StartEncounterRequest = await req.json().catch(() => ({}));
    const { patient_name, reason_for_visit } = body;

    // Generate room name (using encounter ID)
    const roomName = `encounter-${crypto.randomUUID()}`;

    // Create encounter in database
    const { data: encounter, error: dbError } = await supabaseAdmin
      .from("encounters")
      .insert({
        status: "intake",
        patient_name: patient_name || null,
        reason_for_visit: reason_for_visit || null,
        livekit_room_name: roomName,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return errorResponse("Failed to create encounter", 500);
    }

    // Generate LiveKit token
    let livekitToken: string | undefined;
    try {
      livekitToken = await generateLivekitToken(
        roomName,
        `staff-${encounter.id}`,
        {
          canPublish: true,
          canSubscribe: true,
          canPublishData: true,
        }
      );
    } catch (err) {
      // LiveKit not configured - continue without token
      console.warn("LiveKit token generation skipped:", err);
    }

    const response: StartEncounterResponse = {
      encounterId: encounter.id,
      roomName,
      livekitToken,
    };

    return jsonResponse(response, 201);
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Internal server error", 500);
  }
});
