"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import EncounterHeader from "@/components/EncounterHeader";
import SafetyBanner from "@/components/SafetyBanner";
import ModeSwitcher from "@/components/ModeSwitcher";
import TranscriptPanel from "@/components/TranscriptPanel";
import FieldsPanel from "@/components/FieldsPanel";
import DraftNotePanel from "@/components/DraftNotePanel";
import ReferralPanel from "@/components/ReferralPanel";
import SummaryPanel from "@/components/SummaryPanel";
import {
  getEncounter,
  getTranscript,
  subscribeToTranscript,
  subscribeToEncounter,
  upsertTranscript,
  extractFields,
  generateDraftNote,
  searchReferrals,
  approveReferral,
  generateSummary,
  getSummaryPdfUrl,
  narrateExplanation,
  updateFields,
  assessUrgency,
} from "@/lib/api";
import type {
  Encounter,
  TranscriptChunk,
  ExtractedFields,
  DraftNote,
  Provider,
  PatientSummary,
  PanelMode,
  UrgencyAssessment,
} from "@/lib/types";
import { Loader2, HeartPulse, AlertTriangle, Stethoscope, Zap } from "lucide-react";
import Link from "next/link";

export default function EncounterPage() {
  const params = useParams();
  const encounterId = params.encounterId as string;

  // State
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [transcript, setTranscript] = useState<TranscriptChunk[]>([]);
  const [fields, setFields] = useState<ExtractedFields | null>(null);
  const [draftNote, setDraftNote] = useState<DraftNote | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [referrals, setReferrals] = useState<
    Array<{
      provider: Provider;
      referral: { reason: string; status: string };
      instructions: string;
    }>
  >([]);
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [urgencyAssessment, setUrgencyAssessment] =
    useState<UrgencyAssessment | null>(null);

  const [currentMode, setCurrentMode] = useState<PanelMode>("transcript");
  const [isLoading, setIsLoading] = useState(true);
  const [isAssessing, setIsAssessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const [encounterData, transcriptData] = await Promise.all([
          getEncounter(encounterId),
          getTranscript(encounterId),
        ]);

        if (!encounterData) {
          setError("Encounter not found");
          return;
        }

        setEncounter(encounterData);
        setTranscript(transcriptData);
      } catch (err) {
        console.error("Error loading encounter:", err);
        setError("Failed to load encounter");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [encounterId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!encounterId) return;

    const unsubTranscript = subscribeToTranscript(encounterId, (chunk) => {
      setTranscript((prev) => {
        if (prev.some((t) => t.id === chunk.id)) return prev;
        return [...prev, chunk];
      });
    });

    const unsubEncounter = subscribeToEncounter(encounterId, (updated) => {
      setEncounter(updated);
    });

    return () => {
      unsubTranscript();
      unsubEncounter();
    };
  }, [encounterId]);

  // Handlers
  const handleAddTranscript = useCallback(
    async (text: string) => {
      try {
        const result = await upsertTranscript(encounterId, text);
        return result;
      } catch (err) {
        console.error("Failed to add transcript:", err);
        throw err;
      }
    },
    [encounterId]
  );

  const handleAssessUrgency = useCallback(async () => {
    setIsAssessing(true);
    try {
      const result = await assessUrgency(encounterId);
      setUrgencyAssessment(result.assessment);
      const updated = await getEncounter(encounterId);
      if (updated) setEncounter(updated);
    } catch (err) {
      console.error("Failed to assess urgency:", err);
    } finally {
      setIsAssessing(false);
    }
  }, [encounterId]);

  const handleExtractFields = useCallback(async () => {
    try {
      const result = await extractFields(encounterId);
      setFields(result.fields);
    } catch (err) {
      console.error("Failed to extract fields:", err);
    }
  }, [encounterId]);

  const handleUpdateFields = useCallback(
    async (updatedFields: ExtractedFields) => {
      try {
        await updateFields(encounterId, updatedFields);
        setFields(updatedFields);
      } catch (err) {
        console.error("Failed to update fields:", err);
      }
    },
    [encounterId]
  );

  const handleGenerateDraftNote = useCallback(async () => {
    try {
      const result = await generateDraftNote(encounterId);
      setDraftNote(result.draftNote);
    } catch (err) {
      console.error("Failed to generate draft note:", err);
    }
  }, [encounterId]);

  const handleSearchReferrals = useCallback(
    async (specialty: string, location?: string) => {
      try {
        const result = await searchReferrals(encounterId, specialty, location);
        setProviders(result.providers);
      } catch (err) {
        console.error("Failed to search referrals:", err);
      }
    },
    [encounterId]
  );

  const handleApproveReferral = useCallback(
    async (provider: Provider, reason: string) => {
      try {
        const result = await approveReferral(encounterId, provider, reason);
        setReferrals((prev) => [...prev, result.referral]);
        setProviders((prev) => prev.filter((p) => p.id !== provider.id));
      } catch (err) {
        console.error("Failed to approve referral:", err);
      }
    },
    [encounterId]
  );

  const handleGenerateSummary = useCallback(async () => {
    try {
      const result = await generateSummary(encounterId);
      setSummary(result.summary);
      const updated = await getEncounter(encounterId);
      if (updated) setEncounter(updated);
    } catch (err) {
      console.error("Failed to generate summary:", err);
    }
  }, [encounterId]);

  const handleDownloadPdf = useCallback(async () => {
    try {
      const result = await getSummaryPdfUrl(encounterId);
      window.open(result.pdfUrl, "_blank");
    } catch (err) {
      console.error("Failed to download PDF:", err);
    }
  }, [encounterId]);

  const handleNarrate = useCallback(
    async (text: string) => {
      try {
        const result = await narrateExplanation(text, encounterId);
        if (result.audioUrl) {
          const audio = new Audio(result.audioUrl);
          audio.play();
        } else if (result.audioData) {
          const audio = new Audio(`data:audio/mpeg;base64,${result.audioData}`);
          audio.play();
        }
      } catch (err) {
        console.error("Failed to narrate:", err);
      }
    },
    [encounterId]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-50 min-h-screen">
        <div className="text-center">
          <div className="w-20 h-20 bg-primary-100 rounded-3xl flex items-center justify-center mx-auto mb-5 animate-pulse">
            <HeartPulse className="w-10 h-10 text-primary-600" />
          </div>
          <p className="text-ink-600 font-medium text-lg">Loading encounter...</p>
          <p className="text-ink-400 text-sm mt-1">Preparing your workspace</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !encounter) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-50 min-h-screen">
        <div className="text-center card p-10 max-w-md mx-4">
          <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-ink-800 mb-3">
            {error || "Encounter not found"}
          </h2>
          <p className="text-ink-500 mb-8">
            The encounter you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/dashboard" className="btn-primary">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Render panel based on current mode
  const renderPanel = () => {
    switch (currentMode) {
      case "transcript":
        return (
          <TranscriptPanel
            transcript={transcript}
            onAddTranscript={handleAddTranscript}
          />
        );
      case "fields":
        return (
          <FieldsPanel
            fields={fields}
            onExtract={handleExtractFields}
            onUpdate={handleUpdateFields}
          />
        );
      case "note":
        return (
          <DraftNotePanel
            draftNote={draftNote}
            onGenerate={handleGenerateDraftNote}
          />
        );
      case "referral":
        return (
          <ReferralPanel
            providers={providers}
            referrals={referrals}
            onSearch={handleSearchReferrals}
            onApprove={handleApproveReferral}
            recommendedSpecialist={encounter.recommended_specialist}
          />
        );
      case "summary":
        return (
          <SummaryPanel
            summary={summary}
            onGenerate={handleGenerateSummary}
            onDownloadPdf={handleDownloadPdf}
            onNarrate={handleNarrate}
          />
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-surface-50">
      <EncounterHeader encounter={encounter} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Safety Banner, Assess Button & Mode Switcher */}
        <div className="bg-white border-b border-surface-200 px-6 py-4">
          <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <SafetyBanner
                status={encounter.status}
                showDraftWarning={currentMode === "note"}
              />

              {/* Assess Urgency Button */}
              {transcript.length >= 2 && (
                <button
                  onClick={handleAssessUrgency}
                  disabled={isAssessing}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    isAssessing
                      ? "bg-surface-100 text-ink-400 cursor-wait"
                      : "bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-soft hover:shadow-glow-accent"
                  }`}
                >
                  {isAssessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Assessing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Assess Urgency
                    </>
                  )}
                </button>
              )}
            </div>

            <ModeSwitcher currentMode={currentMode} onModeChange={setCurrentMode} />
          </div>
        </div>

        {/* Urgency Assessment Card (if assessed) */}
        {urgencyAssessment && urgencyAssessment.red_flags.length > 0 && (
          <div
            className={`px-6 py-4 border-b ${
              urgencyAssessment.level === "emergent"
                ? "bg-red-50 border-red-100"
                : urgencyAssessment.level === "urgent"
                ? "bg-amber-50 border-amber-100"
                : "bg-sage-50 border-sage-100"
            }`}
          >
            <div className="max-w-screen-2xl mx-auto flex items-start gap-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  urgencyAssessment.level === "emergent"
                    ? "bg-red-100"
                    : urgencyAssessment.level === "urgent"
                    ? "bg-amber-100"
                    : "bg-sage-100"
                }`}
              >
                <AlertTriangle
                  className={`w-5 h-5 ${
                    urgencyAssessment.level === "emergent"
                      ? "text-red-600"
                      : urgencyAssessment.level === "urgent"
                      ? "text-amber-600"
                      : "text-sage-600"
                  }`}
                />
              </div>
              <div className="flex-1">
                <p
                  className={`font-semibold ${
                    urgencyAssessment.level === "emergent"
                      ? "text-red-800"
                      : urgencyAssessment.level === "urgent"
                      ? "text-amber-800"
                      : "text-sage-800"
                  }`}
                >
                  Red Flags Detected
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {urgencyAssessment.red_flags.map((flag, i) => (
                    <span
                      key={i}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        urgencyAssessment.level === "emergent"
                          ? "bg-red-100 text-red-700"
                          : urgencyAssessment.level === "urgent"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-sage-100 text-sage-700"
                      }`}
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              </div>
              {urgencyAssessment.specialist_needed && (
                <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl">
                  <Stethoscope className="w-4 h-4" />
                  <span className="text-sm font-semibold">
                    Refer to {urgencyAssessment.recommended_specialist}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Panel */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full max-w-screen-2xl mx-auto">{renderPanel()}</div>
        </div>
      </div>
    </div>
  );
}
