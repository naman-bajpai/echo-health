"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff, User, Stethoscope, UserCircle } from "lucide-react";
import type { TranscriptChunk, SpeakerRole } from "@/lib/types";
import { SPEAKER_NAMES, formatTime } from "@/lib/safety";

interface TranscriptPanelProps {
  transcript: TranscriptChunk[];
  currentSpeaker: SpeakerRole;
  onSpeakerChange: (speaker: SpeakerRole) => void;
  onAddTranscript: (text: string) => void;
  isRecording?: boolean;
  onToggleRecording?: () => void;
  disabled?: boolean;
}

const speakerIcons = {
  patient: User,
  clinician: Stethoscope,
  staff: UserCircle,
};

const speakerColors = {
  patient: "bg-blue-50 border-blue-400 text-blue-900",
  clinician: "bg-green-50 border-green-400 text-green-900",
  staff: "bg-gray-50 border-gray-400 text-gray-900",
};

export default function TranscriptPanel({
  transcript,
  currentSpeaker,
  onSpeakerChange,
  onAddTranscript,
  isRecording,
  onToggleRecording,
  disabled,
}: TranscriptPanelProps) {
  const [inputText, setInputText] = useState("");
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onAddTranscript(inputText.trim());
      setInputText("");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Transcript list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {transcript.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <MessageSquareIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No transcript yet</p>
            <p className="text-sm mt-2">Start typing or recording to add entries</p>
          </div>
        ) : (
          transcript.map((chunk) => {
            const Icon = speakerIcons[chunk.speaker];
            return (
              <div
                key={chunk.id}
                className={`p-3 rounded-lg border-l-4 ${speakerColors[chunk.speaker]}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="font-medium text-sm">
                    {SPEAKER_NAMES[chunk.speaker]}
                  </span>
                  <span className="text-xs opacity-60">
                    {formatTime(chunk.created_at)}
                  </span>
                </div>
                <p className="text-sm">{chunk.text}</p>
              </div>
            );
          })
        )}
        <div ref={transcriptEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        {/* Speaker selector */}
        <div className="flex gap-2 mb-3">
          {(["staff", "patient", "clinician"] as SpeakerRole[]).map((speaker) => {
            const Icon = speakerIcons[speaker];
            return (
              <button
                key={speaker}
                onClick={() => onSpeakerChange(speaker)}
                disabled={disabled}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
                  transition-all duration-200
                  ${
                    currentSpeaker === speaker
                      ? "bg-primary-100 text-primary-700 ring-2 ring-primary-500"
                      : "bg-white text-gray-600 hover:bg-gray-100"
                  }
                  ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                <Icon className="w-4 h-4" />
                {SPEAKER_NAMES[speaker]}
              </button>
            );
          })}
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          {onToggleRecording && (
            <button
              type="button"
              onClick={onToggleRecording}
              disabled={disabled}
              className={`
                p-3 rounded-lg transition-colors
                ${
                  isRecording
                    ? "bg-red-100 text-red-600 hover:bg-red-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              {isRecording ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          )}

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Enter ${SPEAKER_NAMES[currentSpeaker].toLowerCase()}'s statement...`}
            disabled={disabled}
            className="input flex-1"
          />

          <button
            type="submit"
            disabled={disabled || !inputText.trim()}
            className="btn-primary flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageSquareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}
