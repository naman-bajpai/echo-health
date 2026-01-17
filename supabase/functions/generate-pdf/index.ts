// Generate PDF Edge Function
// Creates downloadable PDF from visit summary

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse, corsHeaders } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { generateSummaryPdf } from "../_shared/pdf.ts";
import type { GeneratePdfRequest, PatientSummary } from "../_shared/types.ts";

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

    const summary = summaryArtifact.content as PatientSummary;

    // Generate PDF
    const pdfBytes = generateSummaryPdf(
      summary,
      encounter.patient_name || undefined,
      new Date(encounter.created_at).toLocaleDateString()
    );

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

// Also support direct PDF download
export async function downloadPdf(encounterId: string): Promise<Response> {
  try {
    // Fetch latest summary
    const { data: summaryArtifact } = await supabaseAdmin
      .from("artifacts")
      .select("*")
      .eq("encounter_id", encounterId)
      .eq("type", "summary")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!summaryArtifact) {
      return errorResponse("Summary not found", 404);
    }

    const { data: encounter } = await supabaseAdmin
      .from("encounters")
      .select("*")
      .eq("id", encounterId)
      .single();

    const summary = summaryArtifact.content as PatientSummary;
    const pdfBytes = generateSummaryPdf(
      summary,
      encounter?.patient_name || undefined,
      encounter ? new Date(encounter.created_at).toLocaleDateString() : undefined
    );

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="visit-summary.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Failed to generate PDF", 500);
  }
}
