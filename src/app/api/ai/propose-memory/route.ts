import { NextRequest, NextResponse } from "next/server";
import { callDeepSeekJSON, DeepSeekError } from "@/lib/ai/deepseek";
import { buildMemoryExtractorSystemPrompt } from "@/lib/ai/prompts";
import {
  ProposeMemoryRequestSchema,
  MemoryProposalSchema,
} from "@/lib/ai/schemas";
import { ZodError } from "zod";

export async function POST(req: NextRequest) {
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 10000) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    const body = await req.json();
    const data = ProposeMemoryRequestSchema.parse(body);

    const conversation = data.messages
      .map((m) => (m.role === "user" ? "User: " : "Yono: ") + m.content)
      .join("\n");

    const existingStr =
      data.existingMemories.length > 0
        ? data.existingMemories
            .map((m: any) => "- " + m.category + ": " + m.content)
            .join("\n")
        : "None";

    const userMessage = [
      "Recent conversation:",
      conversation,
      "",
      "Existing memories:",
      existingStr,
    ].join("\n");

    const extraction = await callDeepSeekJSON(
      {
        messages: [
          { role: "system", content: buildMemoryExtractorSystemPrompt() },
          { role: "user", content: userMessage },
        ],
        temperature: 0.2,
        maxTokens: 512,
      },
      (raw) => MemoryProposalSchema.parse(raw)
    );

    return NextResponse.json(extraction);
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
    console.error("[propose-memory] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
