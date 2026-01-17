// OpenAI Integration
// LLM calls for field extraction, summarization, etc.

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const OPENAI_API_URL = "https://api.openai.com/v1";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
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
export async function chatCompletion(
  messages: ChatMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: "text" | "json_object";
  } = {}
): Promise<{ content: string; usage: ChatCompletionResponse["usage"] }> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const {
    model = "gpt-4-turbo-preview",
    temperature = 0.3,
    maxTokens = 2000,
    responseFormat = "text",
  } = options;

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (responseFormat === "json_object") {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data: ChatCompletionResponse = await response.json();
  const content = data.choices[0]?.message?.content ?? "";

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
  options?: Parameters<typeof chatCompletion>[1]
): Promise<string> {
  const result = await chatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    options
  );
  return result.content;
}

/**
 * JSON completion helper
 */
export async function completeJson<T>(
  systemPrompt: string,
  userPrompt: string,
  options?: Omit<Parameters<typeof chatCompletion>[1], "responseFormat">
): Promise<T> {
  const result = await chatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { ...options, responseFormat: "json_object" }
  );

  try {
    return JSON.parse(result.content) as T;
  } catch {
    throw new Error(`Failed to parse JSON response: ${result.content}`);
  }
}

/**
 * Check if OpenAI is configured
 */
export function isConfigured(): boolean {
  return Boolean(OPENAI_API_KEY);
}

export default chatCompletion;
