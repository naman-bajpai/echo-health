"use client";

import { Shield, CheckCircle, Info } from "lucide-react";
import type { EncounterStatus } from "@/lib/types";
import { SAFETY_MESSAGES } from "@/lib/safety";

interface SafetyBannerProps {
  status: EncounterStatus;
  showDraftWarning?: boolean;
}

export default function SafetyBanner({
  status,
  showDraftWarning,
}: SafetyBannerProps) {
  const config = {
    intake: {
      icon: Shield,
      bg: "bg-accent-50",
      border: "border-accent-200",
      text: "text-accent-800",
      iconBg: "bg-accent-100",
      iconColor: "text-accent-600",
    },
    visit: {
      icon: Info,
      bg: "bg-primary-50",
      border: "border-primary-200",
      text: "text-primary-800",
      iconBg: "bg-primary-100",
      iconColor: "text-primary-600",
    },
    checkout: {
      icon: CheckCircle,
      bg: "bg-sage-50",
      border: "border-sage-200",
      text: "text-sage-800",
      iconBg: "bg-sage-100",
      iconColor: "text-sage-600",
    },
  };

  // Fallback for other status values like 'active', 'completed'
  const statusKey = status in config ? status : "visit";
  const { icon: Icon, bg, border, text, iconBg, iconColor } = config[statusKey as keyof typeof config];

  return (
    <div
      className={`${bg} ${border} border rounded-2xl px-4 py-3 flex items-center gap-3`}
    >
      <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1">
        <span className={`text-sm font-semibold ${text}`}>
          {SAFETY_MESSAGES[statusKey as keyof typeof SAFETY_MESSAGES] || "Documentation in progress"}
        </span>
        {showDraftWarning && statusKey === "visit" && (
          <p className={`mt-0.5 text-xs ${text} opacity-75`}>
            All generated content is labeled DRAFT and requires clinician
            review.
          </p>
        )}
      </div>
    </div>
  );
}
