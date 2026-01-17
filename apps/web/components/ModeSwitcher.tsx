"use client";

import {
  MessageSquare,
  FileText,
  ClipboardList,
  Users,
  FileCheck,
} from "lucide-react";
import type { PanelMode } from "@/lib/types";

interface ModeSwitcherProps {
  currentMode: PanelMode;
  onModeChange: (mode: PanelMode) => void;
  disabled?: boolean;
}

const modes: Array<{
  id: PanelMode;
  label: string;
  icon: typeof MessageSquare;
  activeColor: string;
}> = [
  { id: "transcript", label: "Transcript", icon: MessageSquare, activeColor: "text-primary-600" },
  { id: "fields", label: "Fields", icon: ClipboardList, activeColor: "text-accent-600" },
  { id: "note", label: "Draft Note", icon: FileText, activeColor: "text-sage-600" },
  { id: "referral", label: "Referrals", icon: Users, activeColor: "text-purple-600" },
  { id: "summary", label: "Summary", icon: FileCheck, activeColor: "text-rose-600" },
];

export default function ModeSwitcher({
  currentMode,
  onModeChange,
  disabled,
}: ModeSwitcherProps) {
  return (
    <div className="flex bg-surface-100 rounded-2xl p-1.5 gap-1 border border-surface-200">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.id;

        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            disabled={disabled}
            className={`
              relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
              transition-all duration-300
              ${
                isActive
                  ? "bg-white text-ink-800 shadow-soft"
                  : "text-ink-500 hover:text-ink-700 hover:bg-white/50"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            <Icon className={`w-4 h-4 ${isActive ? mode.activeColor : ""}`} />
            <span className="hidden md:inline">{mode.label}</span>
            {isActive && (
              <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${mode.activeColor} bg-current`} />
            )}
          </button>
        );
      })}
    </div>
  );
}
