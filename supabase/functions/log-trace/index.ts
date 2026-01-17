// Log Trace Edge Function
// Observability logging to Arize

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { logTrace, generateTraceId, generateSpanId } from "../_shared/arize.ts";
import type { LogTraceRequest } from "../_shared/types.ts";

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: LogTraceRequest = await req.json();
    const { encounterId, event, data } = body;

    if (!encounterId) {
      return errorResponse("encounterId is required");
    }
    if (!event) {
      return errorResponse("event is required");
    }

    // Create trace span
    const span = {
      name: event,
      context: {
        trace_id: generateTraceId(),
        span_id: generateSpanId(),
      },
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      status: "OK" as const,
      attributes: {
        encounter_id: encounterId,
        event_type: event,
        ...data,
      },
    };

    // Log to Arize (or console if not configured)
    const result = await logTrace(span);

    return jsonResponse({
      success: result.success,
      traceId: span.context.trace_id,
      spanId: span.context.span_id,
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Internal server error", 500);
  }
});
