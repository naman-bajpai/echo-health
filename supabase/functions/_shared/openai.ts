// OpenAI Integration
// Used for cleaning transcriptions and detecting speakers

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
  } = {}
): Promise<{ content: string; usage: ChatCompletionResponse["usage"] }> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const {
    model = "gpt-4o-mini",
    temperature = 0.1,
    maxTokens = 500,
  } = options;

  const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
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
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data: ChatCompletionResponse = await response.json();
  const content = data.choices[0]?.message?.content ?? "";

  return {
    content,
    usage: data.usage,
  };
}

interface ProcessedTranscript {
  speaker: "staff" | "patient" | "clinician";
  text: string;
  isQuestion: boolean;
}

/**
 * Process transcription - detect speaker and clean text
 * Analyzes if it's a question (staff) or answer (patient)
 */
export async function processTranscription(
  rawText: string,
  conversationContext: string = ""
): Promise<ProcessedTranscript> {
  if (!OPENAI_API_KEY) {
    // Fallback: basic detection without AI
    return basicSpeakerDetection(rawText);
  }

  try {
    const result = await chatCompletion([
      {
        role: "system",
        content: `You are analyzing a healthcare conversation transcript. Your job is to:
1. Detect who is speaking: "staff" (asking questions, giving instructions) or "patient" (answering questions, describing symptoms)
2. Clean up the text (remove filler words like um, uh, like)
3. Determine if it's a question or answer

Rules for speaker detection:
- Questions about symptoms, medical history, medications = STAFF
- Answers describing how they feel, symptoms, personal info = PATIENT
- Instructions, explanations about procedures = STAFF
- Confirmations like "yes", "no", descriptions of pain = PATIENT
- Greetings can be either, but in medical context staff usually initiates

Respond in JSON format only:
{"speaker": "staff" or "patient", "text": "cleaned text", "isQuestion": true/false}`
      },
      {
        role: "user",
        content: `Previous context: ${conversationContext || "Start of conversation"}

New speech to analyze: "${rawText}"

Respond with JSON only.`
      }
    ], {
      model: "gpt-4o-mini",
      temperature: 0.1,
      maxTokens: 300,
    });

    // Parse JSON response
    let parsed: ProcessedTranscript;
    try {
      const jsonStr = result.content.trim().replace(/```json\n?|\n?```/g, '');
      parsed = JSON.parse(jsonStr);
    } catch {
      // If JSON parsing fails, use basic detection
      return basicSpeakerDetection(rawText);
    }

    // Validate speaker
    if (!["staff", "patient", "clinician"].includes(parsed.speaker)) {
      parsed.speaker = "staff";
    }

    return parsed;
  } catch (error) {
    console.error("OpenAI processing error:", error);
    return basicSpeakerDetection(rawText);
  }
}

/**
 * Basic speaker detection without AI
 */
function basicSpeakerDetection(text: string): ProcessedTranscript {
  const lowerText = text.toLowerCase();
  
  // Question indicators (likely staff)
  const questionPatterns = [
    /^(what|when|where|why|how|do you|are you|can you|have you|is there|did you)/i,
    /\?$/,
    /tell me about/i,
    /describe/i,
    /any (pain|symptoms|allergies|medications)/i,
  ];
  
  // Answer/patient indicators
  const answerPatterns = [
    /^(yes|no|yeah|nope|i have|i feel|i am|i've been|it hurts|my)/i,
    /\b(hurts|pain|ache|feeling|felt|started|days ago|weeks ago)\b/i,
    /\b(taking|medication|allergic)\b/i,
  ];
  
  const isQuestion = questionPatterns.some(p => p.test(lowerText));
  const isAnswer = answerPatterns.some(p => p.test(lowerText));
  
  // Clean text
  const cleanedText = text
    .replace(/\b(um|uh|er|ah|like|you know|basically|actually|literally)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    speaker: isQuestion && !isAnswer ? "staff" : isAnswer ? "patient" : "staff",
    text: cleanedText,
    isQuestion,
  };
}

/**
 * Check if OpenAI is configured
 */
export function isConfigured(): boolean {
  return Boolean(OPENAI_API_KEY);
}

export default chatCompletion;
