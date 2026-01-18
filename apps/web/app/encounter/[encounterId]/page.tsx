"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import EncounterHeader from "@/components/EncounterHeader";
import Sidebar from "@/components/Sidebar";
import TranscriptPanel from "@/components/TranscriptPanel";
import FieldsPanel from "@/components/FieldsPanel";
import DraftNotePanel from "@/components/DraftNotePanel";
import ReferralPanel from "@/components/ReferralPanel";
import SummaryPanel from "@/components/SummaryPanel";
import ClinicalFocusPanel from "@/components/ClinicalFocusPanel";
import { RealtimeNotesPanel } from "@/components/RealtimeNotesPanel";
import ReferralPdfEditor from "@/components/ReferralPdfEditor";
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
  generateDiagnosis,
  generateAll,
  getSmartClinicalAnalysis,
  generateReferralPdf,
  generateLiveQuestions,
  updateEncounterUrgency,
} from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ToastProvider";
import type {
  Encounter,
  TranscriptChunk,
  ExtractedFields,
  DraftNote,
  Provider,
  PatientSummary,
  PanelMode,
  UrgencyAssessment,
  DiagnosisResult,
  UrgencyLevel,
} from "@/lib/types";
import { 
  Loader2, 
  Sparkles,
  Brain,
  ShieldAlert,
  Activity,
  ChevronDown,
} from "lucide-react";

export default function EncounterPage() {
  const params = useParams();
  const encounterId = params.encounterId as string;
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();

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
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [billingCodes, setBillingCodes] = useState<any | null>(null);
  const [clinicalFocus, setClinicalFocus] = useState<any | null>(null);
  const [urgencyAssessment, setUrgencyAssessment] =
    useState<UrgencyAssessment | null>(null);
  const [isLoadingClinicalFocus, setIsLoadingClinicalFocus] = useState(false);
  const [referralPdf, setReferralPdf] = useState<{ pdfBase64: string; content: any } | null>(null);
  const [isGeneratingReferralPdf, setIsGeneratingReferralPdf] = useState(false);
  const [liveQuestions, setLiveQuestions] = useState<any[]>([]);
  const [isGeneratingLiveQuestions, setIsGeneratingLiveQuestions] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const questionGenerationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [templateCustomFields, setTemplateCustomFields] = useState<any[]>([]);
  const [templateQuestions, setTemplateQuestions] = useState<any[]>([]);

  const [currentMode, setCurrentMode] = useState<PanelMode>("transcript");
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAiMenu, setShowAiMenu] = useState(false);
  
  // LiveKit state
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);

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

        // Load template custom fields if template_id exists
        if (encounterData.template_id) {
          const { data: template } = await supabase
            .from("ehr_templates")
            .select("custom_fields")
            .eq("id", encounterData.template_id)
            .single();
          
          if (template?.custom_fields) {
            setTemplateCustomFields(template.custom_fields);
          }

          // Load questions generated from this template
          const { data: templateQuestionsData } = await supabase
            .from("generated_questions")
            .select("questions")
            .eq("template_id", encounterData.template_id)
            .eq("encounter_id", encounterId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          
          if (templateQuestionsData?.questions) {
            setTemplateQuestions(templateQuestionsData.questions);
          }
        }

        // Load artifacts
        const { data: artifacts } = await supabase
          .from("artifacts")
          .select("content, type")
          .eq("encounter_id", encounterId);

        console.log(`[DEBUG] Loaded ${artifacts?.length || 0} artifacts:`, artifacts?.map(a => a.type));

        if (artifacts) {
          artifacts.forEach(art => {
            if (art.type === "draft_note") setDraftNote(art.content as DraftNote);
            if (art.type === "summary") setSummary(art.content as PatientSummary);
            if (art.type === "diagnosis") setDiagnosis(art.content as DiagnosisResult);
            if (art.type === "billing_codes") setBillingCodes(art.content);
            if (art.type === "clinical_focus") setClinicalFocus(art.content);
            if (art.type === "referral_pdf") {
              const pdfData = art.content as any;
              if (pdfData.pdf_base64) {
                setReferralPdf({ pdfBase64: pdfData.pdf_base64, content: pdfData });
              }
            }
            if (art.type === "live_questions") {
              const questionsData = art.content as any;
              if (questionsData.questions) {
                console.log(`[LIVE QUESTIONS] Loaded ${questionsData.questions.length} questions from artifacts`);
                setLiveQuestions(questionsData.questions);
              }
            }
          });
        }
      } catch (err) {
        console.error("Error loading encounter:", err);
        setError("Failed to load encounter");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [encounterId]);

  // Subscriptions
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

    const artifactsChannel = supabase
      .channel(`artifacts:${encounterId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "artifacts", filter: `encounter_id=eq.${encounterId}` },
        async (payload) => {
          if (payload.new) {
            const p = payload.new as any;
            if (p.type === "draft_note") setDraftNote(p.content as DraftNote);
            else if (p.type === "summary") setSummary(p.content as PatientSummary);
            else if (p.type === "billing_codes") setBillingCodes(p.content);
            else if (p.type === "clinical_focus") setClinicalFocus(p.content);
            else if (p.type === "referral_pdf") {
              const pdfData = p.content as any;
              if (pdfData.pdf_base64) {
                setReferralPdf({ pdfBase64: pdfData.pdf_base64, content: pdfData });
              }
            }
            else if (p.type === "live_questions") {
              const questionsData = p.content as any;
              if (questionsData.questions) {
                console.log(`[LIVE QUESTIONS] Real-time update: ${questionsData.questions.length} questions`);
                setLiveQuestions(questionsData.questions);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      unsubTranscript();
      unsubEncounter();
      artifactsChannel.unsubscribe();
    };
  }, [encounterId]);

  // AI Handlers
  const handleAnalyzeEncounter = useCallback(async () => {
    setIsAnalyzing(true);
    setShowAiMenu(false);
    try {
      const result = await analyzeEncounter(encounterId);
      if (result.success && result.analysis) {
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
        const updated = await getEncounter(encounterId);
        if (updated) setEncounter(updated);
        showSuccess("Encounter analyzed successfully");
      }
    } catch (err) {
      console.error("Failed to analyze:", err);
      showError("Failed to analyze encounter. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [encounterId]);

  const handleGenerateAll = useCallback(async () => {
    setIsGeneratingAll(true);
    setShowAiMenu(false);
    try {
      const result = await generateAll(encounterId);
      setDraftNote(result.draftNote);
      setSummary(result.summary);
      if (result.billingCodes) setBillingCodes(result.billingCodes);
      const updated = await getEncounter(encounterId);
      if (updated) setEncounter(updated);
      showSuccess("All documents generated successfully");
    } catch (err) {
      console.error("Failed to generate all:", err);
      showError("Failed to generate documents. Please try again.");
    } finally {
      setIsGeneratingAll(false);
    }
  }, [encounterId]);

  const handleAddTranscript = useCallback(async (text: string) => {
    const result = await upsertTranscript(encounterId, text);
    // Mark as transcribing when new transcript arrives
    setIsTranscribing(true);
    // Clear existing timer
    if (questionGenerationTimerRef.current) {
      clearTimeout(questionGenerationTimerRef.current);
    }
    // Set timer to auto-generate questions after 10 seconds of no new transcript
    questionGenerationTimerRef.current = setTimeout(() => {
      setIsTranscribing(false);
      // Auto-generate questions when transcription stops
      handleGenerateLiveQuestions();
    }, 10000); // 10 seconds after last transcript
    return result;
  }, [encounterId]);

  // Auto-generate questions while actively transcribing (every 15 seconds)
  useEffect(() => {
    if (!isTranscribing) return;

    const interval = setInterval(() => {
      console.log('[AUTO] Generating questions during active transcription...');
      handleGenerateLiveQuestions();
    }, 15000); // Generate every 15 seconds while transcribing

    return () => clearInterval(interval);
  }, [isTranscribing, encounterId]);
  const handleExtractFields = useCallback(async () => {
    const result = await extractFields(encounterId);
    setFields(result.fields);
  }, [encounterId]);
  const handleUpdateFields = useCallback(async (f: ExtractedFields) => {
    try {
      await updateFields(encounterId, f);
      setFields(f);
      showSuccess("Fields updated successfully");
    } catch (err) {
      console.error("Failed to update fields:", err);
      showError("Failed to update fields. Please try again.");
    }
  }, [encounterId, showError, showSuccess]);
  const handleGenerateDraftNote = useCallback(async () => {
    const result = await generateDraftNote(encounterId);
    setDraftNote(result.draftNote);
  }, [encounterId]);
  const handleSearchReferrals = useCallback(async (s: string, l?: string) => {
    const result = await searchReferrals(encounterId, s, l);
    setProviders(result.providers);
  }, [encounterId]);
  const handleApproveReferral = useCallback(async (p: Provider, r: string) => {
    const result = await approveReferral(encounterId, p, r);
    setReferrals((prev) => [...prev, result.referral]);
    setProviders((prev) => prev.filter((pr) => pr.id !== p.id));
  }, [encounterId]);
  const handleGenerateSummary = useCallback(async () => {
    const result = await generateSummary(encounterId);
    setSummary(result.summary);
    const updated = await getEncounter(encounterId);
    if (updated) setEncounter(updated);
  }, [encounterId]);
  const handleGenerateDiagnosis = useCallback(async () => {
    const result = await generateDiagnosis(encounterId);
    setDiagnosis(result.diagnosis);
  }, [encounterId]);
  
  const handleRefreshClinicalFocus = useCallback(async () => {
    setIsLoadingClinicalFocus(true);
    try {
      const result = await getSmartClinicalAnalysis(encounterId);
      setClinicalFocus(result.clinicalFocus);
      showSuccess("Clinical focus updated successfully");
    } catch (err) {
      console.error("Failed to get clinical focus:", err);
      showError("Failed to refresh clinical focus. Please try again.");
    } finally {
      setIsLoadingClinicalFocus(false);
    }
  }, [encounterId, showError, showSuccess]);

  const handleGenerateReferralPdf = useCallback(async (specialistType: string) => {
    setIsGeneratingReferralPdf(true);
    try {
      const result = await generateReferralPdf(encounterId, specialistType);
      setReferralPdf({ pdfBase64: result.pdfBase64, content: result.referralContent });
      // Switch to referral panel to show the PDF editor
      setCurrentMode("referral");
      showSuccess("Referral PDF generated successfully");
    } catch (err) {
      console.error("Failed to generate referral PDF:", err);
      showError("Failed to generate referral PDF. Please try again.");
    } finally {
      setIsGeneratingReferralPdf(false);
    }
  }, [encounterId, showError, showSuccess]);

  const handleSaveReferralPdf = useCallback(async (content: any) => {
    try {
      // Save updated content back to artifact
      const { error } = await supabase
        .from("artifacts")
        .update({
          content: {
          ...content,
          pdf_base64: referralPdf?.pdfBase64,
        },
      })
      .eq("encounter_id", encounterId)
      .eq("type", "referral_pdf");
    
      if (error) {
        throw new Error("Failed to save referral PDF");
      }
      showSuccess("Referral PDF saved successfully");
    } catch (err) {
      console.error("Failed to save referral PDF:", err);
      showError("Failed to save referral PDF. Please try again.");
      throw err;
    }
  }, [encounterId, referralPdf, showError, showSuccess]);

  const handleSendReferralPdf = useCallback(async (content: any) => {
    // In a real implementation, this would send the PDF via email or API
    console.log("Sending referral PDF:", content);
    showSuccess("Referral PDF sent successfully! (This is a demo - in production, this would send via email/API)");
  }, [showSuccess]);


  const handleUpdateBillingCodes = useCallback(async (codes: any) => {
    try {
      await supabase
        .from("artifacts")
        .upsert({
          encounter_id: encounterId,
          type: "billing_codes",
          content: codes,
        }, { onConflict: "encounter_id,type" });
      
      setBillingCodes(codes);
    } catch (err) {
      console.error("Failed to update billing codes:", err);
      throw err;
    }
  }, [encounterId]);

  const handleGenerateLiveQuestions = useCallback(async () => {
    if (isGeneratingLiveQuestions) return; // Prevent concurrent calls
    setIsGeneratingLiveQuestions(true);
    try {
      console.log('[AUTO] Generating live questions...');
      const result = await generateLiveQuestions(encounterId);
      console.log('[AUTO] Generated questions:', result.questions?.length);
      setLiveQuestions(result.questions || []);
      showSuccess("Live questions generated successfully");
    } catch (err) {
      console.error("Failed to generate live questions:", err);
      showError("Failed to generate live questions. Please try again.");
    } finally {
      setIsGeneratingLiveQuestions(false);
    }
  }, [encounterId, isGeneratingLiveQuestions, showError, showSuccess]);

  const handleUrgencyChange = useCallback(async (urgency: UrgencyLevel) => {
    try {
      await updateEncounterUrgency(encounterId, urgency);
      // Update local state
      setEncounter((prev) => prev ? { ...prev, urgency } : null);
      showSuccess("Urgency level updated successfully");
    } catch (err) {
      console.error("Failed to update urgency:", err);
      showError("Failed to update urgency level. Please try again.");
      throw err;
    }
  }, [encounterId, showError, showSuccess]);
  const handleDownloadPdf = useCallback(async () => {
    const result = await getSummaryPdfUrl(encounterId);
    window.open(result.pdfUrl, "_blank");
  }, [encounterId]);
  const handleNarrate = useCallback(async (t: string) => {
    const result = await narrateExplanation(t, encounterId);
    if (result.audioUrl || result.audioData) {
      new Audio(result.audioUrl || `data:audio/mpeg;base64,${result.audioData}`).play();
    }
  }, [encounterId]);

  if (isLoading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <Activity className="w-12 h-12 text-primary-500 animate-pulse" />
            <div className="absolute -inset-4 bg-primary-100 rounded-full blur-2xl opacity-50 -z-10" />
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <h2 className="text-xl font-bold text-ink-900 tracking-tight">Initializing Encounter</h2>
            <p className="text-sm text-ink-400">Securing your clinical workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !encounter) {
    return (
      <div className="h-screen flex items-center justify-center p-6 bg-surface-50">
        <div className="max-w-md w-full bg-white rounded-4xl shadow-soft-xl border border-surface-200 p-10 text-center">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-ink-900 mb-2">Access Denied</h2>
          <p className="text-ink-500 mb-8">{error || "Encounter record not found."}</p>
          <button onClick={() => window.location.href = "/dashboard"} className="w-full py-4 bg-ink-900 text-white font-bold rounded-2xl hover:bg-ink-800 transition-colors">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans text-ink-900">
      {/* Side Navigation */}
      <Sidebar currentMode={currentMode} onModeChange={setCurrentMode} encounterId={encounterId} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Unified Header */}
        <EncounterHeader encounter={encounter} onUrgencyChange={handleUrgencyChange} />

        {/* Dynamic Action & Info Bar */}
        <div className="h-16 border-b border-surface-100 flex items-center justify-between px-8 bg-surface-50/50">
          <div className="flex items-center gap-4">
            {/* Urgency Alert Popover Trigger (if red flags) */}
            {urgencyAssessment?.red_flags?.length ? (
              <button className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl border border-red-100 text-xs font-bold animate-pulse">
                <ShieldAlert className="w-4 h-4" />
                {urgencyAssessment.red_flags.length} CLINICAL RED FLAGS
              </button>
            ) : analysisComplete ? (
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                <Sparkles className="w-3.5 h-3.5" />
                AI Analysis Complete
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {/* AI Assistant Menu */}
            <div className="relative">
              <button 
                onClick={() => setShowAiMenu(!showAiMenu)}
                disabled={isAnalyzing || isGeneratingAll}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm transition-all
                  ${(isAnalyzing || isGeneratingAll) 
                    ? "bg-surface-100 text-ink-400 cursor-not-allowed" 
                    : "bg-primary-500 text-white shadow-glow hover:bg-primary-600"}
                `}
              >
                {(isAnalyzing || isGeneratingAll) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4" />
                )}
                <span>AI Assistant</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showAiMenu ? "rotate-180" : ""}`} />
              </button>

              {showAiMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-3xl shadow-soft-xl border border-surface-200 py-3 z-50 animate-slide-up">
                  <div className="px-4 py-2 mb-2 border-b border-surface-100">
                    <p className="text-2xs font-bold text-ink-400 uppercase tracking-widest">Encounter Intelligence</p>
                  </div>
                  
                  <button 
                    onClick={handleAnalyzeEncounter}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary-50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink-900">Comprehensive Analysis</p>
                      <p className="text-2xs text-ink-400">Extract clinical data & check urgency</p>
                    </div>
                  </button>

                  <button 
                    onClick={handleGenerateAll}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent-50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-xl bg-accent-100 text-accent-600 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink-900">Generate All Artifacts</p>
                      <p className="text-2xs text-ink-400">SOAP note & Patient summary</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto bg-white relative">
          <div className="h-full">
            {currentMode === "transcript" ? (
              <div className="flex h-full divide-x divide-surface-100">
                <div className="flex-1 min-w-0">
                  <TranscriptPanel
                    transcript={transcript}
                    onAddTranscript={handleAddTranscript}
                    livekitToken={livekitToken}
                    roomName={roomName}
                  />
                </div>
                <div className="w-[320px] shrink-0 bg-surface-50/30">
                  <RealtimeNotesPanel 
                    className="h-full" 
                    clinicalFocus={clinicalFocus} 
                    encounterId={encounterId} 
                    liveQuestions={liveQuestions}
                    templateQuestions={templateQuestions}
                    onGenerateQuestions={handleGenerateLiveQuestions}
                    isGeneratingQuestions={isGeneratingLiveQuestions}
                  />
                </div>
              </div>
            ) : currentMode === "fields" ? (
              <FieldsPanel 
                fields={fields} 
                encounter={encounter} 
                onExtract={handleExtractFields} 
                onUpdate={handleUpdateFields}
                customFields={templateCustomFields}
              />
            ) : currentMode === "note" ? (
              <DraftNotePanel draftNote={draftNote} onGenerate={handleGenerateDraftNote} />
            ) : currentMode === "referral" ? (
              referralPdf ? (
                <ReferralPdfEditor
                  pdfBase64={referralPdf.pdfBase64}
                  referralContent={referralPdf.content}
                  encounterId={encounterId}
                  onSave={handleSaveReferralPdf}
                  onSend={handleSendReferralPdf}
                  onClose={() => setReferralPdf(null)}
                />
              ) : (
                <ReferralPanel 
                  providers={providers} 
                  referrals={referrals} 
                  onSearch={handleSearchReferrals} 
                  onApprove={handleApproveReferral} 
                  recommendedSpecialist={encounter.recommended_specialist}
                  encounterId={encounterId}
                  onGenerateReferralPdf={handleGenerateReferralPdf}
                  isGeneratingPdf={isGeneratingReferralPdf}
                />
              )
            ) : currentMode === "clinical-focus" ? (
              <ClinicalFocusPanel clinicalFocus={clinicalFocus} onRefresh={handleRefreshClinicalFocus} isLoading={isLoadingClinicalFocus} />
            ) : (
              <SummaryPanel 
                summary={summary} 
                diagnosis={diagnosis} 
                billingCodes={billingCodes} 
                onGenerate={handleGenerateSummary} 
                onGenerateDiagnosis={handleGenerateDiagnosis} 
                onDownloadPdf={handleDownloadPdf} 
                onNarrate={handleNarrate} 
                isGeneratingDiagnosis={false}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
