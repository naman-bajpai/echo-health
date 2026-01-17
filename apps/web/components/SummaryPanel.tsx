"use client";

import { useState } from "react";
import {
  RefreshCw,
  FileText,
  Download,
  Volume2,
  CheckCircle,
  ArrowRight,
  Info,
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Visit Summary</h2>
        <div className="flex gap-2">
          {summary && (
            <>
              <button
                onClick={handleNarrate}
                disabled={disabled || isNarrating}
                className="btn-secondary flex items-center gap-2"
                title="Listen to summary"
              >
                <Volume2 className={`w-4 h-4 ${isNarrating ? "animate-pulse" : ""}`} />
              </button>
              <button
                onClick={handleDownload}
                disabled={disabled || isDownloading}
                className="btn-secondary flex items-center gap-2"
              >
                <Download className={`w-4 h-4 ${isDownloading ? "animate-bounce" : ""}`} />
                PDF
              </button>
            </>
          )}
          <button
            onClick={handleGenerate}
            disabled={disabled || loading}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Generating..." : summary ? "Regenerate" : "Generate"}
          </button>
        </div>
      </div>

      {!summary ? (
        <div className="text-center py-12 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No summary generated yet</p>
          <p className="text-sm mt-2">
            Click &quot;Generate&quot; to create a patient-friendly visit summary
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* What You Told Us */}
          <SummarySection
            title="What You Told Us"
            icon={<Info className="w-5 h-5 text-blue-600" />}
          >
            <ul className="space-y-2">
              {summary.what_you_told_us.map((item, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-gray-700"
                >
                  <span className="text-blue-500 mt-1">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </SummarySection>

          {/* What Happened Today */}
          <SummarySection
            title="What Happened Today"
            icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          >
            <p className="text-gray-700">{summary.what_happened_today}</p>
          </SummarySection>

          {/* Referrals */}
          {summary.referrals.length > 0 && (
            <SummarySection
              title="Referrals"
              icon={<ArrowRight className="w-5 h-5 text-purple-600" />}
            >
              <div className="space-y-3">
                {summary.referrals.map((referral, index) => (
                  <div
                    key={index}
                    className="bg-purple-50 rounded-lg p-3"
                  >
                    <p className="font-medium text-purple-900">
                      {referral.specialty}
                    </p>
                    {referral.provider && (
                      <p className="text-sm text-purple-700">
                        Provider: {referral.provider}
                      </p>
                    )}
                    <p className="text-sm text-purple-600 mt-1">
                      {referral.reason}
                    </p>
                  </div>
                ))}
              </div>
            </SummarySection>
          )}

          {/* Next Steps */}
          <SummarySection
            title="Next Steps"
            icon={<ArrowRight className="w-5 h-5 text-orange-600" />}
          >
            <ul className="space-y-2">
              {summary.next_steps.map((step, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 text-gray-700"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </SummarySection>

          {/* Follow-up */}
          {summary.follow_up && (
            <SummarySection
              title="Follow-up"
              icon={<CheckCircle className="w-5 h-5 text-teal-600" />}
            >
              <p className="text-gray-700">{summary.follow_up}</p>
            </SummarySection>
          )}

          {/* Disclaimer */}
          <div className="bg-gray-100 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500">{PATIENT_DISCLAIMER}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SummarySection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
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
