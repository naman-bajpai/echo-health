// Claude (Anthropic) API Integration

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

// Use widely available model - can override with CLAUDE_MODEL env var
const DEFAULT_MODEL = Deno.env.get("CLAUDE_MODEL") || "claude-3-5-sonnet-20241022";

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
  usage: { input_tokens: number; output_tokens: number };
}

/**
 * Call Claude API
 */
export async function callClaude(
  prompt: string,
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    system?: string;
  } = {}
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY not set in Supabase secrets!");
    console.error("Run: npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...");
    return "";
  }

  const {
    model = DEFAULT_MODEL,
    maxTokens = 2000,
    temperature = 0.3,
    system,
  } = options;
  
  console.log(`Using Claude model: ${model}`);

  try {
    const body: any = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: "user", content: prompt }],
    };

    if (system) {
      body.system = system;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
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
      console.error("Claude API error:", response.status, error);
      return "";
    }

    const data: ClaudeResponse = await response.json();
    return data.content?.[0]?.text || "";
  } catch (error) {
    console.error("Claude API error:", error);
    return "";
  }
}

/**
 * Call Claude and parse JSON response
 */
export async function callClaudeJSON<T>(
  prompt: string,
  options: {
    model?: string;
    maxTokens?: number;
  } = {}
): Promise<T | null> {
  const response = await callClaude(prompt, options);
  return parseJSON<T>(response);
}

/**
 * Parse JSON from Claude response (handles markdown code blocks)
 */
export function parseJSON<T>(text: string): T | null {
  if (!text) return null;
  
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    // Try direct parse
    return JSON.parse(text.trim());
  } catch {
    console.warn("Failed to parse JSON from Claude response");
    return null;
  }
}

/**
 * Check if Claude is configured
 */
export function isConfigured(): boolean {
  return Boolean(ANTHROPIC_API_KEY);
}

export default callClaude;
