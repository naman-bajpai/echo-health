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
  analyzeEncounter,
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
import { 
  Loader2, 
  AlertTriangle, 
  Stethoscope, 
  Brain, 
  Sparkles,
  ShieldAlert,
  Activity,
  ArrowLeft,
} from "lucide-react";
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // LiveKit state (loaded from sessionStorage if available)
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);

  // Load LiveKit credentials from sessionStorage
  useEffect(() => {
    const storedToken = sessionStorage.getItem(`livekit_token_${encounterId}`);
    const storedRoom = sessionStorage.getItem(`livekit_room_${encounterId}`);
    if (storedToken) setLivekitToken(storedToken);
    if (storedRoom) setRoomName(storedRoom);
  }, [encounterId]);

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

  // Comprehensive AI analysis of entire encounter
  const handleAnalyzeEncounter = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeEncounter(encounterId);
      
      if (result.success && result.analysis) {
        // Update fields from analysis
        const analysis = result.analysis;
        
        setFields({
          patient_name: analysis.patient_info?.name,
          dob: analysis.patient_info?.dob,
          chief_complaint: analysis.visit?.chief_complaint,
          reason_for_visit: analysis.visit?.reason_for_visit,
          symptoms: analysis.clinical?.symptoms?.map((s: any) => s.symptom) || [],
          symptom_duration: analysis.clinical?.symptoms?.[0]?.duration,
          symptom_severity: analysis.clinical?.symptoms?.[0]?.severity,
          medications: analysis.clinical?.medications?.map((m: any) => m.name) || [],
          allergies: analysis.clinical?.allergies || [],
          medical_history: analysis.clinical?.medical_history || [],
          vital_signs: analysis.clinical?.vital_signs,
          urgency_indicators: analysis.urgency?.red_flags || [],
        });
        
        // Update urgency assessment
        if (analysis.urgency) {
          setUrgencyAssessment({
            level: analysis.urgency.level,
            reason: analysis.urgency.reason,
            specialist_needed: analysis.specialist?.needed || false,
            recommended_specialist: analysis.specialist?.type,
            red_flags: analysis.urgency.red_flags || [],
          });
        }
        
        setAnalysisComplete(true);
        
        // Refresh encounter data
        const updated = await getEncounter(encounterId);
        if (updated) setEncounter(updated);
      }
    } catch (err) {
      console.error("Failed to analyze encounter:", err);
    } finally {
      setIsAnalyzing(false);
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-28 h-28 mx-auto mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-indigo-100 rounded-3xl animate-pulse"></div>
            <div className="absolute inset-3 bg-white rounded-3xl flex items-center justify-center shadow-lg">
              <Activity className="w-14 h-14 text-primary-600 animate-pulse" />
            </div>
            <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-xl">
              <Loader2 className="w-7 h-7 animate-spin text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-ink-900 mb-2">Loading Encounter</h2>
          <p className="text-ink-600 mb-1">Preparing your documentation workspace</p>
          <p className="text-ink-400 text-sm">Please wait...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !encounter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-red-100">
            <div className="bg-gradient-to-br from-red-50 to-orange-50 p-8 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <AlertTriangle className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-ink-900 mb-3">
                Encounter Not Found
              </h2>
              <p className="text-ink-600 leading-relaxed">
                {error || "The encounter you're looking for doesn't exist or has been removed from the system."}
              </p>
            </div>
            <div className="p-8">
              <Link 
                href="/dashboard" 
                className="group w-full h-14 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                Return to Dashboard
              </Link>
            </div>
          </div>
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
            livekitToken={livekitToken}
            roomName={roomName}
          />
        );
      case "fields":
        return (
          <FieldsPanel
            fields={fields}
            encounter={encounter}
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
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50/30 via-white to-indigo-50/30">
      {/* Header */}
      <EncounterHeader encounter={encounter} />

      {/* Control Bar - Safety Banner, AI Analysis & Mode Switcher */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-blue-100 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Left: Safety Banner & AI Analysis Button */}
            <div className="flex items-center gap-4 flex-wrap">
              <SafetyBanner
                status={encounter.status}
                showDraftWarning={currentMode === "note"}
              />

              {/* Analyze with AI Button */}
              {transcript.length >= 1 && (
                <button
                  onClick={handleAnalyzeEncounter}
                  disabled={isAnalyzing}
                  className={`group flex items-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-md hover:shadow-lg ${
                    isAnalyzing
                      ? "bg-slate-100 text-slate-400 cursor-wait shadow-none"
                      : analysisComplete
                      ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                      : "bg-gradient-to-r from-primary-500 via-primary-600 to-indigo-600 text-white hover:from-primary-600 hover:via-primary-700 hover:to-indigo-700"
                  }`}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Analyzing Encounter...</span>
                    </>
                  ) : analysisComplete ? (
                    <>
                      <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      <span>Re-Analyze with AI</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span>Analyze with AI</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Right: Mode Switcher */}
            <ModeSwitcher currentMode={currentMode} onModeChange={setCurrentMode} />
          </div>
        </div>
      </div>

      {/* Analysis Complete Banner */}
      {analysisComplete && !urgencyAssessment?.red_flags?.length && (
        <div className="bg-gradient-to-r from-primary-50 via-blue-50 to-indigo-50 border-b border-primary-200 shadow-sm">
          <div className="max-w-screen-2xl mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-primary-900 font-bold text-base">AI Analysis Complete</p>
                <p className="text-primary-700 text-sm">Review extracted clinical data in the Fields tab</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Urgency Assessment Card (if assessed with red flags) */}
      {urgencyAssessment && urgencyAssessment.red_flags && urgencyAssessment.red_flags.length > 0 && (
        <div
          className={`border-b shadow-md ${
            urgencyAssessment.level === "emergent"
              ? "bg-gradient-to-r from-red-50 via-red-100 to-orange-50 border-red-200"
              : urgencyAssessment.level === "urgent"
              ? "bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border-amber-200"
              : "bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200"
          }`}
        >
          <div className="max-w-screen-2xl mx-auto px-6 py-5">
            <div className="flex items-start gap-5">
              {/* Icon */}
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                  urgencyAssessment.level === "emergent"
                    ? "bg-gradient-to-br from-red-500 to-red-600"
                    : urgencyAssessment.level === "urgent"
                    ? "bg-gradient-to-br from-amber-500 to-orange-600"
                    : "bg-gradient-to-br from-emerald-500 to-teal-600"
                }`}
              >
                <ShieldAlert className="w-7 h-7 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3
                    className={`text-xl font-bold ${
                      urgencyAssessment.level === "emergent"
                        ? "text-red-900"
                        : urgencyAssessment.level === "urgent"
                        ? "text-amber-900"
                        : "text-emerald-900"
                    }`}
                  >
                    Clinical Red Flags Detected
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                      urgencyAssessment.level === "emergent"
                        ? "bg-red-200 text-red-900"
                        : urgencyAssessment.level === "urgent"
                        ? "bg-amber-200 text-amber-900"
                        : "bg-emerald-200 text-emerald-900"
                    }`}
                  >
                    {urgencyAssessment.level}
                  </span>
                </div>
                
                <p
                  className={`text-sm mb-4 ${
                    urgencyAssessment.level === "emergent"
                      ? "text-red-800"
                      : urgencyAssessment.level === "urgent"
                      ? "text-amber-800"
                      : "text-emerald-800"
                  }`}
                >
                  {urgencyAssessment.reason}
                </p>

                {/* Red Flags */}
                <div className="flex flex-wrap gap-2.5">
                  {urgencyAssessment.red_flags.map((flag, i) => (
                    <span
                      key={i}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold shadow-sm ${
                        urgencyAssessment.level === "emergent"
                          ? "bg-white border-2 border-red-300 text-red-800"
                          : urgencyAssessment.level === "urgent"
                          ? "bg-white border-2 border-amber-300 text-amber-800"
                          : "bg-white border-2 border-emerald-300 text-emerald-800"
                      }`}
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Specialist Recommendation */}
              {urgencyAssessment.specialist_needed && (
                <div className="flex items-center gap-3 px-5 py-3 bg-white rounded-2xl border-2 border-purple-200 shadow-md flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-purple-600 font-bold uppercase tracking-wide">Refer to</p>
                    <p className="text-sm font-bold text-purple-900">
                      {urgencyAssessment.recommended_specialist}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Panel */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-screen-2xl mx-auto">{renderPanel()}</div>
      </div>
    </div>
  );
}
