"use client";

import { ArrowLeft, Clock, User, Activity } from "lucide-react";
import Link from "next/link";
import type { Encounter } from "@/lib/types";
import { STATUS_NAMES, STATUS_COLORS, formatDate, formatTime } from "@/lib/safety";

interface EncounterHeaderProps {
  encounter: Encounter;
}

export default function EncounterHeader({ encounter }: EncounterHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors group"
            title="Back to home"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
          </Link>

          <div className="h-8 w-px bg-gray-200" />

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg shadow-primary-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {encounter.patient_name || "New Patient"}
              </h1>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDate(encounter.created_at)}
                </span>
                {encounter.reason_for_visit && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="flex items-center gap-1 text-gray-600">
                      {encounter.reason_for_visit}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className={`badge ${STATUS_COLORS[encounter.status]} px-4 py-1.5`}>
            {STATUS_NAMES[encounter.status]}
          </span>

          <div className="hidden sm:block text-right">
            <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded">
              {encounter.id.slice(0, 8)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
