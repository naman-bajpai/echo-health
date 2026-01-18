"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Stethoscope,
  Badge,
  Sparkles,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
import type { Encounter, UrgencyLevel } from "@/lib/types";
import logo from "@/logo.png";

interface EncounterHeaderProps {
  encounter: Encounter;
  onUrgencyChange?: (urgency: UrgencyLevel) => Promise<void>;
}

const urgencyConfig = {
  routine: {
    icon: CheckCircle,
    label: "Routine",
    bg: "bg-sage-50",
    text: "text-sage-600",
    border: "border-sage-100",
    dot: "bg-sage-400",
  },
  urgent: {
    icon: Clock,
    label: "Urgent",
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-100",
    dot: "bg-amber-400",
  },
  emergent: {
    icon: AlertTriangle,
    label: "Emergent",
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-100",
    dot: "bg-red-400 animate-pulse",
  },
};

export default function EncounterHeader({ encounter, onUrgencyChange }: EncounterHeaderProps) {
  const urgency = urgencyConfig[encounter.urgency] || urgencyConfig.routine;
  const UrgencyIcon = urgency.icon;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

  const handleUrgencySelect = async (newUrgency: UrgencyLevel) => {
    if (newUrgency === encounter.urgency || !onUrgencyChange) {
      setIsDropdownOpen(false);
      return;
    }

    setIsUpdating(true);
    try {
      await onUrgencyChange(newUrgency);
      setIsDropdownOpen(false);
    } catch (error) {
      console.error("Failed to update urgency:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const urgencyOptions: UrgencyLevel[] = ["routine", "urgent", "emergent"];

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-surface-200 h-20 flex items-center shrink-0 px-8 z-40">
      <div className="flex items-center justify-between w-full">
        {/* Left Section: Logo & Patient Info */}
        <div className="flex items-center gap-8">
          <Image
            src={logo}
            alt="Echo Health"
            width={120}
            height={36}
            className="h-9 w-auto opacity-90"
            priority
          />
          
          <div className="w-px h-8 bg-surface-200" />
          
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-ink-900 text-xl tracking-tight">
                {encounter.patient_name || "New Encounter"}
              </h1>
              {encounter.visit_number > 1 && (
                <span className="text-2xs font-bold uppercase tracking-widest text-primary-500 bg-primary-50 px-2 py-0.5 rounded-md">
                  Visit #{encounter.visit_number}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-ink-400">
              {encounter.reason_for_visit || "Consultation"}
            </p>
          </div>
        </div>

        {/* Right Section: Status & Actions */}
        <div className="flex items-center gap-4">
          {/* Status Indicators */}
          <div className="flex items-center gap-2 pr-4 border-r border-surface-200">
            {/* Urgency Badge with Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => onUrgencyChange && setIsDropdownOpen(!isDropdownOpen)}
                disabled={!onUrgencyChange || isUpdating}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${urgency.bg} ${urgency.text} ${urgency.border} transition-all duration-300 hover:shadow-soft ${
                  onUrgencyChange ? "cursor-pointer" : "cursor-default"
                } ${isUpdating ? "opacity-50" : ""}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${urgency.dot}`} />
                <span className="text-xs font-bold uppercase tracking-wider">{urgency.label}</span>
                {onUrgencyChange && (
                  <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                )}
              </button>

              {isDropdownOpen && onUrgencyChange && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-soft-xl border border-surface-200 py-2 z-50 animate-slide-up">
                  <div className="px-3 py-2 mb-1 border-b border-surface-100">
                    <p className="text-2xs font-bold text-ink-400 uppercase tracking-widest">Change Urgency</p>
                  </div>
                  {urgencyOptions.map((option) => {
                    const optionConfig = urgencyConfig[option];
                    const OptionIcon = optionConfig.icon;
                    const isSelected = option === encounter.urgency;
                    
                    return (
                      <button
                        key={option}
                        onClick={() => handleUrgencySelect(option)}
                        disabled={isUpdating}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-50 transition-colors text-left ${
                          isSelected ? "bg-primary-50" : ""
                        } ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <div className={`w-2 h-2 rounded-full ${optionConfig.dot}`} />
                        <OptionIcon className={`w-4 h-4 ${optionConfig.text}`} />
                        <span className={`text-xs font-bold uppercase tracking-wider ${optionConfig.text}`}>
                          {optionConfig.label}
                        </span>
                        {isSelected && (
                          <CheckCircle className="w-4 h-4 text-primary-600 ml-auto" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Specialist Needed */}
            {encounter.specialist_needed && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 text-primary-600 border border-primary-100 shadow-inner-soft">
                <Stethoscope className="w-3.5 h-3.5" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {encounter.recommended_specialist || "Specialist"}
                </span>
              </div>
            )}

            {/* First Visit */}
            {encounter.visit_number === 1 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-50 text-accent-600 border border-accent-100">
                <Badge className="w-3.5 h-3.5" />
                <span className="text-xs font-bold uppercase tracking-wider">New Patient</span>
              </div>
            )}
          </div>

          {/* Encounter Status */}
          <div className="flex items-center gap-3">
            <div className={`
              flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold
              ${encounter.status === "active" 
                ? "bg-ink-900 text-white" 
                : "bg-surface-100 text-ink-600"}
            `}>
              {encounter.status === "active" && (
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
              {encounter.status.charAt(0).toUpperCase() + encounter.status.slice(1)}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
