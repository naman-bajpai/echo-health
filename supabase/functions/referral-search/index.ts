// Referral Search Edge Function
// Searches for healthcare providers by specialty and location

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { searchProviders, generateQueryHash } from "../_shared/browserbase.ts";
import type { ReferralSearchRequest, Provider } from "../_shared/types.ts";

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: ReferralSearchRequest = await req.json();
    const { encounterId, specialty, location } = body;

    if (!encounterId) {
      return errorResponse("encounterId is required");
    }
    if (!specialty) {
      return errorResponse("specialty is required");
    }

    // Verify encounter exists
    const { data: encounter, error: encounterError } = await supabaseAdmin
      .from("encounters")
      .select("id")
      .eq("id", encounterId)
      .single();

    if (encounterError || !encounter) {
      return errorResponse("Encounter not found", 404);
    }

    // Check cache first
    const queryHash = generateQueryHash(specialty, location);
    const { data: cached } = await supabaseAdmin
      .from("providers_cache")
      .select("*")
      .eq("query_hash", queryHash)
      .gt("expires_at", new Date().toISOString())
      .single();

    let providers: Provider[];

    if (cached) {
      // Use cached results
      providers = cached.providers as Provider[];
    } else {
      // Search for providers
      providers = await searchProviders(specialty, location);

      // Cache results
      await supabaseAdmin.from("providers_cache").upsert(
        {
          query_hash: queryHash,
          specialty,
          location: location || null,
          providers,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        },
        { onConflict: "query_hash" }
      );
    }

    return jsonResponse({
      providers,
      cached: Boolean(cached),
      specialty,
      location,
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Internal server error", 500);
  }
});
