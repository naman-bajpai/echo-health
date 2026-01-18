"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { getEncounter, getSummaryPdfUrl, generateBillingCodes } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";
import logo from "@/logo.png";
import { useToast } from "@/components/ToastProvider";
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  Download,
  Loader2,
  AlertCircle,
  CreditCard,
  Receipt,
  Sparkles,
} from "lucide-react";
import type { Encounter, BillingCodesResult } from "@/lib/types";

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const encounterId = params.encounterId as string;

  const { showError, showSuccess } = useToast();
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [billingCodes, setBillingCodes] = useState<BillingCodesResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    loadData();
  }, [encounterId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [encounterData] = await Promise.all([
        getEncounter(encounterId),
      ]);

      if (!encounterData) {
        router.push("/dashboard");
        return;
      }

      setEncounter(encounterData);

      // Load billing codes
      const { data: artifacts } = await supabase
        .from("artifacts")
        .select("content")
        .eq("encounter_id", encounterId)
        .eq("type", "billing_codes")
        .single();

      if (artifacts?.content) {
        setBillingCodes(artifacts.content as BillingCodesResult);
      } else {
        // Auto-generate billing codes if not present
        await handleGenerateBillingCodes();
      }
    } catch (err) {
      console.error("Error loading checkout data:", err);
      showError("Failed to load checkout data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateBillingCodes = async () => {
    setIsGeneratingCodes(true);
    try {
      const result = await generateBillingCodes(encounterId);
      setBillingCodes(result.billingCodes);
      
      // Save to artifacts
      await supabase
        .from("artifacts")
        .upsert({
          encounter_id: encounterId,
          type: "billing_codes",
          content: result.billingCodes,
        }, { onConflict: "encounter_id,type" });
      showSuccess("Billing codes generated successfully");
    } catch (err) {
      console.error("Failed to generate billing codes:", err);
      showError("Failed to generate billing codes. Please try again.");
    } finally {
      setIsGeneratingCodes(false);
    }
  };

  const handleCompleteCheckout = async () => {
    setIsCompleting(true);
    try {
      // Update encounter status to completed
      const { error } = await supabase
        .from("encounters")
        .update({ status: "completed" })
        .eq("id", encounterId);

      if (error) throw error;

      showSuccess("Encounter completed successfully");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (err) {
      console.error("Failed to complete checkout:", err);
      showError("Failed to complete checkout. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const result = await getSummaryPdfUrl(encounterId);
      window.open(result.pdfUrl, "_blank");
      showSuccess("PDF download started");
    } catch (err) {
      console.error("Failed to download PDF:", err);
      showError("Failed to download PDF. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-50">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!encounter) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Navbar */}
      <nav className="h-20 bg-white/80 backdrop-blur-md border-b border-surface-200 sticky top-0 z-50 px-8">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <Link href={`/encounter/${encounterId}`} className="flex items-center gap-2 text-ink-400 hover:text-ink-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-bold text-sm">Back to Encounter</span>
          </Link>
          <Image src={logo} alt="Echo Health" width={110} height={32} className="h-8 w-auto opacity-90" />
          <div className="w-32" />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-6 bg-primary-500 rounded-full" />
            <span className="text-xs font-black text-primary-500 uppercase tracking-widest">Checkout</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-ink-900">Complete Encounter</h1>
          <p className="text-ink-400 font-medium mt-2">Review billing codes and finalize the visit</p>
        </div>

        {/* Patient Info Card */}
        <div className="bg-white rounded-3xl p-8 border border-surface-200 shadow-soft mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-ink-900 mb-2">{encounter.patient_name}</h2>
              <p className="text-ink-400">{encounter.reason_for_visit}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-ink-400 uppercase tracking-widest mb-1">Visit Date</p>
              <p className="text-lg font-bold text-ink-900">
                {new Date(encounter.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Billing Codes Section */}
        <div className="bg-white rounded-3xl p-8 border border-surface-200 shadow-soft mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-ink-900 text-lg">Billing Codes</h3>
                <p className="text-xs text-ink-400">AI-detected codes based on encounter transcript</p>
              </div>
            </div>
            <button
              onClick={handleGenerateBillingCodes}
              disabled={isGeneratingCodes}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-bold hover:bg-primary-600 transition-all disabled:opacity-50"
            >
              {isGeneratingCodes ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isGeneratingCodes ? "Generating..." : "Regenerate"}
            </button>
          </div>

          {billingCodes ? (
            <div className="space-y-6">
              {/* ICD-10 Codes */}
              {billingCodes.icd10_codes && billingCodes.icd10_codes.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-ink-700 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    ICD-10 Diagnosis Codes
                  </h4>
                  <div className="space-y-2">
                    {billingCodes.icd10_codes.map((code, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-surface-50 rounded-xl border border-surface-200"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-ink-900">{code.code}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            code.confidence === "high" ? "bg-emerald-50 text-emerald-600" :
                            code.confidence === "medium" ? "bg-amber-50 text-amber-600" :
                            "bg-slate-50 text-slate-600"
                          }`}>
                            {code.confidence}
                          </span>
                        </div>
                        <p className="text-sm text-ink-700 mb-1">{code.description}</p>
                        <p className="text-xs text-ink-400">{code.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CPT Codes */}
              {billingCodes.cpt_codes && billingCodes.cpt_codes.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-ink-700 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    CPT Procedure Codes
                  </h4>
                  <div className="space-y-2">
                    {billingCodes.cpt_codes.map((code, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-surface-50 rounded-xl border border-surface-200"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-ink-900">{code.code}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            code.confidence === "high" ? "bg-emerald-50 text-emerald-600" :
                            code.confidence === "medium" ? "bg-amber-50 text-amber-600" :
                            "bg-slate-50 text-slate-600"
                          }`}>
                            {code.confidence}
                          </span>
                        </div>
                        <p className="text-sm text-ink-700 mb-1">{code.description}</p>
                        <p className="text-xs text-ink-400">{code.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {billingCodes.disclaimer && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">{billingCodes.disclaimer}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Receipt className="w-16 h-16 text-ink-200 mx-auto mb-4" />
              <p className="text-ink-400 mb-4">No billing codes generated yet</p>
              <button
                onClick={handleGenerateBillingCodes}
                disabled={isGeneratingCodes}
                className="px-6 py-3 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition-all disabled:opacity-50"
              >
                {isGeneratingCodes ? "Generating..." : "Generate Billing Codes"}
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleDownloadPdf}
            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-white border border-surface-200 rounded-2xl font-bold text-ink-700 hover:bg-surface-50 transition-all"
          >
            <Download className="w-5 h-5" />
            Download PDF Report
          </button>
          <button
            onClick={handleCompleteCheckout}
            disabled={isCompleting || !billingCodes}
            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-ink-900 text-white rounded-2xl font-bold hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCompleting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            {isCompleting ? "Completing..." : "Complete Checkout"}
          </button>
        </div>
      </main>
    </div>
  );
}
