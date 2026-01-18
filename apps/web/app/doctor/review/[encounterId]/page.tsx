"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  FileText,
  Stethoscope,
  AlertTriangle,
  CheckCircle,
  Download,
  BadgeCheck,
  Activity,
  MessageSquare,
  ClipboardList,
  Brain,
  Loader2,
  Save,
} from "lucide-react";
import type { Encounter, DraftNote, PatientSummary, DiagnosisResult, TranscriptChunk } from "@/lib/types";

export default function DoctorReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const encounterId = params.encounterId as string;
  const { user, isLoading: authLoading } = useAuth();

  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [transcript, setTranscript] = useState<TranscriptChunk[]>([]);
  const [draftNote, setDraftNote] = useState<DraftNote | null>(null);
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [billingCodes, setBillingCodes] = useState<any | null>(null);
  const [clinicalFocus, setClinicalFocus] = useState<any | null>(null);
  const [fields, setFields] = useState<any | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "transcript" | "soap" | "clinical" | "billing">("overview");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!encounterId) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load encounter
        const { data: encounterData } = await supabase
          .from("encounters")
          .select("*")
          .eq("id", encounterId)
          .single();

        if (encounterData) {
          setEncounter(encounterData);
        }

        // Load transcript
        const { data: transcriptData } = await supabase
          .from("transcript_chunks")
          .select("*")
          .eq("encounter_id", encounterId)
          .order("created_at", { ascending: true });

        if (transcriptData) {
          setTranscript(transcriptData);
        }

        // Load artifacts
        const { data: artifacts } = await supabase
          .from("artifacts")
          .select("type, content")
          .eq("encounter_id", encounterId);

        if (artifacts) {
          artifacts.forEach((art: any) => {
            if (art.type === "draft_note") setDraftNote(art.content);
            if (art.type === "summary") setSummary(art.content);
            if (art.type === "diagnosis") setDiagnosis(art.content);
            if (art.type === "billing_codes") setBillingCodes(art.content);
            if (art.type === "clinical_focus") setClinicalFocus(art.content);
            if (art.type === "fields") setFields(art.content);
          });
        }
      } catch (err) {
        console.error("Error loading encounter:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [encounterId]);

  const handleMarkReviewed = async () => {
    setIsSaving(true);
    try {
      await supabase
        .from("encounters")
        .update({ status: "reviewed" })
        .eq("id", encounterId);

      // Save doctor notes if any
      if (doctorNotes.trim()) {
        await supabase.from("artifacts").upsert({
          encounter_id: encounterId,
          type: "doctor_notes",
          content: { notes: doctorNotes, reviewed_at: new Date().toISOString(), reviewed_by: user?.id },
        }, { onConflict: "encounter_id,type" });
      }

      router.push("/doctor");
    } catch (err) {
      console.error("Error marking as reviewed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="text-ink-500">Loading encounter details...</p>
        </div>
      </div>
    );
  }

  if (!encounter) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-50">
        <div className="text-center">
          <p className="text-ink-500 mb-4">Encounter not found</p>
          <Link href="/doctor" className="text-primary-500 font-bold">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="bg-white border-b border-surface-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/doctor"
                className="w-10 h-10 bg-surface-100 rounded-xl flex items-center justify-center hover:bg-surface-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-ink-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-ink-900">Patient Review</h1>
                <p className="text-sm text-ink-400">{encounter.patient_name || "Unknown Patient"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.open(`/api/supabase/generate-pdf?encounterId=${encounterId}`, "_blank")}
                className="flex items-center gap-2 px-4 py-2 bg-surface-100 text-ink-600 rounded-xl font-bold text-sm hover:bg-surface-200 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              {encounter.status !== "reviewed" && (
                <button
                  onClick={handleMarkReviewed}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <BadgeCheck className="w-4 h-4" />
                  )}
                  Mark as Reviewed
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Patient Info Card */}
        <div className="bg-white rounded-3xl p-6 border border-surface-200 shadow-soft mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
                <User className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink-900">{encounter.patient_name || "Unknown Patient"}</h2>
                <p className="text-ink-500">{encounter.reason_for_visit || "No reason specified"}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-ink-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(encounter.created_at).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(encounter.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-xl text-sm font-bold uppercase ${
                encounter.urgency === "emergent" ? "bg-red-100 text-red-700" :
                encounter.urgency === "urgent" ? "bg-amber-100 text-amber-700" :
                "bg-emerald-100 text-emerald-700"
              }`}>
                {encounter.urgency}
              </span>
              {encounter.status === "reviewed" && (
                <span className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold">
                  <BadgeCheck className="w-4 h-4" />
                  Reviewed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: "overview", label: "Overview", icon: Activity },
            { id: "transcript", label: "Transcript", icon: MessageSquare },
            { id: "soap", label: "SOAP Note", icon: FileText },
            { id: "clinical", label: "Clinical Analysis", icon: Brain },
            { id: "billing", label: "Billing Codes", icon: ClipboardList },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all ${
                activeTab === tab.id
                  ? "bg-primary-500 text-white shadow-glow"
                  : "bg-white text-ink-600 hover:bg-surface-100"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Summary */}
                {summary && (
                  <div className="bg-white rounded-3xl p-6 border border-surface-200 shadow-soft">
                    <h3 className="font-bold text-ink-900 mb-4 flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-primary-500" />
                      Visit Summary
                    </h3>
                    <p className="text-ink-600 leading-relaxed">{summary.visit_summary}</p>
                    
                    {summary.diagnoses?.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-bold text-ink-400 uppercase tracking-wider mb-2">Diagnoses</p>
                        <div className="flex flex-wrap gap-2">
                          {summary.diagnoses.map((d, i) => (
                            <span key={i} className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium">
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Clinical Focus */}
                {clinicalFocus && (
                  <div className="bg-white rounded-3xl p-6 border border-surface-200 shadow-soft">
                    <h3 className="font-bold text-ink-900 mb-4 flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-500" />
                      Differential Diagnoses
                    </h3>
                    <div className="space-y-3">
                      {clinicalFocus.possible_conditions?.slice(0, 5).map((cond: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                            cond.likelihood === "high" ? "bg-red-100 text-red-600" :
                            cond.likelihood === "medium" ? "bg-amber-100 text-amber-600" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {cond.likelihood}
                          </span>
                          <span className="font-medium text-ink-800">{cond.condition}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Red Flags */}
                {clinicalFocus?.red_flags?.length > 0 && (
                  <div className="bg-red-50 rounded-3xl p-6 border border-red-200">
                    <h3 className="font-bold text-red-900 mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Red Flags Identified
                    </h3>
                    <div className="space-y-2">
                      {clinicalFocus.red_flags.map((flag: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-red-800">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          {flag}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "transcript" && (
              <div className="bg-white rounded-3xl p-6 border border-surface-200 shadow-soft">
                <h3 className="font-bold text-ink-900 mb-4">Full Transcript</h3>
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {transcript.map((chunk) => (
                    <div
                      key={chunk.id}
                      className={`p-4 rounded-2xl ${
                        chunk.speaker === "patient"
                          ? "bg-blue-50 ml-0 mr-12"
                          : "bg-emerald-50 ml-12 mr-0"
                      }`}
                    >
                      <p className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-1">
                        {chunk.speaker}
                      </p>
                      <p className="text-ink-700">{chunk.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "soap" && draftNote && (
              <div className="bg-white rounded-3xl p-6 border border-surface-200 shadow-soft">
                <h3 className="font-bold text-ink-900 mb-6">SOAP Note</h3>
                <div className="space-y-6">
                  {[
                    { label: "Subjective", content: draftNote.subjective, color: "blue" },
                    { label: "Objective", content: draftNote.objective, color: "emerald" },
                    { label: "Assessment", content: draftNote.assessment, color: "amber" },
                    { label: "Plan", content: draftNote.plan, color: "purple" },
                  ].map((section) => (
                    <div key={section.label} className={`p-4 bg-${section.color}-50 rounded-2xl border border-${section.color}-100`}>
                      <p className="text-sm font-bold text-ink-900 mb-2">{section.label}</p>
                      <p className="text-ink-600 whitespace-pre-wrap">{section.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "clinical" && (
              <div className="space-y-6">
                {fields && (
                  <div className="bg-white rounded-3xl p-6 border border-surface-200 shadow-soft">
                    <h3 className="font-bold text-ink-900 mb-4">Extracted Clinical Data</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {fields.symptoms?.length > 0 && (
                        <div>
                          <p className="text-sm font-bold text-ink-400 uppercase tracking-wider mb-2">Symptoms</p>
                          <div className="flex flex-wrap gap-2">
                            {fields.symptoms.map((s: string, i: number) => (
                              <span key={i} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {fields.medications?.length > 0 && (
                        <div>
                          <p className="text-sm font-bold text-ink-400 uppercase tracking-wider mb-2">Medications</p>
                          <div className="flex flex-wrap gap-2">
                            {fields.medications.map((m: string, i: number) => (
                              <span key={i} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm">{m}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {fields.allergies?.length > 0 && (
                        <div>
                          <p className="text-sm font-bold text-ink-400 uppercase tracking-wider mb-2">Allergies</p>
                          <div className="flex flex-wrap gap-2">
                            {fields.allergies.map((a: string, i: number) => (
                              <span key={i} className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm">{a}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {clinicalFocus?.suggested_tests?.length > 0 && (
                  <div className="bg-white rounded-3xl p-6 border border-surface-200 shadow-soft">
                    <h3 className="font-bold text-ink-900 mb-4">Suggested Diagnostic Tests</h3>
                    <div className="space-y-2">
                      {clinicalFocus.suggested_tests.map((test: string, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-lg flex items-center justify-center text-xs font-bold">
                            {i + 1}
                          </div>
                          <span className="text-blue-800 font-medium">{test}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "billing" && billingCodes && (
              <div className="bg-white rounded-3xl p-6 border border-surface-200 shadow-soft">
                <h3 className="font-bold text-ink-900 mb-6">Billing Codes</h3>
                <div className="space-y-6">
                  {billingCodes.icd10_codes?.length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-ink-400 uppercase tracking-wider mb-3">ICD-10 Diagnosis Codes</p>
                      <div className="space-y-2">
                        {billingCodes.icd10_codes.map((code: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-surface-50 rounded-xl">
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-mono text-sm font-bold">
                                {code.code}
                              </span>
                              <span className="text-ink-700">{code.description}</span>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                              code.confidence === "high" ? "bg-emerald-100 text-emerald-600" :
                              code.confidence === "medium" ? "bg-amber-100 text-amber-600" :
                              "bg-slate-100 text-slate-600"
                            }`}>
                              {code.confidence}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {billingCodes.cpt_codes?.length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-ink-400 uppercase tracking-wider mb-3">CPT Procedure Codes</p>
                      <div className="space-y-2">
                        {billingCodes.cpt_codes.map((code: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-surface-50 rounded-xl">
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded font-mono text-sm font-bold">
                                {code.code}
                              </span>
                              <span className="text-ink-700">{code.description}</span>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                              code.confidence === "high" ? "bg-emerald-100 text-emerald-600" :
                              code.confidence === "medium" ? "bg-amber-100 text-amber-600" :
                              "bg-slate-100 text-slate-600"
                            }`}>
                              {code.confidence}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Doctor Notes Sidebar */}
          <div className="col-span-1">
            <div className="bg-white rounded-3xl p-6 border border-surface-200 shadow-soft sticky top-24">
              <h3 className="font-bold text-ink-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-500" />
                Doctor's Notes
              </h3>
              <textarea
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="Add your clinical notes, observations, or recommendations here..."
                className="w-full h-64 p-4 bg-surface-50 border border-surface-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm"
              />
              <button
                onClick={handleMarkReviewed}
                disabled={isSaving}
                className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save & Mark Reviewed
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
