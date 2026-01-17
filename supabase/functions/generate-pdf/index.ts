// Generate PDF Edge Function
// Creates downloadable PDF from visit summary with all details

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { generateSummaryPdf } from "../_shared/pdf.ts";
import type { GeneratePdfRequest, PatientSummary, ExtractedFields } from "../_shared/types.ts";

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: GeneratePdfRequest = await req.json();
    const { encounterId, summaryId } = body;

    if (!encounterId) {
      return errorResponse("encounterId is required");
    }

    // Fetch encounter
    const { data: encounter, error: encounterError } = await supabaseAdmin
      .from("encounters")
      .select("*")
      .eq("id", encounterId)
      .single();

    if (encounterError || !encounter) {
      return errorResponse("Encounter not found", 404);
    }

    // Fetch summary artifact
    let summaryQuery = supabaseAdmin
      .from("artifacts")
      .select("*")
      .eq("encounter_id", encounterId)
      .eq("type", "summary");

    if (summaryId) {
      summaryQuery = summaryQuery.eq("id", summaryId);
    } else {
      summaryQuery = summaryQuery.order("created_at", { ascending: false }).limit(1);
    }

    const { data: summaryArtifact, error: summaryError } = await summaryQuery.single();

    if (summaryError || !summaryArtifact) {
      return errorResponse("Summary not found. Generate summary first.", 404);
    }

    // Fetch fields artifact
    const { data: fieldsArtifact } = await supabaseAdmin
      .from("artifacts")
      .select("content")
      .eq("encounter_id", encounterId)
      .eq("type", "fields")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const summary = summaryArtifact.content as PatientSummary;
    const fields = fieldsArtifact?.content as ExtractedFields | null;

    // Generate PDF with all available data
    const pdfBytes = generateSummaryPdf({
      summary,
      fields,
      patientName: encounter.patient_name || undefined,
      encounterDate: new Date(encounter.created_at).toLocaleDateString(),
      encounterId: encounter.id,
    });

    // Upload to Supabase Storage
    const fileName = `${encounterId}/${summaryArtifact.id}.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("summaries")
      .upload(fileName, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return errorResponse("Failed to upload PDF", 500);
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from("summaries")
      .createSignedUrl(fileName, 3600);

    if (signedUrlError) {
      console.error("Signed URL error:", signedUrlError);
      return errorResponse("Failed to generate download URL", 500);
    }

    return jsonResponse({
      pdfUrl: signedUrlData.signedUrl,
      fileName: `visit-summary-${encounterId.slice(0, 8)}.pdf`,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Internal server error", 500);
  }
});
