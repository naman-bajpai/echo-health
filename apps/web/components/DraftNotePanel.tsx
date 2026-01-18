"use client";

import { useState } from "react";
import { RefreshCw, FileText, AlertTriangle, Sparkles, ClipboardList, ShieldCheck } from "lucide-react";
import type { DraftNote } from "@/lib/types";
import { DRAFT_WARNING } from "@/lib/safety";

interface DraftNotePanelProps {
  draftNote: DraftNote | null;
  onGenerate: () => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function DraftNotePanel({
  draftNote,
  onGenerate,
  isLoading,
  disabled,
}: DraftNotePanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate();
    } finally {
      setIsGenerating(false);
    }
  };

  const loading = isLoading || isGenerating;

  return (
    <div className="h-full bg-surface-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-12 py-16">
        {/* Document Header */}
        <div className="flex items-end justify-between mb-12">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-ink-900">SOAP Documentation</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary-500 bg-primary-50 px-2 py-0.5 rounded-md">AI DRAFT</span>
              <p className="text-ink-400 font-medium">Auto-generated clinical note</p>
            </div>
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={disabled || loading}
            className="flex items-center gap-2 px-6 py-3 bg-ink-900 text-white rounded-2xl font-bold text-sm shadow-soft-lg hover:bg-black transition-all disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {draftNote ? "Refresh Note" : "Generate SOAP"}
          </button>
        </div>

        {!draftNote ? (
          <div className="py-24 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-soft">
              <ClipboardList className="w-10 h-10 text-primary-200" />
            </div>
            <h3 className="text-xl font-bold text-ink-900">Documentation Pending</h3>
            <p className="text-ink-400 max-w-xs mt-2">The SOAP note will be generated based on the consultation transcript and extracted fields.</p>
          </div>
        ) : (
          <div className="space-y-10 animate-fade-in">
            {/* Safety Disclaimer */}
            <div className="bg-amber-50/50 rounded-3xl p-6 border border-amber-100 flex items-start gap-4 shadow-inner-soft">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-soft">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900 mb-1">Clinician Review Required</p>
                <p className="text-xs text-amber-700/80 leading-relaxed font-medium">{DRAFT_WARNING}</p>
              </div>
            </div>

            {/* The Document */}
            <div className="bg-white rounded-[2.5rem] p-12 shadow-soft-xl border border-surface-200 relative overflow-hidden">
              {/* Subtle Document Texture/Watermark */}
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <ShieldCheck className="w-64 h-64" />
              </div>

              <div className="relative z-10 space-y-12">
                <NoteSection label="S" title="Subjective" content={draftNote.subjective} color="primary" />
                <NoteSection label="O" title="Objective" content={draftNote.objective} color="sage" />
                <NoteSection label="A" title="Assessment" content={draftNote.assessment} color="accent" />
                <NoteSection label="P" title="Plan" content={draftNote.plan} color="indigo" />
              </div>

              {/* Document Footer */}
              <div className="mt-16 pt-8 border-t border-surface-100 flex items-center justify-between opacity-50">
                <div className="text-[10px] font-bold text-ink-300 uppercase tracking-widest">
                  Secure Medical Documentation System
                </div>
                <div className="text-[10px] font-bold text-ink-300 uppercase tracking-widest">
                  Artifact ID: {Math.random().toString(36).substring(7).toUpperCase()}
                </div>
              </div>
            </div>

            <p className="text-center text-[10px] font-bold text-ink-300 uppercase tracking-[0.2em]">
              End of Document
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function NoteSection({ label, title, content, color }: any) {
  const styles: any = {
    primary: { text: "text-primary-600", dot: "bg-primary-500" },
    sage: { text: "text-sage-600", dot: "bg-sage-500" },
    accent: { text: "text-accent-600", dot: "bg-accent-500" },
    indigo: { text: "text-indigo-600", dot: "bg-indigo-500" },
  };

  return (
    <div className="group">
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-sm shadow-sm ${styles[color].dot}`}>
          {label}
        </div>
        <h3 className={`font-bold uppercase tracking-widest text-xs ${styles[color].text}`}>
          {title}
        </h3>
        <div className="flex-1 h-px bg-surface-100 group-hover:bg-surface-200 transition-colors" />
      </div>
      <div className="pl-12">
        <p className="text-sm font-medium text-ink-800 leading-loose whitespace-pre-wrap">
          {content || "No information recorded for this section."}
        </p>
      </div>
    </div>
  );
}
