"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { 
  Mic, 
  Square, 
  User, 
  Stethoscope, 
  UserCircle, 
  Volume2, 
  Loader2, 
  Waves, 
  Wifi, 
  AlertCircle,
  Clock,
} from "lucide-react";
import type { TranscriptChunk } from "@/lib/types";
import { SPEAKER_NAMES, formatTime } from "@/lib/safety";

interface TranscriptPanelProps {
  transcript: TranscriptChunk[];
  onAddTranscript: (text: string) => Promise<any>;
  disabled?: boolean;
  livekitToken?: string | null;
  roomName?: string | null;
}

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";

const speakerIcons = {
  patient: User,
  clinician: Stethoscope,
  staff: UserCircle,
};

const speakerStyles = {
  patient: {
    bg: "bg-primary-50/50",
    text: "text-primary-900",
    badge: "bg-primary-100 text-primary-600",
    dot: "bg-primary-400",
  },
  clinician: {
    bg: "bg-sage-50/50",
    text: "text-sage-900",
    badge: "bg-sage-100 text-sage-600",
    dot: "bg-sage-400",
  },
  staff: {
    bg: "bg-surface-100/50",
    text: "text-ink-900",
    badge: "bg-surface-200 text-ink-600",
    dot: "bg-ink-400",
  },
};

export default function TranscriptPanel({
  transcript,
  onAddTranscript,
  disabled,
  livekitToken,
  roomName,
}: TranscriptPanelProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [liveText, setLiveText] = useState("");
  const [processingQueue, setProcessingQueue] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const roomRef = useRef<any>(null);

  const livekitConfigured = Boolean(livekitToken && roomName && LIVEKIT_URL);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, liveText, processingQueue]);

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const sendToServer = useCallback(
    async (text: string) => {
      if (!text.trim() || text.trim().length < 3) return;
      const trimmedText = text.trim();
      setProcessingQueue((prev) => [...prev, trimmedText]);
      try {
        await onAddTranscript(trimmedText);
      } catch (err) {
        console.error("Failed to save transcript:", err);
      } finally {
        setProcessingQueue((prev) => prev.filter((t) => t !== trimmedText));
      }
    },
    [onAddTranscript]
  );

  const startRecording = useCallback(async () => {
    if (!livekitToken || !roomName || !LIVEKIT_URL) {
      setError("LiveKit not configured");
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const { Room, RoomEvent } = await import("livekit-client");
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.Connected, () => {
        setIsConnected(true);
        setIsConnecting(false);
        setIsRecording(true);
        timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
      });

      room.on(RoomEvent.Disconnected, () => {
        setIsConnected(false);
        setIsRecording(false);
      });

      const handleReceiveNotes = async (rpc: any) => {
        try {
          const payload = JSON.parse(rpc.payload);
          if (payload?.notes) {
            window.dispatchEvent(new CustomEvent('echo-health-notes-updated', { detail: { notes: payload.notes } }));
          }
          return 'Success';
        } catch (e) { return 'Error'; }
      };

      const handleReceiveTranscription = async (rpc: any) => {
        try {
          const payload = JSON.parse(rpc.payload);
          if (payload?.transcription) {
            setLiveText(payload.transcription);
            window.dispatchEvent(new CustomEvent('echo-health-transcription-updated', { detail: { transcription: payload.transcription } }));
          }
          return 'Success';
        } catch (e) { return 'Error'; }
      };

      room.localParticipant.registerRpcMethod('receive_notes', handleReceiveNotes);
      room.localParticipant.registerRpcMethod('receive_transcription', handleReceiveTranscription);

      room.on(RoomEvent.TranscriptionReceived, (segments: any) => {
        if (Array.isArray(segments)) {
          for (const seg of segments) {
            if (seg.final && seg.text) { sendToServer(seg.text); setLiveText(""); }
            else if (seg.text) setLiveText(seg.text);
          }
        }
      });

      await room.connect(LIVEKIT_URL, livekitToken);
      await room.localParticipant.setMicrophoneEnabled(true);
    } catch (err) {
      setError(`Connection failed: ${err instanceof Error ? err.message : "Unknown"}`);
      setIsConnecting(false);
      setIsRecording(false);
    }
  }, [livekitToken, roomName, sendToServer]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setIsConnecting(false);
    setLiveText("");
    if (timerRef.current) clearInterval(timerRef.current);
    if (roomRef.current) {
      try {
        roomRef.current.localParticipant.unregisterRpcMethod('receive_notes');
        roomRef.current.localParticipant.unregisterRpcMethod('receive_transcription');
      } catch (e) {}
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    setIsConnected(false);
    setRecordingTime(0);
  }, []);

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Scrollable Transcript Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {transcript.length === 0 && !liveText && processingQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
            <div className="w-20 h-20 bg-primary-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner-soft">
              <Mic className="w-10 h-10 text-primary-400" />
            </div>
            <h3 className="text-xl font-bold text-ink-900 mb-2">Start Clinical Recording</h3>
            <p className="text-sm text-ink-400 leading-relaxed mb-6">
              Connect to the secure LiveKit session to begin real-time patient transcription.
            </p>
          </div>
        ) : (
          <>
            {transcript.map((chunk) => {
              const Icon = speakerIcons[chunk.speaker];
              const style = speakerStyles[chunk.speaker];
              return (
                <div key={chunk.id} className="group animate-fade-in">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${style.badge}`}>
                      <Icon className="w-3 h-3" />
                      {SPEAKER_NAMES[chunk.speaker]}
                    </div>
                    <span className="text-[10px] font-medium text-ink-300">
                      {formatTime(chunk.created_at)}
                    </span>
                  </div>
                  <div className={`p-4 rounded-2xl ${style.bg} border border-transparent hover:border-surface-200 transition-all`}>
                    <p className={`text-sm leading-relaxed ${style.text}`}>
                      {chunk.text}
                    </p>
                  </div>
                </div>
              );
            })}

            {processingQueue.map((text, index) => (
              <div key={`proc-${index}`} className="opacity-60 animate-pulse">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-accent-50 text-accent-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Analyzing
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-accent-50/30 border border-dashed border-accent-200">
                  <p className="text-sm text-ink-600">{text}</p>
                </div>
              </div>
            ))}

            {liveText && (
              <div className="animate-pulse">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-primary-50 text-primary-600">
                    <Volume2 className="w-3 h-3" />
                    Live
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-primary-50/20 border border-primary-100">
                  <p className="text-sm text-ink-400 italic">{liveText}</p>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={transcriptEndRef} />
      </div>

      {/* Control Area */}
      <div className="p-8 border-t border-surface-100 bg-surface-50/30 shrink-0">
        <div className="flex items-center justify-between gap-6 max-w-4xl mx-auto">
          <div className="flex-1">
            {error ? (
              <div className="flex items-center gap-3 text-red-500 text-sm font-medium">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            ) : isRecording ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-full border border-red-100 shadow-sm font-bold tabular-nums">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {formatRecordingTime(recordingTime)}
                </div>
                <p className="text-xs text-ink-400 font-medium">Recording in progress...</p>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${livekitConfigured ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
                  <Wifi className="w-3 h-3" />
                  {livekitConfigured ? "Secure Link Active" : "Link Required"}
                </div>
                <p className="text-xs text-ink-300 font-medium">STT Ready</p>
              </div>
            )}
          </div>

          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled || isConnecting || !livekitConfigured}
            className={`
              relative flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all
              ${isRecording 
                ? "bg-ink-900 text-white shadow-soft hover:bg-black" 
                : "bg-primary-500 text-white shadow-glow hover:bg-primary-600 hover:-translate-y-0.5"}
              ${(disabled || isConnecting || !livekitConfigured) ? "opacity-50 grayscale cursor-not-allowed" : ""}
            `}
          >
            {isConnecting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isRecording ? (
              <Square className="w-5 h-5 fill-current" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
            <span>{isConnecting ? "Connecting..." : isRecording ? "Stop Session" : "Start Session"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
