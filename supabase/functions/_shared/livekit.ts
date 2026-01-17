// LiveKit Token Generation
// Generates tokens for room access

import { encode as base64Encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const LIVEKIT_API_KEY = Deno.env.get("LIVEKIT_API_KEY") ?? "";
const LIVEKIT_API_SECRET = Deno.env.get("LIVEKIT_API_SECRET") ?? "";

interface TokenClaims {
  iss: string; // API Key
  sub: string; // Participant identity
  nbf: number; // Not before
  exp: number; // Expiration
  video?: {
    roomJoin?: boolean;
    room?: string;
    canPublish?: boolean;
    canSubscribe?: boolean;
    canPublishData?: boolean;
  };
}

/**
 * Generate a JWT token for LiveKit room access
 */
export async function generateLivekitToken(
  roomName: string,
  participantIdentity: string,
  options: {
    canPublish?: boolean;
    canSubscribe?: boolean;
    canPublishData?: boolean;
    ttlSeconds?: number;
  } = {}
): Promise<string> {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error("LiveKit credentials not configured");
  }

  const {
    canPublish = true,
    canSubscribe = true,
    canPublishData = true,
    ttlSeconds = 3600, // 1 hour default
  } = options;

  const now = Math.floor(Date.now() / 1000);

  const claims: TokenClaims = {
    iss: LIVEKIT_API_KEY,
    sub: participantIdentity,
    nbf: now,
    exp: now + ttlSeconds,
    video: {
      roomJoin: true,
      room: roomName,
      canPublish,
      canSubscribe,
      canPublishData,
    },
  };

  return await signJwt(claims, LIVEKIT_API_SECRET);
}

/**
 * Sign JWT with HS256
 */
async function signJwt(
  payload: Record<string, unknown>,
  secret: string
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = await hmacSha256(data, secret);

  return `${data}.${signature}`;
}

/**
 * HMAC-SHA256 signature
 */
async function hmacSha256(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  return base64UrlEncode(new Uint8Array(signature));
}

/**
 * Base64 URL encode
 */
function base64UrlEncode(data: string | Uint8Array): string {
  let base64: string;
  if (typeof data === "string") {
    base64 = btoa(data);
  } else {
    base64 = base64Encode(data);
  }
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export default generateLivekitToken;
