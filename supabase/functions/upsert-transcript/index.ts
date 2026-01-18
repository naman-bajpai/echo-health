// Upsert Transcript Edge Function
// Uses OpenAI for speaker detection, text cleanup, and real-time analysis
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import supabaseAdmin from "../_shared/supabaseAdmin.ts";
import { processTranscript, callOpenAIJSON, isConfigured as isOpenAIConfigured } from "../_shared/openai.ts";

interface UpsertRequest {
  encounterId: string;
  text: string;
  timestamp?: number;
}

interface SentenceAnalysis {
  symptoms?: string[];
  medications?: string[];
  allergies?: string[];
  duration?: string;
  severity?: string;
  urgency_flags?: string[];
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: UpsertRequest = await req.json();
    const { encounterId, text, timestamp } = body;

    if (!encounterId) {
      return errorResponse("encounterId is required");
    }
    if (!text || text.trim() === "") {
      return errorResponse("text is required");
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

    // Get recent context for better speaker detection
    const { data: recentChunks } = await supabaseAdmin
      .from("transcript_chunks")
      .select("speaker, text")
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: false })
      .limit(3);

    const context = recentChunks
      ?.reverse()
      .map((c) => `${c.speaker}: ${c.text}`)
      .join("\n") || "";

    // Process with OpenAI - detect speaker and clean text
    const { speaker, text: cleanedText } = await processTranscript(text, context);

    // Skip empty or very short text
    if (!cleanedText || cleanedText.length < 2) {
      return jsonResponse({
        id: null,
        success: true,
        skipped: true,
        reason: "Text too short after cleaning",
      });
    }

    // Insert transcript chunk
    const { data: chunk, error: insertError } = await supabaseAdmin
      .from("transcript_chunks")
      .insert({
        encounter_id: encounterId,
        speaker,
        text: cleanedText,
        timestamp_ms: timestamp ? Math.floor(timestamp / 1000) : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return errorResponse("Failed to save transcript", 500);
    }

    // Analyze sentence for medical data (in background, don't block response)
    let sentenceAnalysis: SentenceAnalysis | null = null;
    
    if (isOpenAIConfigured() && speaker === "patient") {
      // Only analyze patient statements for symptoms
      try {
        sentenceAnalysis = await analyzeSentence(cleanedText);
        
        // If analysis found something, update the fields artifact
        if (sentenceAnalysis && hasContent(sentenceAnalysis)) {
          await updateFieldsArtifact(encounterId, sentenceAnalysis);
        }
      } catch (e) {
        console.error("Sentence analysis error:", e);
        // Don't fail the request if analysis fails
      }
    }

    // Auto-generate artifacts after every transcript input (in background, don't block response)
    // Run this asynchronously so it doesn't block the response
    (async () => {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        
        if (supabaseUrl && supabaseServiceKey) {
          // Auto-generate SOAP note on every transcript input
          console.log(`Auto-generating SOAP note for encounter ${encounterId} after new transcript input`);
          fetch(`${supabaseUrl}/functions/v1/generate-draft-note`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ encounterId }),
          }).catch((e) => {
            console.error("Error auto-generating SOAP note:", e);
          });

          // Auto-generate clinical focus analysis (possible conditions & recommended questions)
          console.log(`Auto-generating clinical focus for encounter ${encounterId} after new transcript input`);
          fetch(`${supabaseUrl}/functions/v1/smart-clinical-analysis`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ encounterId }),
          }).catch((e) => {
            console.error("Error auto-generating clinical focus:", e);
          });

          // Auto-generate live questions based on current transcript
          console.log(`[LIVE QUESTIONS] Auto-generating for encounter ${encounterId} after new transcript input`);
          fetch(`${supabaseUrl}/functions/v1/generate-live-questions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ encounterId }),
          })
            .then(response => {
              if (!response.ok) {
                console.error(`[LIVE QUESTIONS] Failed with status ${response.status}`);
                return response.text().then(text => {
                  console.error(`[LIVE QUESTIONS] Error response: ${text}`);
                });
              }
              return response.json();
            })
            .then(data => {
              if (data) {
                console.log(`[LIVE QUESTIONS] Successfully generated ${data.questions?.length || 0} questions`);
              }
            })
            .catch((e) => {
              console.error("[LIVE QUESTIONS] Error auto-generating:", e);
            });
        }
      } catch (e) {
        console.error("Error auto-generating artifacts:", e);
        // Don't fail the request if auto-generation check fails
      }
    })();

    return jsonResponse({
      id: chunk.id,
      success: true,
      speaker,
      text: cleanedText,
      originalText: text,
      analysis: sentenceAnalysis,
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Internal server error", 500);
  }
});

// Analyze a single sentence for medical content
async function analyzeSentence(text: string): Promise<SentenceAnalysis | null> {
  const prompt = `Extract medical information from this patient statement. Only include items that are explicitly mentioned.

Statement: "${text}"

Return JSON only (empty arrays if nothing found):
{
  "symptoms": ["symptom mentioned"],
  "medications": ["medication mentioned"],
  "allergies": ["allergy mentioned"],
  "duration": "duration if mentioned (e.g., '3 days', '2 weeks')",
  "severity": "severity if mentioned (e.g., 'mild', 'severe', '7/10')",
  "urgency_flags": ["concerning symptoms like chest pain, difficulty breathing, etc"]
}`;

  return await callOpenAIJSON<SentenceAnalysis>(prompt, {
    systemPrompt: "Extract medical data from patient statements. Be precise and only include explicitly mentioned items. Return valid JSON only.",
  });
}

// Check if analysis has any content
function hasContent(analysis: SentenceAnalysis): boolean {
  return Boolean(
    (analysis.symptoms && analysis.symptoms.length > 0) ||
    (analysis.medications && analysis.medications.length > 0) ||
    (analysis.allergies && analysis.allergies.length > 0) ||
    analysis.duration ||
    analysis.severity ||
    (analysis.urgency_flags && analysis.urgency_flags.length > 0)
  );
}

// Update the fields artifact with new data from sentence analysis
async function updateFieldsArtifact(encounterId: string, analysis: SentenceAnalysis) {
  // Get existing fields
  const { data: existingArtifact } = await supabaseAdmin
    .from("artifacts")
    .select("content")
    .eq("encounter_id", encounterId)
    .eq("type", "fields")
    .single();

  const existingFields = existingArtifact?.content || {};

  // Merge new data (avoid duplicates)
  const mergedFields = {
    ...existingFields,
    symptoms: mergeUnique(existingFields.symptoms || [], analysis.symptoms || []),
    medications: mergeUnique(existingFields.medications || [], analysis.medications || []),
    allergies: mergeUnique(existingFields.allergies || [], analysis.allergies || []),
    urgency_indicators: mergeUnique(existingFields.urgency_indicators || [], analysis.urgency_flags || []),
  };

  // Update duration/severity if provided
  if (analysis.duration && !existingFields.symptom_duration) {
    mergedFields.symptom_duration = analysis.duration;
  }
  if (analysis.severity && !existingFields.symptom_severity) {
    mergedFields.symptom_severity = analysis.severity;
  }

  // Upsert the artifact
  await supabaseAdmin
    .from("artifacts")
    .upsert({
      encounter_id: encounterId,
      type: "fields",
      content: mergedFields,
    }, { onConflict: "encounter_id,type" });
}

// Merge arrays without duplicates (case-insensitive)
function mergeUnique(existing: string[], newItems: string[]): string[] {
  const lowerExisting = new Set(existing.map((s) => s.toLowerCase()));
  const result = [...existing];
  
  for (const item of newItems) {
    if (item && !lowerExisting.has(item.toLowerCase())) {
      result.push(item);
      lowerExisting.add(item.toLowerCase());
    }
  }
  
  return result;
}
