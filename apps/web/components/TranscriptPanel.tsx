"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, User, Stethoscope, UserCircle, Volume2, Loader2, Waves, Wifi, AlertCircle } from "lucide-react";
import type { TranscriptChunk, SpeakerRole } from "@/lib/types";
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
    bg: "bg-gradient-to-r from-primary-50 to-primary-50/30",
    border: "border-l-primary-500",
    badge: "bg-primary-100 text-primary-700",
    dot: "bg-primary-500",
  },
  clinician: {
    bg: "bg-gradient-to-r from-sage-50 to-sage-50/30",
    border: "border-l-sage-500",
    badge: "bg-sage-100 text-sage-700",
    dot: "bg-sage-500",
  },
  staff: {
    bg: "bg-gradient-to-r from-surface-100 to-surface-50",
    border: "border-l-ink-400",
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

  // Check if LiveKit is configured
  const livekitConfigured = Boolean(livekitToken && roomName && LIVEKIT_URL);

  // Auto-scroll to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, liveText, processingQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  // Process and send transcript to server
  const sendToServer = useCallback(
    async (text: string) => {
      if (!text.trim() || text.trim().length < 3) {
        console.log("⚠️ Skipping short text:", text);
        return;
      }

      const trimmedText = text.trim();
      console.log(`💾 Sending transcript to server: "${trimmedText}"`);
      setProcessingQueue((prev) => [...prev, trimmedText]);

      try {
        const result = await onAddTranscript(trimmedText);
        console.log("✅ Transcript saved successfully:", result);
      } catch (err) {
        console.error("❌ Failed to save transcript:", err);
      } finally {
        setProcessingQueue((prev) => prev.filter((t) => t !== trimmedText));
      }
    },
    [onAddTranscript]
  );

  // Start LiveKit recording
  const startRecording = useCallback(async () => {
    if (!livekitToken || !roomName || !LIVEKIT_URL) {
      setError("LiveKit is not configured. Please check your environment variables.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Dynamic import to avoid SSR issues
      const { Room, RoomEvent, Track, DataPacket_Kind } = await import("livekit-client");

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      // Handle connection events
      room.on(RoomEvent.Connected, () => {
        console.log("✅ Connected to LiveKit room:", roomName);
        setIsConnected(true);
        setIsConnecting(false);
        setIsRecording(true);
        setError(null);

        timerRef.current = setInterval(() => {
          setRecordingTime((t) => t + 1);
        }, 1000);
      });

      room.on(RoomEvent.Disconnected, (reason) => {
        console.log("❌ Disconnected from LiveKit room:", reason);
        setIsConnected(false);
        setIsRecording(false);
      });

      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log("Connection state:", state);
      });

      // Handle transcription from LiveKit STT Agent
      room.on(RoomEvent.TranscriptionReceived, (segments: any, participant: any) => {
        console.log("📝 Transcription received:", segments);
        
        if (Array.isArray(segments)) {
          for (const seg of segments) {
            if (seg.final && seg.text) {
              // Final transcription - send to server
              sendToServer(seg.text);
              setLiveText("");
            } else if (seg.text) {
              // Interim transcription - show live
              setLiveText(seg.text);
            }
          }
        } else if (segments?.text) {
          // Single segment
          if (segments.final) {
            sendToServer(segments.text);
            setLiveText("");
          } else {
            setLiveText(segments.text);
          }
        }
      });

      // Handle data messages (alternative transcription delivery)
      room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant: any, kind: any) => {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          console.log("📨 Data received from agent:", data);
          
          if (data.type === "transcription" || data.transcript) {
            const text = data.text || data.transcript;
            console.log(`📝 Processing transcription: "${text}" (final: ${data.final || data.is_final})`);
            
            if (data.final || data.is_final) {
              console.log("💾 Saving final transcription to database...");
              sendToServer(text);
              setLiveText("");
            } else {
              console.log("👁️ Showing interim transcription...");
              setLiveText(text);
            }
          } else {
            console.log("⚠️ Data received but not transcription:", data);
          }
        } catch (e) {
          console.error("❌ Error parsing data message:", e);
        }
      });

      // Handle track subscribed (for debugging)
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log("🎤 Track subscribed:", track.kind, "from", participant.identity);
      });

      // Connect to room
      console.log("🔌 Connecting to LiveKit:", LIVEKIT_URL);
      await room.connect(LIVEKIT_URL, livekitToken);

      // Enable microphone for audio capture
      console.log("🎙️ Enabling microphone...");
      await room.localParticipant.setMicrophoneEnabled(true);
      console.log("✅ Microphone enabled");

    } catch (err) {
      console.error("LiveKit connection error:", err);
      setError(`Failed to connect to LiveKit: ${err instanceof Error ? err.message : "Unknown error"}`);
      setIsConnecting(false);
      setIsRecording(false);
    }
  }, [livekitToken, roomName, sendToServer]);

  // Stop recording
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setIsConnecting(false);
    setLiveText("");

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (roomRef.current) {
      console.log("🔌 Disconnecting from LiveKit...");
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
      {/* Header */}
      <div className="px-6 py-5 border-b border-surface-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Waves className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink-800">Live Transcript</h2>
              <p className="text-sm text-ink-500 mt-0.5">
                {isConnected ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                    <Wifi className="w-3.5 h-3.5" />
                    LiveKit Connected
                  </span>
                ) : (
                  "Powered by LiveKit STT"
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* LiveKit Badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${
              livekitConfigured 
                ? "bg-emerald-100 text-emerald-700" 
                : "bg-red-100 text-red-700"
            }`}>
              <Wifi className="w-3.5 h-3.5" />
              {livekitConfigured ? "LiveKit Ready" : "LiveKit Not Configured"}
            </div>

            {isRecording && (
              <div className="flex items-center gap-3 bg-red-50 px-5 py-2.5 rounded-2xl border border-red-200">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="text-red-700 font-bold tabular-nums">
                  {formatRecordingTime(recordingTime)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Connection Error</p>
            <p className="mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 font-bold text-xl leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* LiveKit not configured warning */}
      {!livekitConfigured && !error && (
        <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">LiveKit Configuration Required</p>
              <p className="mt-1 text-amber-700">
                Set <code className="bg-amber-100 px-1.5 py-0.5 rounded">NEXT_PUBLIC_LIVEKIT_URL</code> in your environment 
                and ensure the encounter has a valid LiveKit token.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Transcript list */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {transcript.length === 0 && !liveText && processingQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-28 h-28 bg-gradient-to-br from-primary-100 to-primary-50 rounded-[2rem] flex items-center justify-center mb-8 shadow-soft">
              <Mic className="w-14 h-14 text-primary-500" />
            </div>
            <h3 className="text-2xl font-bold text-ink-800 mb-3">
              Ready to Transcribe
            </h3>
            <p className="text-ink-500 max-w-md leading-relaxed mb-8">
              Click the button below to connect to LiveKit and start real-time transcription.
              AI will automatically detect speakers and analyze each sentence.
            </p>
            <div className="flex items-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-ink-400"></div>
                <span className="text-ink-500">Staff (Questions)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary-500"></div>
                <span className="text-ink-500">Patient (Answers)</span>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs text-emerald-600 font-medium">
              <Wifi className="w-4 h-4" />
              Powered by LiveKit Real-time STT
            </div>
          </div>
        ) : (
          <>
            {transcript.map((chunk) => {
              const Icon = speakerIcons[chunk.speaker];
              const style = speakerStyles[chunk.speaker];
              return (
                <div
                  key={chunk.id}
                  className={`p-5 rounded-2xl ${style.bg} border-l-4 ${style.border} transition-all duration-300 hover:shadow-soft`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold ${style.badge}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                      <Icon className="w-3.5 h-3.5" />
                      {SPEAKER_NAMES[chunk.speaker]}
                    </span>
                    <span className="text-xs text-ink-400">
                      {formatTime(chunk.created_at)}
                    </span>
                  </div>
                  <p className="text-ink-700 leading-relaxed text-base">
                    {chunk.text}
                  </p>
                </div>
              );
            })}

            {/* Processing queue - items being analyzed by AI */}
            {processingQueue.map((text, index) => (
              <div
                key={`processing-${index}`}
                className="p-5 rounded-2xl bg-gradient-to-r from-accent-50 to-accent-50/30 border-l-4 border-l-accent-400"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-accent-100 text-accent-700">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    AI Analyzing...
                  </span>
                </div>
                <p className="text-ink-600">{text}</p>
              </div>
            ))}

            {/* Live transcription */}
            {liveText && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-primary-50/50 to-surface-50 border-l-4 border-l-primary-300 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary-100 text-primary-700">
                    <Volume2 className="w-3.5 h-3.5" />
                    Listening...
                  </span>
                </div>
                <p className="text-ink-500 italic">{liveText}</p>
              </div>
            )}
          </>
        )}
        <div ref={transcriptEndRef} />
      </div>

      {/* Recording controls */}
      <div className="border-t border-surface-200 p-6 bg-surface-50">
        <div className="flex justify-center">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled || isConnecting || !livekitConfigured}
            className={`
              relative px-10 py-5 rounded-2xl font-bold text-lg
              transition-all duration-300 flex items-center gap-4
              ${
                isConnecting
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-soft-lg"
                  : isRecording
                  ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-soft-lg recording-pulse"
                  : livekitConfigured
                  ? "bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-soft hover:shadow-glow hover:-translate-y-0.5"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }
            `}
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Connecting to LiveKit...
              </>
            ) : isRecording ? (
              <>
                <Square className="w-6 h-6" fill="currentColor" />
                Stop Transcribing
              </>
            ) : (
              <>
                <Mic className="w-6 h-6" />
                Start Transcribing
                {livekitConfigured && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
                  </span>
                )}
              </>
            )}
          </button>
        </div>

        <p className="text-center text-sm text-ink-500 mt-5">
          {isConnecting
            ? "Establishing connection to LiveKit server..."
            : isRecording
            ? "Speak naturally. LiveKit STT transcribes in real-time, AI detects speakers."
            : livekitConfigured
            ? "Click to connect to LiveKit and start real-time transcription."
            : "LiveKit must be configured to use transcription."}
        </p>
      </div>
    </div>
  );
}
