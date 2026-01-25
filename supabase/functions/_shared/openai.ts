// OpenAI API Integration

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

// Configurable model - defaults to gpt-4o-mini (cheap and fast)
const DEFAULT_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Call OpenAI Chat Completion API
 */
export async function callOpenAI(
  prompt: string,
  options: {
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  if (!OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY not set in Supabase secrets!");
    console.error("Run: npx supabase secrets set OPENAI_API_KEY=sk-...");
    return "";
  }

  const {
    model = DEFAULT_MODEL,
    systemPrompt,
    temperature = 0.3,
    maxTokens = 1000,
  } = options;
  
  console.log(`Using OpenAI model: ${model}`);

  try {
    const messages: ChatMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", response.status, error);
      return "";
    }

    const data: ChatCompletionResponse = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "";
  }
}

/**
 * Call OpenAI and parse JSON response
 */
export async function callOpenAIJSON<T>(
  prompt: string,
  options: {
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<T | null> {
  const response = await callOpenAI(prompt, {
    ...options,
    systemPrompt: options.systemPrompt || "Respond only with valid JSON.",
  });
  return parseJSON<T>(response);
}

/**
 * Parse JSON from OpenAI response
 */
export function parseJSON<T>(text: string): T | null {
  if (!text) return null;
  
  try {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    return JSON.parse(text.trim());
  } catch {
    console.warn("Failed to parse JSON from OpenAI response");
    return null;
  }
}

/**
 * Detect speaker and clean transcript text
 */
export async function processTranscript(
  text: string,
  context?: string
): Promise<{ speaker: string; text: string }> {
  if (!OPENAI_API_KEY) {
    return fallbackProcessTranscript(text);
  }

  const prompt = `Analyze this healthcare conversation snippet:

Text: "${text}"
${context ? `Context: ${context}` : ""}

Determine:
1. Speaker: "staff" (asking questions, giving instructions) or "patient" (answering, describing symptoms)
2. Clean text: Remove filler words (um, uh, like, you know)

Respond with JSON only: {"speaker": "staff" or "patient", "text": "cleaned text"}`;

  const result = await callOpenAIJSON<{ speaker: string; text: string }>(prompt);
  
  if (result) {
    return {
      speaker: result.speaker || "staff",
      text: result.text || text.trim(),
    };
  }
  
  return fallbackProcessTranscript(text);
}

/**
 * Fallback speaker detection without AI
 */
function fallbackProcessTranscript(text: string): { speaker: string; text: string } {
  const lowerText = text.toLowerCase();
  
  const questionPatterns = [
    /^(what|when|where|why|how|do you|are you|can you|have you)/i,
    /\?$/,
  ];
  const answerPatterns = [
    /^(yes|no|yeah|i have|i feel|i am|it hurts|my)/i,
    /\b(hurts|pain|ache|feeling)\b/i,
  ];
  
  const isQuestion = questionPatterns.some((p) => p.test(lowerText));
  const isAnswer = answerPatterns.some((p) => p.test(lowerText));
  
  const speaker = isQuestion && !isAnswer ? "staff" : isAnswer ? "patient" : "staff";
  
  const cleanedText = text
    .replace(/\b(um|uh|er|ah|like|you know|basically|actually)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  
  return { speaker, text: cleanedText };
}

/**
 * Check if OpenAI is configured
 */
export function isConfigured(): boolean {
  return Boolean(OPENAI_API_KEY);
}

export default callOpenAI;
