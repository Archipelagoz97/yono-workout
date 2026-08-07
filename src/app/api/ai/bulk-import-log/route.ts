import { NextRequest, NextResponse } from "next/server";
import { callDeepSeekJSON, DeepSeekError } from "@/lib/ai/deepseek";
import { buildBulkImportSystemPrompt } from "@/lib/ai/prompts";
import {
  BulkImportLogRequestSchema,
  BulkImportLogResponseSchema,
} from "@/lib/ai/schemas";
import { exercises } from "@/data/exercises.compact";
import { ZodError } from "zod";

export async function POST(req: NextRequest) {
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 20000) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    const body = await req.json();
    const data = BulkImportLogRequestSchema.parse(body);

    const catalogRef = exercises
      .slice(0, 200)
      .map((e) => `- ${e.id}: "${e.name}" (${e.equipmentCodes.join(", ")})`)
      .join("\n");

    const userMessage = `Exercise catalog (use exact IDs):\n${catalogRef}\n\nUser's workout log to parse:\n"""\n${data.text}\n"""`;

    const result = await callDeepSeekJSON(
      {
        messages: [
          { role: "system", content: buildBulkImportSystemPrompt() },
          { role: "user", content: userMessage },
        ],
        temperature: 0.1,
        maxTokens: 4096,
      },
      (raw) => BulkImportLogResponseSchema.parse(raw)
    );

    const validIds = new Set(exercises.map((e) => e.id));
    let overallConfidence = result.confidence;
    for (const session of result.sessions) {
      let sessionHasInvalid = false;
      for (const ex of session.exercises) {
        if (ex.exerciseId !== "other" && !validIds.has(ex.exerciseId)) {
          overallConfidence = Math.min(overallConfidence, 0.5);
          sessionHasInvalid = true;
        }
      }
      if (sessionHasInvalid) {
        session.confidence = Math.min(
          session.confidence ?? result.confidence,
          0.5
        );
      }
    }
    result.confidence = overallConfidence;

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request or AI response", details: (error as any).errors },
        { status: 400 }
      );
    }
    if (error instanceof DeepSeekError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode ?? 503 }
      );
    }
    console.error("[bulk-import-log] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
