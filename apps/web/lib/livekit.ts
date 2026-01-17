// LiveKit Integration
// Handles room connection and transcription

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SpeakerRole } from "./types";
import { upsertTranscript } from "./api";

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";

interface TranscriptSegment {
  speaker: SpeakerRole;
  text: string;
  timestamp: number;
  isFinal: boolean;
}

interface UseLivekitTranscriptionOptions {
  onSegment?: (segment: TranscriptSegment) => void;
  debounceMs?: number;
  autoSave?: boolean;
}

interface UseLivekitTranscriptionReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  segments: TranscriptSegment[];
  currentSpeaker: SpeakerRole;
  setCurrentSpeaker: (speaker: SpeakerRole) => void;
  addManualTranscript: (text: string) => void;
}

/**
 * Hook for LiveKit transcription
 */
export function useLivekitTranscription(
  encounterId: string,
  token: string | null,
  options: UseLivekitTranscriptionOptions = {}
): UseLivekitTranscriptionReturn {
  const {
    onSegment,
    debounceMs = 1000,
    autoSave = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<SpeakerRole>("staff");

  const roomRef = useRef<unknown>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTextRef = useRef<string>("");

  // Save transcript to Supabase
  const saveTranscript = useCallback(
    async (text: string, speaker: SpeakerRole) => {
      if (!text.trim() || !autoSave) return;

      try {
        await upsertTranscript(encounterId, speaker, text.trim(), Date.now());
      } catch (err) {
        console.error("Failed to save transcript:", err);
      }
    },
    [encounterId, autoSave]
  );

  // Debounced save
  const debouncedSave = useCallback(
    (text: string, speaker: SpeakerRole) => {
      pendingTextRef.current = text;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        if (pendingTextRef.current) {
          saveTranscript(pendingTextRef.current, speaker);
          pendingTextRef.current = "";
        }
      }, debounceMs);
    },
    [debounceMs, saveTranscript]
  );

  // Add segment
  const addSegment = useCallback(
    (segment: TranscriptSegment) => {
      setSegments((prev) => [...prev, segment]);
      onSegment?.(segment);

      if (segment.isFinal) {
        debouncedSave(segment.text, segment.speaker);
      }
    },
    [onSegment, debouncedSave]
  );

  // Connect to LiveKit room
  const connect = useCallback(async () => {
    if (!token || !LIVEKIT_URL) {
      setError("LiveKit not configured");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Dynamic import to avoid SSR issues
      const { Room, RoomEvent } = await import("livekit-client");

      const room = new Room();
      roomRef.current = room;

      // Set up event handlers
      room.on(RoomEvent.Connected, () => {
        setIsConnected(true);
        setIsConnecting(false);
      });

      room.on(RoomEvent.Disconnected, () => {
        setIsConnected(false);
      });

      // Handle transcription events (if available)
      room.on(RoomEvent.TranscriptionReceived, (transcription: unknown) => {
        const t = transcription as { segments?: Array<{ text: string; final: boolean }> };
        if (t.segments) {
          for (const seg of t.segments) {
            addSegment({
              speaker: currentSpeaker,
              text: seg.text,
              timestamp: Date.now(),
              isFinal: seg.final,
            });
          }
        }
      });

      // Connect to room
      await room.connect(LIVEKIT_URL, token);
    } catch (err) {
      console.error("LiveKit connection error:", err);
      setError(err instanceof Error ? err.message : "Connection failed");
      setIsConnecting(false);
    }
  }, [token, currentSpeaker, addSegment]);

  // Disconnect from room
  const disconnect = useCallback(() => {
    if (roomRef.current) {
      (roomRef.current as { disconnect: () => void }).disconnect();
      roomRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Manual transcript entry
  const addManualTranscript = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      const segment: TranscriptSegment = {
        speaker: currentSpeaker,
        text: text.trim(),
        timestamp: Date.now(),
        isFinal: true,
      };

      addSegment(segment);
      saveTranscript(text.trim(), currentSpeaker);
    },
    [currentSpeaker, addSegment, saveTranscript]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    segments,
    currentSpeaker,
    setCurrentSpeaker,
    addManualTranscript,
  };
}

/**
 * Simple hook for manual transcription (no LiveKit)
 */
export function useManualTranscription(encounterId: string) {
  const [currentSpeaker, setCurrentSpeaker] = useState<SpeakerRole>("staff");
  const [isSaving, setIsSaving] = useState(false);

  const addTranscript = useCallback(
    async (text: string, speaker?: SpeakerRole) => {
      if (!text.trim()) return;

      setIsSaving(true);
      try {
        await upsertTranscript(
          encounterId,
          speaker || currentSpeaker,
          text.trim(),
          Date.now()
        );
      } catch (err) {
        console.error("Failed to save transcript:", err);
      } finally {
        setIsSaving(false);
      }
    },
    [encounterId, currentSpeaker]
  );

  return {
    currentSpeaker,
    setCurrentSpeaker,
    addTranscript,
    isSaving,
  };
}

export default useLivekitTranscription;
