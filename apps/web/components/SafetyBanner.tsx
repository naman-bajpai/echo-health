"use client";

import { AlertTriangle, Shield, CheckCircle } from "lucide-react";
import type { EncounterStatus } from "@/lib/types";
import { SAFETY_MESSAGES } from "@/lib/safety";

interface SafetyBannerProps {
  status: EncounterStatus;
  showDraftWarning?: boolean;
}

export default function SafetyBanner({ status, showDraftWarning }: SafetyBannerProps) {
  const getIcon = () => {
    switch (status) {
      case "intake":
        return <Shield className="w-5 h-5" />;
      case "visit":
        return <AlertTriangle className="w-5 h-5" />;
      case "checkout":
        return <CheckCircle className="w-5 h-5" />;
    }
  };

  const getColors = () => {
    switch (status) {
      case "intake":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "visit":
        return "bg-blue-50 border-blue-200 text-blue-800";
      case "checkout":
        return "bg-green-50 border-green-200 text-green-800";
    }
  };

  return (
    <div className={`border rounded-lg p-3 ${getColors()}`}>
      <div className="flex items-center gap-2">
        {getIcon()}
        <span className="text-sm font-medium">{SAFETY_MESSAGES[status]}</span>
      </div>
      {showDraftWarning && status === "visit" && (
        <p className="mt-2 text-xs opacity-80">
          All generated content is labeled DRAFT and requires clinician review.
        </p>
      )}
    </div>
  );
}
