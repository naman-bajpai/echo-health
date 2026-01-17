"use client";

import { ArrowLeft, Clock, User } from "lucide-react";
import Link from "next/link";
import type { Encounter } from "@/lib/types";
import { STATUS_NAMES, STATUS_COLORS, formatDate, formatTime } from "@/lib/safety";

interface EncounterHeaderProps {
  encounter: Encounter;
}

export default function EncounterHeader({ encounter }: EncounterHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to home"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>

          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {encounter.patient_name || "New Patient"}
            </h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDate(encounter.created_at)} at {formatTime(encounter.created_at)}
              </span>
              {encounter.reason_for_visit && (
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {encounter.reason_for_visit}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span
            className={`badge ${STATUS_COLORS[encounter.status]}`}
          >
            {STATUS_NAMES[encounter.status]}
          </span>

          <span className="text-xs text-gray-400 font-mono">
            ID: {encounter.id.slice(0, 8)}
          </span>
        </div>
      </div>
    </header>
  );
}
