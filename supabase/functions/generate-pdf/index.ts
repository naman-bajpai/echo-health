// Generate PDF Edge Function
// Creates comprehensive downloadable PDF with all encounter details for doctor review

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

    // Fetch encounter with full details
    const { data: encounter, error: encounterError } = await supabaseAdmin
      .from("encounters")
      .select("*")
      .eq("id", encounterId)
      .single();

    if (encounterError || !encounter) {
      return errorResponse("Encounter not found", 404);
    }

    // Fetch ALL artifacts in parallel for comprehensive PDF
    const [
      summaryResult,
      fieldsResult,
      billingCodesResult,
      draftNoteResult,
      diagnosisResult,
      clinicalFocusResult,
      referralsResult,
    ] = await Promise.all([
      // Summary artifact
      supabaseAdmin
        .from("artifacts")
        .select("*")
        .eq("encounter_id", encounterId)
        .eq("type", "summary")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Fields artifact
      supabaseAdmin
        .from("artifacts")
        .select("content")
        .eq("encounter_id", encounterId)
        .eq("type", "fields")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Billing codes artifact
      supabaseAdmin
        .from("artifacts")
        .select("content")
        .eq("encounter_id", encounterId)
        .eq("type", "billing_codes")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Draft note artifact
      supabaseAdmin
        .from("artifacts")
        .select("content")
        .eq("encounter_id", encounterId)
        .eq("type", "draft_note")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Diagnosis artifact
      supabaseAdmin
        .from("artifacts")
        .select("content")
        .eq("encounter_id", encounterId)
        .eq("type", "diagnosis")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Clinical focus artifact
      supabaseAdmin
        .from("artifacts")
        .select("content")
        .eq("encounter_id", encounterId)
        .eq("type", "clinical_focus")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Referral artifacts
      supabaseAdmin
        .from("artifacts")
        .select("content")
        .eq("encounter_id", encounterId)
        .eq("type", "referral")
        .order("created_at", { ascending: false }),
    ]);

    // Fetch full transcript
    const { data: transcriptChunks } = await supabaseAdmin
      .from("transcript_chunks")
      .select("speaker, text, created_at")
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: true });

    // Build transcript array
    const transcript = transcriptChunks?.map(chunk => ({
      speaker: chunk.speaker,
      text: chunk.text,
      timestamp: chunk.created_at,
    })) || [];

    const summaryArtifact = summaryResult.data;
    
    // Allow PDF generation even without summary - use placeholders
    const summary = summaryArtifact?.content as PatientSummary || {
      visit_summary: "Summary pending generation.",
      diagnoses: [],
      treatment_plan: [],
      medications: [],
      follow_up: "",
      patient_instructions: [],
      warning_signs: [],
      generated_at: new Date().toISOString(),
      disclaimer: "This document is for informational purposes only.",
    };
    
    const fields = fieldsResult.data?.content as ExtractedFields | null;
    const billingCodes = billingCodesResult.data?.content as any | null;
    const draftNote = draftNoteResult.data?.content as any | null;
    const diagnosis = diagnosisResult.data?.content as any | null;
    const clinicalFocus = clinicalFocusResult.data?.content as any | null;
    const referrals = referralsResult.data?.map(r => r.content) || [];

    // Log what data we have (for debugging)
    console.log("PDF Generation - Data available:", {
      hasSummary: !!summary,
      hasFields: !!fields,
      hasDraftNote: !!draftNote,
      hasBillingCodes: !!billingCodes,
      hasDiagnosis: !!diagnosis,
      hasClinicalFocus: !!clinicalFocus,
      hasReferrals: !!referrals,
      transcriptLength: transcript?.length || 0,
      encounterId: encounter.id,
    });

    // Generate comprehensive PDF with all available data
    const pdfBytes = generateSummaryPdf({
      summary,
      fields,
      draftNote,
      billingCodes,
      diagnosis,
      clinicalFocus,
      referrals,
      transcript,
      encounter: {
        id: encounter.id,
        patient_name: encounter.patient_name,
        patient_dob: encounter.patient_dob,
        reason_for_visit: encounter.reason_for_visit,
        urgency: encounter.urgency,
        urgency_reason: encounter.urgency_reason,
        specialist_needed: encounter.specialist_needed || false,
        recommended_specialist: encounter.recommended_specialist,
        status: encounter.status,
        created_at: encounter.created_at,
      },
      patientName: encounter.patient_name || undefined,
      encounterDate: new Date(encounter.created_at).toLocaleDateString(),
      encounterId: encounter.id,
    });

    console.log("PDF generated, size:", pdfBytes.length, "bytes");

    // Upload to Supabase Storage
    const artifactId = summaryArtifact?.id || encounterId;
    const fileName = `${encounterId}/${artifactId}.pdf`;
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
      fileName: `encounter-report-${encounterId.slice(0, 8)}.pdf`,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Internal server error", 500);
  }
});
