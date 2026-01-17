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
} from "lucide-react";
import type { PatientSummary } from "@/lib/types";
import { PATIENT_DISCLAIMER } from "@/lib/safety";

interface SummaryPanelProps {
  summary: PatientSummary | null;
  onGenerate: () => Promise<void>;
  onDownloadPdf: () => Promise<void>;
  onNarrate: (text: string) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function SummaryPanel({
  summary,
  onGenerate,
  onDownloadPdf,
  onNarrate,
  isLoading,
  disabled,
}: SummaryPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await onDownloadPdf();
    } finally {
      setIsDownloading(false);
    }
  };

  const handleNarrate = async () => {
    if (!summary) return;
    setIsNarrating(true);
    try {
      const text = buildNarrationText(summary);
      await onNarrate(text);
    } finally {
      setIsNarrating(false);
    }
  };

  const loading = isLoading || isGenerating;

  return (
    <div className="p-6 h-full overflow-y-auto bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-ink-800">Visit Summary</h2>
              <p className="text-ink-500 mt-0.5">
                Patient-friendly summary for take-home
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {summary && (
              <>
                <button
                  onClick={handleNarrate}
                  disabled={disabled || isNarrating}
                  className="btn-secondary text-sm px-4 py-2"
                  title="Listen to summary"
                >
                  <Volume2
                    className={`w-4 h-4 ${
                      isNarrating ? "animate-pulse text-primary-600" : ""
                    }`}
                  />
                  <span className="hidden sm:inline">Listen</span>
                </button>
                <button
                  onClick={handleDownload}
                  disabled={disabled || isDownloading}
                  className="btn-secondary text-sm px-4 py-2"
                >
                  <Download
                    className={`w-4 h-4 ${isDownloading ? "animate-bounce" : ""}`}
                  />
                  <span className="hidden sm:inline">PDF</span>
                </button>
              </>
            )}
            <button
              onClick={handleGenerate}
              disabled={disabled || loading}
              className="btn-primary text-sm px-4 py-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {loading ? "Generating..." : summary ? "Regenerate" : "Generate"}
            </button>
          </div>
        </div>

        {!summary ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <FileText className="w-12 h-12 text-rose-400" />
            </div>
            <h3 className="text-xl font-bold text-ink-700 mb-3">
              No summary generated yet
            </h3>
            <p className="text-ink-500 max-w-sm mx-auto">
              Click "Generate" to create a patient-friendly visit summary that
              can be printed or shared.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* What You Told Us */}
            <div className="card p-6 bg-gradient-to-br from-primary-50/50 to-white">
              <h3 className="font-bold text-ink-800 mb-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary-600" />
                </div>
                What You Told Us
              </h3>
              <ul className="space-y-3">
                {summary.what_you_told_us.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 bg-white p-4 rounded-xl border border-surface-200"
                  >
                    <span className="flex-shrink-0 w-7 h-7 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <span className="text-ink-700 pt-0.5">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* What Happened Today */}
            <div className="card p-6 bg-gradient-to-br from-sage-50/50 to-white">
              <h3 className="font-bold text-ink-800 mb-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-sage-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-sage-600" />
                </div>
                What Happened Today
              </h3>
              <p className="text-ink-700 leading-relaxed bg-white p-4 rounded-xl border border-surface-200">
                {summary.what_happened_today}
              </p>
            </div>

            {/* Referrals */}
            {summary.referrals.length > 0 && (
              <div className="card p-6 bg-gradient-to-br from-purple-50/50 to-white">
                <h3 className="font-bold text-ink-800 mb-5 flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-purple-600" />
                  </div>
                  Referrals
                </h3>
                <div className="space-y-3">
                  {summary.referrals.map((referral, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-xl p-5 border border-surface-200"
                    >
                      <p className="font-semibold text-purple-800 text-lg">
                        {referral.specialty}
                      </p>
                      {referral.provider && (
                        <p className="text-sm text-purple-600 mt-1">
                          Provider: {referral.provider}
                        </p>
                      )}
                      <p className="text-ink-600 mt-2">{referral.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="card p-6 bg-gradient-to-br from-accent-50/50 to-white">
              <h3 className="font-bold text-ink-800 mb-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-accent-100 rounded-xl flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-accent-600" />
                </div>
                Next Steps
              </h3>
              <ul className="space-y-3">
                {summary.next_steps.map((step, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-4 bg-white p-4 rounded-xl border border-surface-200"
                  >
                    <span className="flex-shrink-0 w-9 h-9 bg-accent-100 text-accent-700 rounded-xl flex items-center justify-center font-bold">
                      {index + 1}
                    </span>
                    <span className="text-ink-700 pt-1.5">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Follow-up */}
            {summary.follow_up && (
              <div className="card p-6 bg-gradient-to-br from-cyan-50/50 to-white">
                <h3 className="font-bold text-ink-800 mb-5 flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-cyan-600" />
                  </div>
                  Follow-up
                </h3>
                <p className="text-ink-700 bg-white p-4 rounded-xl border border-surface-200">
                  {summary.follow_up}
                </p>
              </div>
            )}

            {/* Disclaimer */}
            <div className="bg-surface-100 rounded-2xl p-6 text-center border border-surface-200">
              <p className="text-sm text-ink-500">{PATIENT_DISCLAIMER}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function buildNarrationText(summary: PatientSummary): string {
  const parts: string[] = [];

  parts.push("Here is a summary of your visit today.");

  if (summary.what_you_told_us.length > 0) {
    parts.push("What you told us: " + summary.what_you_told_us.join(". "));
  }

  parts.push("What happened today: " + summary.what_happened_today);

  if (summary.referrals.length > 0) {
    parts.push(
      "You have been referred to: " +
        summary.referrals.map((r) => r.specialty).join(", ")
    );
  }

  if (summary.next_steps.length > 0) {
    parts.push("Your next steps are: " + summary.next_steps.join(". "));
  }

  if (summary.follow_up) {
    parts.push("Follow-up: " + summary.follow_up);
  }

  parts.push(
    "Remember, this summary is for informational purposes only. Please consult with your healthcare provider for medical decisions."
  );

  return parts.join(" ");
}
