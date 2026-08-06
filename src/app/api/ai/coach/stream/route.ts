import { NextRequest } from "next/server";
import { callDeepSeekStream, DeepSeekError } from "@/lib/ai/deepseek";
import { buildCoachSystemPromptText } from "@/lib/ai/prompts";
import { buildCoachMessages } from "@/lib/ai/buildCoachMessages";
import { CoachRequestSchema } from "@/lib/ai/schemas";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

/**
 * Streaming coach endpoint. Returns an SSE stream where each event is
 *   data: {"delta": "word or chunk"}
 */
export async function POST(req: NextRequest) {
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > 30000) {
    return new Response(JSON.stringify({ error: "Request too large" }), {
      status: 413,
      headers: { "Content-Type": "application/json" },
    });
  }

  let data;
  try {
    const body = await req.json();
    data = CoachRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: (error as any).errors }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = buildCoachMessages(data, buildCoachSystemPromptText());

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: string) => {
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      };

      try {
        for await (const delta of callDeepSeekStream({
          messages,
          temperature: 0.7,
          maxTokens: 1200,
          timeoutMs: 90000,
        })) {
          send(JSON.stringify({ delta }));
        }
        send(JSON.stringify({ done: true }));
      } catch (error) {
        let message = "Yono couldn't respond right now.";
        if (error instanceof DeepSeekError) {
          message = error.message;
        }
        send(JSON.stringify({ error: message }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
