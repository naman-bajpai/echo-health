"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";

export interface RealtimeNotesPanelProps {
  className?: string;
}

export function RealtimeNotesPanel({ className }: RealtimeNotesPanelProps) {
  const [notes, setNotes] = useState<string>("");
  const [recentTranscription, setRecentTranscription] = useState<string>("");

  // Listen for notes updates from TranscriptPanel via custom events
  useEffect(() => {
    const handleNotesUpdate = (event: CustomEvent) => {
      if (event.detail?.notes) {
        setNotes(event.detail.notes);
      }
    };

    const handleTranscriptionUpdate = (event: CustomEvent) => {
      if (event.detail?.transcription) {
        setRecentTranscription(event.detail.transcription);
      }
    };

    window.addEventListener("echo-health-notes-updated", handleNotesUpdate as EventListener);
    window.addEventListener("echo-health-transcription-updated", handleTranscriptionUpdate as EventListener);

    return () => {
      window.removeEventListener("echo-health-notes-updated", handleNotesUpdate as EventListener);
      window.removeEventListener("echo-health-transcription-updated", handleTranscriptionUpdate as EventListener);
    };
  }, []);

  const noteWordCount = notes.trim().split(/\s+/).filter(Boolean).length;
  const transcriptStatus = recentTranscription ? "Streaming live" : "Standing by";

  return (
    <div className={`flex flex-col h-full gap-6 ${className || ""}`}>
      {/* Recent Transcription Preview */}
      <div className="relative overflow-hidden rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 via-white to-white p-5 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold tracking-[0.3em] text-primary-700 uppercase">
              Recent transcription
            </span>
            <p className="mt-1 text-sm text-ink-500">{transcriptStatus}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-ink-600 shadow-sm ring-1 ring-primary-200">
            <span className="size-2 rounded-full bg-primary-400" aria-hidden="true" />
            Auto-sync
          </span>
        </div>

        <div className="mt-4 min-h-[4rem] rounded-xl border border-primary-200 bg-white/80 px-4 py-3 font-mono text-sm leading-relaxed text-ink-700 shadow-sm">
          {recentTranscription || "Waiting for transcription…"}
        </div>
      </div>

      {/* Medical Notes Display */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-primary-200 bg-white p-0 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-200 px-6 py-4">
          <div>
            <span className="text-xs font-semibold tracking-[0.3em] text-ink-500 uppercase">
              Structured medical notes
            </span>
            <p className="mt-1 text-sm text-ink-500">
              Synced in real time as the consultation progresses
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium text-ink-500">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-3 py-1 ring-1 ring-primary-200">
              <span className="size-2 rounded-full bg-primary-400" aria-hidden="true" />
              {noteWordCount} words
            </span>
            <span className="hidden items-center gap-2 rounded-full bg-sage-100 px-3 py-1 ring-1 ring-sage-200 md:inline-flex">
              <span className="size-2 rounded-full bg-sage-400" aria-hidden="true" />
              Markdown enabled
            </span>
          </div>
        </div>

        <div className="custom-scrollbar h-full overflow-y-auto px-6 pt-4 pb-6">
          <div
            key={notes}
            className="prose prose-sm max-w-none leading-relaxed text-ink-700 transition-opacity duration-300"
          >
            {notes ? (
              <div className="whitespace-pre-wrap text-ink-700">
                {notes.split('\n').map((line, idx) => {
                  // Simple markdown-like formatting
                  if (line.startsWith('# ')) {
                    return <h1 key={idx} className="mb-2 text-xl font-semibold text-ink-900 mt-4">{line.substring(2)}</h1>;
                  } else if (line.startsWith('## ')) {
                    return <h2 key={idx} className="mb-2 text-lg font-semibold text-ink-900 mt-3">{line.substring(3)}</h2>;
                  } else if (line.startsWith('### ')) {
                    return <h3 key={idx} className="mb-1 text-base font-semibold text-ink-800 mt-2">{line.substring(4)}</h3>;
                  } else if (line.startsWith('- ') || line.startsWith('* ')) {
                    return <div key={idx} className="ml-4 mb-1">• {line.substring(2)}</div>;
                  } else if (line.trim() === '') {
                    return <br key={idx} />;
                  } else {
                    return <p key={idx} className="mb-3">{line}</p>;
                  }
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-primary-400" />
                </div>
                <p className="text-sm text-ink-400 italic">
                  Notes will populate automatically once the consultation begins.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
