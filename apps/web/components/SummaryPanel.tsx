"use client";

import { useState } from "react";
import {
  RefreshCw,
  FileText,
  Download,
  Volume2,
  CheckCircle,
  ArrowRight,
  MessageSquare,
  Calendar,
  Sparkles,
  FileCheck,
  Stethoscope,
  Info,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import type { PatientSummary, DiagnosisResult, BillingCodesResult } from "@/lib/types";
import { PATIENT_DISCLAIMER } from "@/lib/safety";

interface SummaryPanelProps {
  summary: PatientSummary | null;
  diagnosis?: DiagnosisResult | null;
  billingCodes?: BillingCodesResult | null;
  onGenerate: () => Promise<void>;
  onGenerateDiagnosis?: () => Promise<void>;
  onDownloadPdf: () => Promise<void>;
  onNarrate: (text: string) => Promise<void>;
  isLoading?: boolean;
  isGeneratingDiagnosis?: boolean;
  disabled?: boolean;
}

export default function SummaryPanel({
  summary,
  diagnosis,
  billingCodes,
  onGenerate,
  onGenerateDiagnosis,
  onDownloadPdf,
  onNarrate,
  isLoading,
  isGeneratingDiagnosis,
  disabled,
}: SummaryPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try { await onGenerate(); } finally { setIsGenerating(false); }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try { await onDownloadPdf(); } finally { setIsDownloading(false); }
  };

  const handleNarrate = async () => {
    if (!summary) return;
    setIsNarrating(true);
    try { await onNarrate(buildNarrationText(summary)); } finally { setIsNarrating(false); }
  };

  const loading = isLoading || isGenerating;

  return (
    <div className="h-full bg-surface-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-12 py-16">
        {/* Header */}
        <div className="flex items-end justify-between mb-12">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-ink-900">Patient Summary</h2>
            <p className="text-ink-400 font-medium">Clear, actionable visit overview for your patient</p>
          </div>
          
          <div className="flex items-center gap-3">
            {summary && (
              <>
                <button
                  onClick={handleNarrate}
                  disabled={disabled || isNarrating}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-surface-200 rounded-xl text-ink-600 font-bold text-sm hover:bg-surface-50 transition-all"
                >
                  <Volume2 className={`w-4 h-4 ${isNarrating ? "animate-pulse text-primary-500" : ""}`} />
                  Listen
                </button>
                <button
                  onClick={handleDownload}
                  disabled={disabled || isDownloading}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-surface-200 rounded-xl text-ink-600 font-bold text-sm hover:bg-surface-50 transition-all"
                >
                  <Download className={`w-4 h-4 ${isDownloading ? "animate-bounce" : ""}`} />
                  PDF
                </button>
              </>
            )}
            <button
              onClick={handleGenerate}
              disabled={disabled || loading}
              className="flex items-center gap-2 px-6 py-3 bg-ink-900 text-white rounded-2xl font-bold text-sm shadow-soft hover:bg-black transition-all"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {summary ? "Regenerate" : "Generate Summary"}
            </button>
          </div>
        </div>

        {!summary ? (
          <div className="py-24 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-soft">
              <FileCheck className="w-10 h-10 text-rose-200" />
            </div>
            <h3 className="text-xl font-bold text-ink-900">Summary Standing By</h3>
            <p className="text-ink-400 max-w-xs mt-2">Create a patient-friendly overview once the consultation is complete.</p>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Overview Card */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-soft-lg border border-surface-200">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center shadow-inner-soft">
                  <MessageSquare className="w-6 h-6 text-primary-500" />
                </div>
                <div>
                  <h3 className="font-bold text-ink-900 text-lg">Your Visit Overview</h3>
                  <p className="text-xs font-bold text-primary-500 uppercase tracking-widest">Simple Language Summary</p>
                </div>
              </div>
              <p className="text-lg font-medium text-ink-700 leading-relaxed italic">
                "{summary.visit_summary}"
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Clinical Insights */}
              <div className="space-y-8">
                {/* Diagnoses / Evaluation */}
                <section className="bg-white rounded-[2rem] p-8 border border-surface-200 shadow-soft">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Stethoscope className="w-5 h-5 text-emerald-500" />
                      <h3 className="font-bold text-ink-900">Clinical Focus</h3>
                    </div>
                    {onGenerateDiagnosis && (
                      <button 
                        onClick={onGenerateDiagnosis}
                        disabled={isGeneratingDiagnosis}
                        className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg uppercase tracking-wider hover:bg-emerald-100 transition-all"
                      >
                        {isGeneratingDiagnosis ? "Analyzing..." : "AI Diagnosis"}
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {diagnosis ? (
                      diagnosis.primary_diagnoses.map((d, i) => (
                        <div key={i} className="p-3 bg-emerald-50/30 rounded-xl border border-emerald-50">
                          <p className="text-sm font-bold text-ink-900">{d.diagnosis}</p>
                          <p className="text-xs text-ink-500 mt-1">{d.reasoning}</p>
                        </div>
                      ))
                    ) : (
                      (summary.diagnoses || []).map((d, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <p className="text-sm font-bold text-ink-700">{d}</p>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* Medications */}
                <section className="bg-white rounded-[2rem] p-8 border border-surface-200 shadow-soft">
                  <div className="flex items-center gap-3 mb-6">
                    <ShieldCheck className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-bold text-ink-900">Medications</h3>
                  </div>
                  <div className="space-y-3">
                    {(summary.medications || []).map((m, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-indigo-50/30 rounded-xl border border-indigo-50">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        <p className="text-sm font-bold text-ink-700">{m}</p>
                      </div>
                    ))}
                    {(!summary.medications || summary.medications.length === 0) && (
                      <p className="text-xs italic text-ink-300">No medications discussed.</p>
                    )}
                  </div>
                </section>
              </div>

              {/* Action Plan */}
              <div className="space-y-8">
                {/* Treatment & Next Steps */}
                <section className="bg-ink-900 text-white rounded-[2rem] p-8 shadow-soft-xl">
                  <div className="flex items-center gap-3 mb-8">
                    <ArrowRight className="w-5 h-5 text-primary-400" />
                    <h3 className="font-bold uppercase tracking-widest text-xs">Your Action Plan</h3>
                  </div>
                  <div className="space-y-6">
                    {(summary.treatment_plan || []).map((step, i) => (
                      <div key={i} className="flex gap-4">
                        <span className="text-primary-400 font-black text-sm">{i + 1}.</span>
                        <p className="text-sm font-medium leading-relaxed opacity-90">{step}</p>
                      </div>
                    ))}
                  </div>
                  
                  {summary.follow_up && (
                    <div className="mt-10 pt-8 border-t border-white/10">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-primary-400" />
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Follow-up</span>
                      </div>
                      <p className="text-sm font-bold">{summary.follow_up}</p>
                    </div>
                  )}
                </section>

                {/* Warning Signs */}
                <section className="bg-red-50 rounded-[2rem] p-8 border border-red-100">
                  <div className="flex items-center gap-3 mb-6">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <h3 className="font-bold text-red-900">When to call us</h3>
                  </div>
                  <div className="space-y-3">
                    {(summary.warning_signs || []).map((sign, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-white">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        <p className="text-sm font-bold text-red-800">{sign}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            {/* Billing Codes */}
            {billingCodes && (
              <section className="bg-gradient-to-br from-indigo-50 to-white rounded-[2rem] p-8 border border-indigo-100 shadow-soft">
                <div className="flex items-center gap-3 mb-6">
                  <FileCheck className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-ink-900">Billing Codes</h3>
                </div>
                
                {/* ICD-10 Codes */}
                {billingCodes.icd10_codes && billingCodes.icd10_codes.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-xs font-bold text-ink-600 mb-3 uppercase tracking-wider">ICD-10 Diagnosis Codes</h4>
                    <div className="space-y-3">
                      {billingCodes.icd10_codes.map((code: any, index: number) => (
                        <div key={index} className="bg-white p-4 rounded-xl border border-indigo-100">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono font-bold text-indigo-700 text-base">{code.code}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  code.confidence === "high" 
                                    ? "bg-emerald-100 text-emerald-700"
                                    : code.confidence === "medium"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-700"
                                }`}>
                                  {code.confidence} confidence
                                </span>
                              </div>
                              <p className="text-sm text-ink-700 font-medium">{code.description}</p>
                              {code.rationale && (
                                <p className="text-xs text-ink-500 mt-2">{code.rationale}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CPT Codes */}
                {billingCodes.cpt_codes && billingCodes.cpt_codes.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-ink-600 mb-3 uppercase tracking-wider">CPT Procedure Codes</h4>
                    <div className="space-y-3">
                      {billingCodes.cpt_codes.map((code: any, index: number) => (
                        <div key={index} className="bg-white p-4 rounded-xl border border-indigo-100">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono font-bold text-indigo-700 text-base">{code.code}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  code.confidence === "high" 
                                    ? "bg-emerald-100 text-emerald-700"
                                    : code.confidence === "medium"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-700"
                                }`}>
                                  {code.confidence} confidence
                                </span>
                              </div>
                              <p className="text-sm text-ink-700 font-medium">{code.description}</p>
                              {code.rationale && (
                                <p className="text-xs text-ink-500 mt-2">{code.rationale}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Billing Disclaimer */}
                {billingCodes.disclaimer && (
                  <div className="mt-6 bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <p className="text-xs text-amber-800 leading-relaxed">{billingCodes.disclaimer}</p>
                  </div>
                )}
              </section>
            )}

            {/* Disclaimer */}
            <div className="flex items-center gap-4 px-8 py-6 bg-surface-100 rounded-3xl opacity-60 border border-surface-200">
              <Info className="w-5 h-5 shrink-0" />
              <p className="text-[10px] font-bold leading-relaxed tracking-wide uppercase">
                {summary.disclaimer || PATIENT_DISCLAIMER}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function buildNarrationText(summary: PatientSummary): string {
  const parts: string[] = ["Here is a summary of your visit today."];
  if (summary.visit_summary) parts.push(summary.visit_summary);
  if ((summary.treatment_plan || []).length > 0) parts.push("Your action plan: " + summary.treatment_plan.join(". "));
  if (summary.follow_up) parts.push("Follow up: " + summary.follow_up);
  parts.push("Please consult your provider for any medical decisions.");
  return parts.join(" ");
}
