"use client";

import Link from "next/link";
import {
  ArrowLeft,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  Stethoscope,
  Badge,
  HeartPulse,
} from "lucide-react";
import type { Encounter } from "@/lib/types";

interface EncounterHeaderProps {
  encounter: Encounter;
}

const urgencyConfig = {
  routine: {
    icon: CheckCircle,
    label: "Routine",
    bg: "bg-sage-100",
    text: "text-sage-700",
    border: "border-sage-200",
    dot: "bg-sage-500",
  },
  urgent: {
    icon: Clock,
    label: "Urgent",
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  emergent: {
    icon: AlertTriangle,
    label: "Emergent",
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-500 animate-pulse",
  },
};

export default function EncounterHeader({ encounter }: EncounterHeaderProps) {
  const urgency = urgencyConfig[encounter.urgency] || urgencyConfig.routine;
  const UrgencyIcon = urgency.icon;

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-surface-200 sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Left side */}
          <div className="flex items-center gap-5">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 text-ink-500 hover:text-ink-700 hover:bg-surface-100 rounded-xl transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium hidden sm:inline">Dashboard</span>
            </Link>

            <div className="w-px h-10 bg-surface-200" />

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-soft">
                <HeartPulse className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-bold text-ink-800 text-lg">
                    {encounter.patient_name || "Patient Encounter"}
                  </h1>
                  {encounter.visit_number > 1 && (
                    <span className="badge badge-primary">
                      Visit #{encounter.visit_number}
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink-500">
                  {encounter.reason_for_visit || "No reason specified"}
                </p>
              </div>
            </div>
          </div>

          {/* Right side - Status badges */}
          <div className="flex items-center gap-3">
            {/* Urgency Badge */}
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${urgency.bg} ${urgency.text} ${urgency.border}`}
            >
              <span className={`w-2 h-2 rounded-full ${urgency.dot}`} />
              <UrgencyIcon className="w-4 h-4" />
              <span className="text-sm font-semibold">{urgency.label}</span>
            </div>

            {/* Specialist Badge */}
            {encounter.specialist_needed && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-100 text-purple-700 border border-purple-200">
                <Stethoscope className="w-4 h-4" />
                <span className="text-sm font-semibold">
                  {encounter.recommended_specialist || "Specialist Needed"}
                </span>
              </div>
            )}

            {/* First visit highlight */}
            {encounter.visit_number === 1 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sage-100 text-sage-700 border border-sage-200">
                <Badge className="w-4 h-4" />
                <span className="text-sm font-semibold">First Visit</span>
              </div>
            )}

            {/* Status */}
            <div
              className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                encounter.status === "active"
                  ? "bg-primary-100 text-primary-700"
                  : encounter.status === "completed"
                  ? "bg-surface-100 text-ink-600"
                  : "bg-sage-100 text-sage-700"
              }`}
            >
              {encounter.status.charAt(0).toUpperCase() +
                encounter.status.slice(1)}
            </div>
          </div>
        </div>

        {/* Urgency reason banner (if urgent/emergent) */}
        {encounter.urgency !== "routine" && encounter.urgency_reason && (
          <div
            className={`-mx-6 px-6 py-3 ${
              encounter.urgency === "emergent"
                ? "bg-red-50 border-t border-red-100"
                : "bg-amber-50 border-t border-amber-100"
            }`}
          >
            <p
              className={`text-sm ${
                encounter.urgency === "emergent"
                  ? "text-red-700"
                  : "text-amber-700"
              }`}
            >
              <strong>Assessment:</strong> {encounter.urgency_reason}
            </p>
          </div>
        )}
      </div>
    </header>
  );
}
