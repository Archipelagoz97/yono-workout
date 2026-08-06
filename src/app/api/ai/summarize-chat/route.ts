import { NextRequest, NextResponse } from "next/server";
import { callDeepSeekJSON, DeepSeekError } from "@/lib/ai/deepseek";
import { buildSummarizerSystemPrompt } from "@/lib/ai/prompts";
import {
  SummarizeChatRequestSchema,
  ChatSummarySchema,
} from "@/lib/ai/schemas";
import { ZodError } from "zod";

export async function POST(req: NextRequest) {
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 15000) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    const body = await req.json();
    const data = SummarizeChatRequestSchema.parse(body);

    const conversation = data.messages
      .map((m) => (m.role === "user" ? "User: " : "Yono: ") + m.content)
      .join("\n");

    const result = await callDeepSeekJSON(
      {
        messages: [
          { role: "system", content: buildSummarizerSystemPrompt() },
          { role: "user", content: "Conversation to summarize:\n\n" + conversation },
        ],
        temperature: 0.3,
        maxTokens: 512,
      },
      (raw) => ChatSummarySchema.parse(raw)
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof DeepSeekError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode ?? 503 }
      );
    }
    console.error("[summarize-chat] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
