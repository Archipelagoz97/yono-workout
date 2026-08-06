import { NextRequest, NextResponse } from "next/server";
import { callDeepSeekJSON, DeepSeekError } from "@/lib/ai/deepseek";
import { buildCoachSystemPrompt } from "@/lib/ai/prompts";
import { buildCoachMessages } from "@/lib/ai/buildCoachMessages";
import { CoachRequestSchema, CoachResponseSchema } from "@/lib/ai/schemas";
import { ZodError } from "zod";

export async function POST(req: NextRequest) {
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 30000) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    const body = await req.json();
    const data = CoachRequestSchema.parse(body);

    const messages = buildCoachMessages(data, buildCoachSystemPrompt());

    const response = await callDeepSeekJSON(
      {
        messages,
        temperature: 0.7,
        maxTokens: 1024,
      },
      (raw) => CoachResponseSchema.parse(raw)
    );

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: (error as any).errors },
        { status: 400 }
      );
    }
    if (error instanceof DeepSeekError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode ?? 503 }
      );
    }
    console.error("[coach] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
