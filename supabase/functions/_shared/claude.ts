// Claude (Anthropic) Integration
// LLM calls for field extraction, summarization, etc.

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: "text";
    text: string;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Call Claude API for chat completion
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: {
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<{ content: string; usage: ClaudeResponse["usage"] }> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const {
    model = "claude-sonnet-4-20250514",
    systemPrompt,
    temperature = 0.3,
    maxTokens = 2000,
  } = options;

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (systemPrompt) {
    body.system = systemPrompt;
  }

  const response = await fetch(`${ANTHROPIC_API_URL}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data: ClaudeResponse = await response.json();
  const content = data.content[0]?.text ?? "";

  return {
    content,
    usage: data.usage,
  };
}

/**
 * Simple completion helper
 */
export async function complete(
  systemPrompt: string,
  userPrompt: string,
  options?: Omit<Parameters<typeof chatCompletion>[1], "systemPrompt">
): Promise<string> {
  const result = await chatCompletion(
    [{ role: "user", content: userPrompt }],
    { ...options, systemPrompt }
  );
  return result.content;
}

/**
 * JSON completion helper
 */
export async function completeJson<T>(
  systemPrompt: string,
  userPrompt: string,
  options?: Omit<Parameters<typeof chatCompletion>[1], "systemPrompt">
): Promise<T> {
  // Add JSON instruction to system prompt
  const jsonSystemPrompt = `${systemPrompt}

IMPORTANT: You must respond with valid JSON only. No markdown, no code blocks, no explanations - just the raw JSON object.`;

  const result = await chatCompletion(
    [{ role: "user", content: userPrompt }],
    { ...options, systemPrompt: jsonSystemPrompt }
  );

  // Clean up response - remove any markdown code blocks if present
  let jsonStr = result.content.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    throw new Error(`Failed to parse JSON response: ${result.content}`);
  }
}

/**
 * Check if Claude is configured
 */
export function isConfigured(): boolean {
  return Boolean(ANTHROPIC_API_KEY);
}

export default chatCompletion;
