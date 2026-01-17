// ElevenLabs TTS Integration
// Text-to-speech for patient explanations

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY") ?? "";
const ELEVENLABS_VOICE_ID = Deno.env.get("ELEVENLABS_VOICE_ID") ?? "21m00Tcm4TlvDq8ikWAM"; // Default: Rachel
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

/**
 * Generate speech from text using ElevenLabs
 * Returns audio as Uint8Array (MP3)
 */
export async function textToSpeech(
  text: string,
  options: {
    voiceId?: string;
    modelId?: string;
    voiceSettings?: Partial<VoiceSettings>;
  } = {}
): Promise<Uint8Array> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY not configured");
  }

  const voiceId = options.voiceId || ELEVENLABS_VOICE_ID;
  const modelId = options.modelId || "eleven_monolingual_v1";

  const voiceSettings: VoiceSettings = {
    stability: 0.5,
    similarity_boost: 0.75,
    ...options.voiceSettings,
  };

  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: voiceSettings,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Get available voices
 */
export async function getVoices(): Promise<
  Array<{ voice_id: string; name: string }>
> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY not configured");
  }

  const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch voices: ${response.status}`);
  }

  const data = await response.json();
  return data.voices;
}

/**
 * Check if ElevenLabs is configured
 */
export function isConfigured(): boolean {
  return Boolean(ELEVENLABS_API_KEY);
}

export default textToSpeech;
