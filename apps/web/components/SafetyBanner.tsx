"use client";

import { AlertTriangle, Shield, CheckCircle, Info } from "lucide-react";
import type { EncounterStatus } from "@/lib/types";
import { SAFETY_MESSAGES } from "@/lib/safety";

interface SafetyBannerProps {
  status: EncounterStatus;
  showDraftWarning?: boolean;
}

export default function SafetyBanner({ status, showDraftWarning }: SafetyBannerProps) {
  const config = {
    intake: {
      icon: Shield,
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-800",
      iconColor: "text-amber-600",
    },
    visit: {
      icon: Info,
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-800",
      iconColor: "text-blue-600",
    },
    checkout: {
      icon: CheckCircle,
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-800",
      iconColor: "text-emerald-600",
    },
  };

  const { icon: Icon, bg, border, text, iconColor } = config[status];

  return (
    <div className={`${bg} ${border} border rounded-xl px-4 py-3 flex items-start gap-3`}>
      <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1">
        <span className={`text-sm font-medium ${text}`}>{SAFETY_MESSAGES[status]}</span>
        {showDraftWarning && status === "visit" && (
          <p className={`mt-1 text-xs ${text} opacity-75`}>
            All generated content is labeled DRAFT and requires clinician review.
          </p>
        )}
      </div>
    </div>
  );
}
