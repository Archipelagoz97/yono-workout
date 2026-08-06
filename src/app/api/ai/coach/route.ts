import { NextRequest, NextResponse } from "next/server";
import { callDeepSeekJSON, DeepSeekError } from "@/lib/ai/deepseek";
import { buildCoachSystemPrompt } from "@/lib/ai/prompts";
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

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: buildCoachSystemPrompt() },
    ];

    if (data.chatSummary) {
      messages.push({
        role: "system",
        content: "Conversation summary so far: " + data.chatSummary,
      });
    }

    if (data.activeSession) {
      messages.push({
        role: "system",
        content: "Active workout: " + data.activeSession.name,
      });
    }

    if (data.exerciseContext && data.exerciseContext.length > 0) {
      messages.push({
        role: "system",
        content: "Relevant exercise history: " + JSON.stringify(data.exerciseContext),
      });
    }

    if (data.memories.length > 0) {
      const memoriesStr = data.memories
        .map((m: unknown) => (m as { content: string }).content)
        .join("; ");
      messages.push({
        role: "system",
        content: "What Yono remembers: " + memoriesStr,
      });
    }

    const recentHistory = data.chatHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    messages.push({ role: "user", content: data.message });

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
