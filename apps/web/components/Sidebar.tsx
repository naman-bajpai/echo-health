"use client";

import {
  MessageSquare,
  ClipboardList,
  FileText,
  Users,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";
import type { PanelMode } from "@/lib/types";
import { useState } from "react";
import Link from "next/link";

interface SidebarProps {
  currentMode: PanelMode;
  onModeChange: (mode: PanelMode) => void;
}

const modes: Array<{
  id: PanelMode;
  label: string;
  icon: typeof MessageSquare;
  color: string;
}> = [
  { id: "transcript", label: "Transcript", icon: MessageSquare, color: "text-primary-500" },
  { id: "fields", label: "Clinical Fields", icon: ClipboardList, color: "text-accent-500" },
  { id: "note", label: "Draft Note", icon: FileText, color: "text-sage-600" },
  { id: "referral", label: "Referrals", icon: Users, color: "text-purple-600" },
  { id: "summary", label: "Visit Summary", icon: FileCheck, color: "text-rose-500" },
];

export default function Sidebar({ currentMode, onModeChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <aside
      className={`relative flex flex-col h-full bg-white border-r border-surface-200 transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-10 w-6 h-6 bg-white border border-surface-200 rounded-full flex items-center justify-center shadow-soft hover:bg-surface-50 z-50 transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-ink-400" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-ink-400" />
        )}
      </button>

      {/* Navigation */}
      <div className="flex-1 flex flex-col gap-2 p-4 pt-10">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;

          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={`
                group relative flex items-center gap-4 p-3 rounded-2xl transition-all duration-200
                ${
                  isActive
                    ? "bg-primary-50 text-primary-900 shadow-inner-soft"
                    : "text-ink-500 hover:bg-surface-50 hover:text-ink-800"
                }
              `}
            >
              <div
                className={`flex-shrink-0 w-6 h-6 flex items-center justify-center transition-transform duration-200 ${
                  isActive ? "scale-110" : "group-hover:scale-110"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? mode.color : ""}`} />
              </div>
              
              {!isCollapsed && (
                <span className={`font-semibold text-sm whitespace-nowrap transition-opacity duration-300 ${isActive ? "opacity-100" : "opacity-80 group-hover:opacity-100"}`}>
                  {mode.label}
                </span>
              )}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-1.5 bg-ink-900 text-white text-xs font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap shadow-xl">
                  {mode.label}
                </div>
              )}

              {/* Active Indicator */}
              {isActive && (
                <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary-500 shadow-glow" />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-surface-100 flex flex-col gap-2">
        <Link
          href="/dashboard"
          className="group relative flex items-center gap-4 p-3 rounded-2xl text-ink-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span className="font-semibold text-sm">Exit Encounter</span>}
          {isCollapsed && (
            <div className="absolute left-full ml-4 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap shadow-xl">
              Exit Encounter
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}
