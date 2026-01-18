"use client";

import { useState, useEffect } from "react";
import { FileText, RefreshCw, CheckCircle, X, Plus, Loader2, AlertCircle } from "lucide-react";
import { generateBillingCodes } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import type { BillingCodesResult } from "@/lib/types";

interface BillingCodesPanelProps {
  encounterId: string;
  billingCodes: BillingCodesResult | null;
  onUpdate: (codes: BillingCodesResult) => Promise<void>;
  userRole: "nurse" | "doctor";
}

export default function BillingCodesPanel({
  encounterId,
  billingCodes,
  onUpdate,
  userRole,
}: BillingCodesPanelProps) {
  const { showError, showSuccess } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [localCodes, setLocalCodes] = useState<BillingCodesResult | null>(billingCodes);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalCodes(billingCodes);
  }, [billingCodes]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateBillingCodes(encounterId);
      setLocalCodes(result.billingCodes);
      await onUpdate(result.billingCodes);
      showSuccess("Billing codes generated successfully");
    } catch (err) {
      console.error("Failed to generate billing codes:", err);
      showError("Failed to generate billing codes. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemoveCode = (type: "icd10" | "cpt", index: number) => {
    if (!localCodes) return;
    const updated = { ...localCodes };
    if (type === "icd10") {
      updated.icd10_codes = updated.icd10_codes.filter((_, i) => i !== index);
    } else {
      updated.cpt_codes = updated.cpt_codes.filter((_, i) => i !== index);
    }
    setLocalCodes(updated);
  };

  const handleSave = async () => {
    if (!localCodes) return;
    setIsSaving(true);
    try {
      await onUpdate(localCodes);
      showSuccess("Billing codes saved successfully");
    } catch (err) {
      console.error("Failed to save billing codes:", err);
      showError("Failed to save billing codes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (userRole !== "nurse") {
    return null; // Only nurses can manage billing codes
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-surface-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-ink-900">Billing Codes</h3>
            <p className="text-xs text-ink-400">AI-detected codes based on encounter</p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-bold hover:bg-primary-600 transition-all disabled:opacity-50"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {isGenerating ? "Generating..." : "Generate Codes"}
        </button>
      </div>

      {localCodes ? (
        <div className="space-y-6">
          {/* ICD-10 Codes */}
          {localCodes.icd10_codes && localCodes.icd10_codes.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-ink-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                ICD-10 Diagnosis Codes
              </h4>
              <div className="space-y-2">
                {localCodes.icd10_codes.map((code, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-surface-50 rounded-xl border border-surface-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-ink-900">{code.code}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          code.confidence === "high" ? "bg-emerald-50 text-emerald-600" :
                          code.confidence === "medium" ? "bg-amber-50 text-amber-600" :
                          "bg-slate-50 text-slate-600"
                        }`}>
                          {code.confidence}
                        </span>
                      </div>
                      <p className="text-sm text-ink-700">{code.description}</p>
                      <p className="text-xs text-ink-400 mt-1">{code.rationale}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveCode("icd10", idx)}
                      className="text-ink-300 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CPT Codes */}
          {localCodes.cpt_codes && localCodes.cpt_codes.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-ink-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                CPT Procedure Codes
              </h4>
              <div className="space-y-2">
                {localCodes.cpt_codes.map((code, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-surface-50 rounded-xl border border-surface-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-ink-900">{code.code}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          code.confidence === "high" ? "bg-emerald-50 text-emerald-600" :
                          code.confidence === "medium" ? "bg-amber-50 text-amber-600" :
                          "bg-slate-50 text-slate-600"
                        }`}>
                          {code.confidence}
                        </span>
                      </div>
                      <p className="text-sm text-ink-700">{code.description}</p>
                      <p className="text-xs text-ink-400 mt-1">{code.rationale}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveCode("cpt", idx)}
                      className="text-ink-300 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {localCodes.icd10_codes?.length === 0 && localCodes.cpt_codes?.length === 0 && (
            <div className="text-center py-8 text-ink-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No billing codes generated yet</p>
            </div>
          )}

          {localCodes.disclaimer && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-800">{localCodes.disclaimer}</p>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 bg-ink-900 text-white rounded-xl font-bold hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {isSaving ? "Saving..." : "Save Billing Codes"}
          </button>
        </div>
      ) : (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-ink-200 mx-auto mb-3" />
          <p className="text-sm text-ink-400 mb-4">No billing codes generated yet</p>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-6 py-2 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition-all disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Generate Billing Codes"}
          </button>
        </div>
      )}
    </div>
  );
}
