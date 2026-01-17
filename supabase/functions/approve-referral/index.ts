// Approve Referral Edge Function
// Creates a referral packet for selected provider

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import type { ApproveReferralRequest } from "../_shared/types.ts";

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: ApproveReferralRequest = await req.json();
    const { encounterId, provider, reason } = body;

    if (!encounterId) {
      return errorResponse("encounterId is required");
    }
    if (!provider) {
      return errorResponse("provider is required");
    }
    if (!reason) {
      return errorResponse("reason is required");
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

    // Create referral packet content
    const referralContent = {
      provider: {
        id: provider.id,
        name: provider.name,
        specialty: provider.specialty,
        address: provider.address,
        phone: provider.phone,
      },
      patient: {
        name: encounter.patient_name || "Patient",
        encounter_date: encounter.created_at,
      },
      referral: {
        reason: reason,
        created_at: new Date().toISOString(),
        status: "pending",
      },
      instructions: generateInstructions(provider),
    };

    // Store as artifact
    const { data: artifact, error: artifactError } = await supabaseAdmin
      .from("artifacts")
      .insert({
        encounter_id: encounterId,
        type: "referral",
        content: referralContent,
      })
      .select()
      .single();

    if (artifactError) {
      console.error("Artifact error:", artifactError);
      return errorResponse("Failed to create referral", 500);
    }

    return jsonResponse({
      artifactId: artifact.id,
      referral: referralContent,
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Internal server error", 500);
  }
});

/**
 * Generate appointment instructions
 */
function generateInstructions(provider: { name: string; phone: string; address: string }): string {
  return `To schedule your appointment with ${provider.name}:

1. Call ${provider.phone} during business hours
2. Mention you have a referral from your recent visit
3. Have your insurance information ready
4. Location: ${provider.address}

Please schedule your appointment within the next 2 weeks if possible.`;
}
