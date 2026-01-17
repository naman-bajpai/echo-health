"use client";

import { useState } from "react";
import { RefreshCw, FileText, AlertTriangle } from "lucide-react";
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Draft SOAP Note</h2>
        <button
          onClick={handleGenerate}
          disabled={disabled || loading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Generating..." : "Generate Note"}
        </button>
      </div>

      {!draftNote ? (
        <div className="text-center py-12 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No draft note generated yet</p>
          <p className="text-sm mt-2">
            Click &quot;Generate Note&quot; to create a SOAP note from the transcript
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Draft Warning Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Draft Document</p>
              <p className="text-sm text-amber-700 mt-1">{DRAFT_WARNING}</p>
            </div>
          </div>

          {/* SOAP Note Content */}
          <div className="card draft-watermark relative">
            <div className="relative z-10 space-y-6">
              <NoteSection title="Subjective" content={draftNote.subjective} />
              <NoteSection title="Objective" content={draftNote.objective} />
              <NoteSection title="Assessment" content={draftNote.assessment} />
              <NoteSection title="Plan" content={draftNote.plan} />
            </div>
          </div>

          {/* Compliance Notice */}
          <p className="text-xs text-gray-400 text-center">
            This note contains no diagnoses or treatment recommendations per compliance requirements.
          </p>
        </div>
      )}
    </div>
  );
}

function NoteSection({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-2 text-sm uppercase tracking-wide">
        {title}
      </h3>
      <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed pl-4 border-l-2 border-gray-200">
        {content || <span className="text-gray-400 italic">No content</span>}
      </div>
    </div>
  );
}
