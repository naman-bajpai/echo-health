"use client";

import { 
  MessageSquare, 
  FileText, 
  ClipboardList, 
  Users, 
  FileCheck 
} from "lucide-react";
import type { PanelMode } from "@/lib/types";

interface ModeSwitcherProps {
  currentMode: PanelMode;
  onModeChange: (mode: PanelMode) => void;
  disabled?: boolean;
}

const modes: Array<{ id: PanelMode; label: string; icon: typeof MessageSquare; color: string }> = [
  { id: "transcript", label: "Transcript", icon: MessageSquare, color: "blue" },
  { id: "fields", label: "Fields", icon: ClipboardList, color: "amber" },
  { id: "note", label: "Draft Note", icon: FileText, color: "emerald" },
  { id: "referral", label: "Referrals", icon: Users, color: "purple" },
  { id: "summary", label: "Summary", icon: FileCheck, color: "rose" },
];

export default function ModeSwitcher({
  currentMode,
  onModeChange,
  disabled,
}: ModeSwitcherProps) {
  return (
    <div className="flex bg-gray-100/80 rounded-2xl p-1.5 gap-1">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.id;

        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            disabled={disabled}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
              transition-all duration-200
              ${
                isActive
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            <Icon className={`w-4 h-4 ${isActive ? "text-primary-600" : ""}`} />
            <span className="hidden md:inline">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
