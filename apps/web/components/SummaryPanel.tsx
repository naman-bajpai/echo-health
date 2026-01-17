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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Visit Summary</h2>
            <p className="text-gray-500 mt-1">Patient-friendly summary for take-home</p>
          </div>
          <div className="flex gap-2">
            {summary && (
              <>
                <button
                  onClick={handleNarrate}
                  disabled={disabled || isNarrating}
                  className="btn-secondary flex items-center gap-2"
                  title="Listen to summary"
                >
                  <Volume2 className={`w-4 h-4 ${isNarrating ? "animate-pulse text-primary-600" : ""}`} />
                  <span className="hidden sm:inline">Listen</span>
                </button>
                <button
                  onClick={handleDownload}
                  disabled={disabled || isDownloading}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Download className={`w-4 h-4 ${isDownloading ? "animate-bounce" : ""}`} />
                  <span className="hidden sm:inline">PDF</span>
                </button>
              </>
            )}
            <button
              onClick={handleGenerate}
              disabled={disabled || loading}
              className="btn-primary flex items-center gap-2"
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
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-rose-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No summary generated yet</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              Click "Generate" to create a patient-friendly visit summary that can be printed or shared.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* What You Told Us */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                What You Told Us
              </h3>
              <ul className="space-y-3">
                {summary.what_you_told_us.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 bg-white/60 p-3 rounded-xl"
                  >
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* What Happened Today */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                What Happened Today
              </h3>
              <p className="text-gray-700 leading-relaxed">{summary.what_happened_today}</p>
            </div>

            {/* Referrals */}
            {summary.referrals.length > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-6 border border-purple-100">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <ArrowRight className="w-5 h-5 text-purple-600" />
                  </div>
                  Referrals
                </h3>
                <div className="space-y-3">
                  {summary.referrals.map((referral, index) => (
                    <div
                      key={index}
                      className="bg-white/60 rounded-xl p-4"
                    >
                      <p className="font-semibold text-purple-900">
                        {referral.specialty}
                      </p>
                      {referral.provider && (
                        <p className="text-sm text-purple-700 mt-1">
                          Provider: {referral.provider}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mt-2">
                        {referral.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <ArrowRight className="w-5 h-5 text-amber-600" />
                </div>
                Next Steps
              </h3>
              <ul className="space-y-3">
                {summary.next_steps.map((step, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 bg-white/60 p-3 rounded-xl"
                  >
                    <span className="flex-shrink-0 w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </span>
                    <span className="text-gray-700 pt-1">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Follow-up */}
            {summary.follow_up && (
              <div className="bg-gradient-to-br from-cyan-50 to-sky-50 rounded-2xl p-6 border border-cyan-100">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-cyan-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-cyan-600" />
                  </div>
                  Follow-up
                </h3>
                <p className="text-gray-700">{summary.follow_up}</p>
              </div>
            )}

            {/* Disclaimer */}
            <div className="bg-gray-100 rounded-2xl p-5 text-center">
              <p className="text-sm text-gray-500">{PATIENT_DISCLAIMER}</p>
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
