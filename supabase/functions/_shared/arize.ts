// Arize Phoenix Integration
// Observability and trace logging

const ARIZE_SPACE_KEY = Deno.env.get("ARIZE_SPACE_KEY") ?? "";
const ARIZE_API_KEY = Deno.env.get("ARIZE_API_KEY") ?? "";
const ARIZE_API_URL = "https://api.arize.com/v1";

interface TraceSpan {
  name: string;
  context: {
    trace_id: string;
    span_id: string;
  };
  start_time: string;
  end_time?: string;
  status?: "OK" | "ERROR";
  attributes?: Record<string, unknown>;
  events?: Array<{
    name: string;
    timestamp: string;
    attributes?: Record<string, unknown>;
  }>;
}

/**
 * Generate a unique trace ID
 */
export function generateTraceId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

/**
 * Generate a unique span ID
 */
export function generateSpanId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

/**
 * Log a trace to Arize
 */
export async function logTrace(
  span: TraceSpan
): Promise<{ success: boolean; error?: string }> {
  // If Arize not configured, log locally
  if (!ARIZE_API_KEY || !ARIZE_SPACE_KEY) {
    console.log("[Trace]", JSON.stringify(span, null, 2));
    return { success: true };
  }

  try {
    const response = await fetch(`${ARIZE_API_URL}/log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ARIZE_API_KEY}`,
        "space-key": ARIZE_SPACE_KEY,
      },
      body: JSON.stringify({
        spans: [span],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Arize log error:", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error("Arize connection error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Create a trace logger for an encounter
 */
export function createEncounterTracer(encounterId: string) {
  const traceId = generateTraceId();

  return {
    traceId,

    async logEvent(
      name: string,
      attributes?: Record<string, unknown>
    ): Promise<void> {
      const span: TraceSpan = {
        name,
        context: {
          trace_id: traceId,
          span_id: generateSpanId(),
        },
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        status: "OK",
        attributes: {
          encounter_id: encounterId,
          ...attributes,
        },
      };

      await logTrace(span);
    },

    async logError(
      name: string,
      error: Error,
      attributes?: Record<string, unknown>
    ): Promise<void> {
      const span: TraceSpan = {
        name,
        context: {
          trace_id: traceId,
          span_id: generateSpanId(),
        },
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        status: "ERROR",
        attributes: {
          encounter_id: encounterId,
          error_message: error.message,
          error_stack: error.stack,
          ...attributes,
        },
      };

      await logTrace(span);
    },

    async logLLMCall(
      model: string,
      prompt: string,
      response: string,
      latencyMs: number
    ): Promise<void> {
      const span: TraceSpan = {
        name: "llm_call",
        context: {
          trace_id: traceId,
          span_id: generateSpanId(),
        },
        start_time: new Date(Date.now() - latencyMs).toISOString(),
        end_time: new Date().toISOString(),
        status: "OK",
        attributes: {
          encounter_id: encounterId,
          model,
          prompt_length: prompt.length,
          response_length: response.length,
          latency_ms: latencyMs,
        },
      };

      await logTrace(span);
    },
  };
}

/**
 * Check if Arize is configured
 */
export function isConfigured(): boolean {
  return Boolean(ARIZE_API_KEY && ARIZE_SPACE_KEY);
}

export default logTrace;
