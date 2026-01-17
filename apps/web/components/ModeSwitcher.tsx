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

const modes: Array<{ id: PanelMode; label: string; icon: typeof MessageSquare }> = [
  { id: "transcript", label: "Transcript", icon: MessageSquare },
  { id: "fields", label: "Fields", icon: ClipboardList },
  { id: "note", label: "Draft Note", icon: FileText },
  { id: "referral", label: "Referrals", icon: Users },
  { id: "summary", label: "Summary", icon: FileCheck },
];

export default function ModeSwitcher({
  currentMode,
  onModeChange,
  disabled,
}: ModeSwitcherProps) {
  return (
    <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.id;

        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            disabled={disabled}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
              transition-all duration-200
              ${
                isActive
                  ? "bg-white text-primary-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
