"use client";

import { useEffect, useState } from "react";
import { FileText, Sparkles, Activity } from "lucide-react";

export interface RealtimeNotesPanelProps {
  className?: string;
}

export function RealtimeNotesPanel({ className }: RealtimeNotesPanelProps) {
  const [notes, setNotes] = useState<string>("");
  const [recentTranscription, setRecentTranscription] = useState<string>("");

  useEffect(() => {
    const handleNotesUpdate = (event: CustomEvent) => {
      if (event.detail?.notes) setNotes(event.detail.notes);
    };
    const handleTranscriptionUpdate = (event: CustomEvent) => {
      if (event.detail?.transcription) setRecentTranscription(event.detail.transcription);
    };
    window.addEventListener("echo-health-notes-updated", handleNotesUpdate as EventListener);
    window.addEventListener("echo-health-transcription-updated", handleTranscriptionUpdate as EventListener);
    return () => {
      window.removeEventListener("echo-health-notes-updated", handleNotesUpdate as EventListener);
      window.removeEventListener("echo-health-transcription-updated", handleTranscriptionUpdate as EventListener);
    };
  }, []);

  const noteWordCount = notes.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className={`flex flex-col h-full bg-surface-50/50 ${className || ""}`}>
      {/* Live Context Section */}
      <div className="p-6 border-b border-surface-100">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary-500" />
          <span className="text-2xs font-bold uppercase tracking-widest text-ink-400">Live Context</span>
        </div>
        
        <div className="min-h-[80px] p-4 rounded-2xl bg-white border border-surface-200 shadow-inner-soft">
          {recentTranscription ? (
            <p className="text-sm text-ink-600 leading-relaxed italic animate-fade-in">
              "{recentTranscription}"
            </p>
          ) : (
            <p className="text-xs text-ink-300 italic text-center py-4">
              Awaiting live audio...
            </p>
          )}
        </div>
      </div>

      {/* Real-time Insights Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent-500" />
            <span className="text-2xs font-bold uppercase tracking-widest text-ink-400">Structured Insights</span>
          </div>
          {noteWordCount > 0 && (
            <span className="text-[10px] font-bold text-primary-500 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-100">
              {noteWordCount} WORDS
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-8 custom-scrollbar">
          {notes ? (
            <div className="prose prose-sm max-w-none text-ink-700">
              {notes.split('\n').map((line, idx) => {
                if (line.startsWith('# ')) {
                  return <h1 key={idx} className="mb-2 text-base font-bold text-ink-900 mt-4">{line.substring(2)}</h1>;
                } else if (line.startsWith('## ')) {
                  return <h2 key={idx} className="mb-2 text-sm font-bold text-ink-900 mt-3">{line.substring(3)}</h2>;
                } else if (line.startsWith('### ')) {
                  return <h3 key={idx} className="mb-1 text-xs font-bold text-ink-800 mt-2">{line.substring(4)}</h3>;
                } else if (line.startsWith('- ') || line.startsWith('* ')) {
                  return <div key={idx} className="flex gap-2 text-sm mb-1 text-ink-600"><span className="text-primary-400">•</span> {line.substring(2)}</div>;
                } else if (line.trim() === '') {
                  return <div key={idx} className="h-2" />;
                } else {
                  return <p key={idx} className="text-sm mb-3 leading-relaxed">{line}</p>;
                }
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full opacity-30 grayscale py-12">
              <FileText className="w-12 h-12 mb-4 text-ink-300" />
              <p className="text-xs text-center px-8">Insights will appear automatically during the session.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
