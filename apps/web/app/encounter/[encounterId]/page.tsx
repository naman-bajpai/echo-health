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
} from "@/lib/api";
import type {
  Encounter,
  TranscriptChunk,
  ExtractedFields,
  DraftNote,
  Provider,
  PatientSummary,
  PanelMode,
  SpeakerRole,
} from "@/lib/types";
import { Loader2 } from "lucide-react";

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

  const [currentMode, setCurrentMode] = useState<PanelMode>("transcript");
  const [currentSpeaker, setCurrentSpeaker] = useState<SpeakerRole>("staff");
  const [isLoading, setIsLoading] = useState(true);
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
      setTranscript((prev) => [...prev, chunk]);
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
        await upsertTranscript(encounterId, currentSpeaker, text);
      } catch (err) {
        console.error("Failed to add transcript:", err);
      }
    },
    [encounterId, currentSpeaker]
  );

  const handleExtractFields = useCallback(async () => {
    try {
      const result = await extractFields(encounterId);
      setFields(result.fields);
    } catch (err) {
      console.error("Failed to extract fields:", err);
    }
  }, [encounterId]);

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
      // Refresh encounter to get updated status
      const updated = await getEncounter(encounterId);
      if (updated) setEncounter(updated);
    } catch (err) {
      console.error("Failed to generate summary:", err);
    }
  }, [encounterId]);

  const handleDownloadPdf = useCallback(async () => {
    try {
      const result = await getSummaryPdfUrl(encounterId);
      // Open PDF in new tab
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
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading encounter...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !encounter) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || "Encounter not found"}</p>
          <a href="/" className="btn-primary">
            Go Home
          </a>
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
            currentSpeaker={currentSpeaker}
            onSpeakerChange={setCurrentSpeaker}
            onAddTranscript={handleAddTranscript}
          />
        );
      case "fields":
        return (
          <FieldsPanel
            fields={fields}
            onExtract={handleExtractFields}
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
    <div className="flex-1 flex flex-col h-screen">
      <EncounterHeader encounter={encounter} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Safety Banner & Mode Switcher */}
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <SafetyBanner
              status={encounter.status}
              showDraftWarning={currentMode === "note"}
            />
            <ModeSwitcher
              currentMode={currentMode}
              onModeChange={setCurrentMode}
            />
          </div>
        </div>

        {/* Main Panel */}
        <div className="flex-1 overflow-hidden bg-gray-50">
          <div className="h-full overflow-y-auto">
            {renderPanel()}
          </div>
        </div>
      </div>
    </div>
  );
}
