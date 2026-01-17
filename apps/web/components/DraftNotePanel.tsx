"use client";

import { useState } from "react";
import { RefreshCw, FileText, AlertTriangle, Sparkles, ClipboardList } from "lucide-react";
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
    <div className="p-6 h-full overflow-y-auto bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-sage-100 rounded-2xl flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-sage-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-ink-800">Draft SOAP Note</h2>
              <p className="text-ink-500 mt-0.5">
                AI-generated clinical documentation
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={disabled || loading}
            className="btn-primary text-sm px-4 py-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {loading ? "Generating..." : draftNote ? "Regenerate" : "Generate Note"}
          </button>
        </div>

        {!draftNote ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-sage-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <FileText className="w-12 h-12 text-sage-400" />
            </div>
            <h3 className="text-xl font-bold text-ink-700 mb-3">
              No draft note generated yet
            </h3>
            <p className="text-ink-500 max-w-sm mx-auto">
              Click "Generate Note" to create a SOAP note from the transcript.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Draft Warning Banner */}
            <div className="bg-accent-50 border border-accent-200 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 bg-accent-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-accent-600" />
              </div>
              <div>
                <p className="font-semibold text-accent-800">Draft Document</p>
                <p className="text-sm text-accent-700 mt-1">{DRAFT_WARNING}</p>
              </div>
            </div>

            {/* SOAP Note Content */}
            <div className="card p-8 draft-watermark relative">
              <div className="relative z-10 space-y-8">
                <NoteSection
                  title="Subjective"
                  content={draftNote.subjective}
                  color="primary"
                />
                <NoteSection
                  title="Objective"
                  content={draftNote.objective}
                  color="sage"
                />
                <NoteSection
                  title="Assessment"
                  content={draftNote.assessment}
                  color="accent"
                />
                <NoteSection
                  title="Plan"
                  content={draftNote.plan}
                  color="purple"
                />
              </div>
            </div>

            {/* Compliance Notice */}
            <p className="text-xs text-ink-400 text-center">
              This note contains no diagnoses or treatment recommendations per
              compliance requirements.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function NoteSection({
  title,
  content,
  color,
}: {
  title: string;
  content: string;
  color: "primary" | "sage" | "accent" | "purple";
}) {
  const colorStyles = {
    primary: "bg-primary-100 text-primary-700 border-primary-200",
    sage: "bg-sage-100 text-sage-700 border-sage-200",
    accent: "bg-accent-100 text-accent-700 border-accent-200",
    purple: "bg-purple-100 text-purple-700 border-purple-200",
  };

  const borderColors = {
    primary: "border-l-primary-400",
    sage: "border-l-sage-400",
    accent: "border-l-accent-400",
    purple: "border-l-purple-400",
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span
          className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${colorStyles[color]}`}
        >
          {title}
        </span>
      </div>
      <div
        className={`text-ink-700 whitespace-pre-wrap text-sm leading-relaxed pl-5 border-l-4 ${borderColors[color]} bg-surface-50 p-4 rounded-r-xl`}
      >
        {content || (
          <span className="text-ink-400 italic">No content</span>
        )}
      </div>
    </div>
  );
}
