"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Mic, Square, User, Stethoscope, UserCircle, Volume2, Wifi, WifiOff, Loader2 } from "lucide-react";
import type { TranscriptChunk, SpeakerRole } from "@/lib/types";
import { SPEAKER_NAMES, formatTime } from "@/lib/safety";

interface TranscriptPanelProps {
  transcript: TranscriptChunk[];
  currentSpeaker: SpeakerRole;
  onSpeakerChange: (speaker: SpeakerRole) => void;
  onAddTranscript: (text: string) => void;
  livekitToken?: string | null;
  roomName?: string | null;
  disabled?: boolean;
}

const speakerIcons = {
  patient: User,
  clinician: Stethoscope,
  staff: UserCircle,
};

const speakerColors = {
  patient: "bg-blue-50 border-l-4 border-blue-500",
  clinician: "bg-emerald-50 border-l-4 border-emerald-500",
  staff: "bg-slate-50 border-l-4 border-slate-400",
};

const speakerBadgeColors = {
  patient: "bg-blue-100 text-blue-700",
  clinician: "bg-emerald-100 text-emerald-700",
  staff: "bg-slate-100 text-slate-700",
};

export default function TranscriptPanel({
  transcript,
  currentSpeaker,
  onSpeakerChange,
  onAddTranscript,
  livekitToken,
  roomName,
  disabled,
}: TranscriptPanelProps) {
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, liveTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onAddTranscript(inputText.trim());
      setInputText("");
    }
  };

  // Use Web Speech API for browser-based STT
  const startBrowserSTT = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError("Speech recognition not supported in this browser. Please use Chrome.");
      return false;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      setIsConnected(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Show interim results
      setLiveTranscript(interimTranscript);

      // Save final results
      if (finalTranscript) {
        onAddTranscript(finalTranscript.trim());
        setLiveTranscript("");
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== 'no-speech') {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // Restart if still recording
      if (isRecording && recognitionRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // Already started
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    return true;
  }, [onAddTranscript, isRecording]);

  // Connect to LiveKit for STT
  const connectToLiveKit = useCallback(async () => {
    if (!livekitToken || !roomName) {
      // Fallback to browser STT
      return startBrowserSTT();
    }

    setIsConnecting(true);
    setError(null);

    try {
      const { Room, RoomEvent } = await import("livekit-client");
      
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      roomRef.current = room;

      room.on(RoomEvent.Connected, () => {
        setIsConnected(true);
        setIsConnecting(false);
        setIsRecording(true);
      });

      room.on(RoomEvent.Disconnected, () => {
        setIsConnected(false);
        setIsRecording(false);
      });

      // Handle transcription from LiveKit
      room.on(RoomEvent.TranscriptionReceived, (segments: any) => {
        for (const segment of segments) {
          if (segment.final) {
            onAddTranscript(segment.text);
            setLiveTranscript("");
          } else {
            setLiveTranscript(segment.text);
          }
        }
      });

      // Handle data messages (alternative transcription delivery)
      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          if (data.type === 'transcription') {
            if (data.final) {
              onAddTranscript(data.text);
              setLiveTranscript("");
            } else {
              setLiveTranscript(data.text);
            }
          }
        } catch (e) {
          // Not JSON, ignore
        }
      });

      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
      if (!livekitUrl) {
        throw new Error("LiveKit URL not configured");
      }

      await room.connect(livekitUrl, livekitToken);
      
      // Enable microphone
      await room.localParticipant.setMicrophoneEnabled(true);

      return true;
    } catch (err) {
      console.error("LiveKit connection error:", err);
      setError("LiveKit connection failed. Using browser speech recognition.");
      setIsConnecting(false);
      // Fallback to browser STT
      return startBrowserSTT();
    }
  }, [livekitToken, roomName, onAddTranscript, startBrowserSTT]);

  const startRecording = async () => {
    setRecordingTime(0);
    
    // Start timer
    timerRef.current = setInterval(() => {
      setRecordingTime(t => t + 1);
    }, 1000);

    // Try LiveKit first, fallback to browser STT
    const success = await connectToLiveKit();
    
    if (!success) {
      setError("Could not start speech recognition. Please check microphone permissions.");
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsConnected(false);
    setLiveTranscript("");
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop browser STT
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // Disconnect from LiveKit
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Live Transcript</h2>
            <p className="text-sm text-gray-500">{transcript.length} entries recorded</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Connection status */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
              isConnected 
                ? "bg-green-100 text-green-700" 
                : "bg-gray-100 text-gray-500"
            }`}>
              {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {isConnected ? "Live" : "Offline"}
            </div>
            
            {isRecording && (
              <div className="flex items-center gap-3 bg-red-50 px-4 py-2 rounded-full">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="text-red-700 font-medium">{formatRecordingTime(recordingTime)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          {error}
        </div>
      )}

      {/* Transcript list */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {transcript.length === 0 && !liveTranscript ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Volume2 className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">Ready to record</h3>
            <p className="text-gray-500 max-w-sm">
              Click the microphone button to start recording. Speech will be automatically transcribed in real-time.
            </p>
          </div>
        ) : (
          <>
            {transcript.map((chunk) => {
              const Icon = speakerIcons[chunk.speaker];
              return (
                <div
                  key={chunk.id}
                  className={`p-4 rounded-xl ${speakerColors[chunk.speaker]} transition-all hover:shadow-sm`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${speakerBadgeColors[chunk.speaker]}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {SPEAKER_NAMES[chunk.speaker]}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTime(chunk.created_at)}
                    </span>
                  </div>
                  <p className="text-gray-800 leading-relaxed">{chunk.text}</p>
                </div>
              );
            })}
            
            {/* Live transcription indicator */}
            {liveTranscript && (
              <div className="p-4 rounded-xl bg-primary-50 border-l-4 border-primary-500 animate-pulse">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Transcribing...
                  </span>
                </div>
                <p className="text-gray-600 italic">{liveTranscript}</p>
              </div>
            )}
          </>
        )}
        <div ref={transcriptEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        {/* Speaker selector */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-500 mr-2">Speaker:</span>
          {(["staff", "patient", "clinician"] as SpeakerRole[]).map((speaker) => {
            const Icon = speakerIcons[speaker];
            const isSelected = currentSpeaker === speaker;
            return (
              <button
                key={speaker}
                onClick={() => onSpeakerChange(speaker)}
                disabled={disabled}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                  transition-all duration-200 border-2
                  ${
                    isSelected
                      ? "bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-600/25"
                      : "bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600"
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

        {/* Recording controls */}
        <div className="flex gap-3">
          {/* Record button */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled || isConnecting}
            className={`
              relative p-4 rounded-xl transition-all duration-200 flex-shrink-0
              ${
                isRecording
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600"
                  : isConnecting
                  ? "bg-gray-300 text-gray-500"
                  : "bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 hover:scale-105"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            `}
            title={isRecording ? "Stop recording" : "Start recording"}
          >
            {isConnecting ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : isRecording ? (
              <Square className="w-6 h-6" fill="currentColor" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
            {!isRecording && !isConnecting && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white"></span>
              </span>
            )}
          </button>

          {/* Manual input */}
          <form onSubmit={handleSubmit} className="flex-1 flex gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Or type manually..."
              disabled={disabled}
              className="flex-1 px-5 py-4 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all text-gray-800 placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={disabled || !inputText.trim()}
              className="px-6 py-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-gray-900/20"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>

        <p className="text-xs text-gray-400 mt-3 text-center">
          {isRecording 
            ? "Speaking... Your speech is being transcribed in real-time" 
            : "Click the microphone to start voice recording with automatic transcription"
          }
        </p>
      </div>
    </div>
  );
}
