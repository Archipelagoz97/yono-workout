import { NextRequest, NextResponse } from "next/server";
import { callDeepSeekJSON, DeepSeekError } from "@/lib/ai/deepseek";
import { buildLoggerSystemPrompt } from "@/lib/ai/prompts";
import {
  ParseWorkoutLogRequestSchema,
  WorkoutLoggingSchema,
} from "@/lib/ai/schemas";
import { ZodError } from "zod";

export async function POST(req: NextRequest) {
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 5000) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    const body = await req.json();
    const data = ParseWorkoutLogRequestSchema.parse(body);

    const exerciseList = data.activeSession.exercises
      .map(
        (e) =>
          `- ${e.exerciseId} (order: ${e.order}, completed sets so far: ${e.completedSets})`
      )
      .join("\n");

    const userMessage = `Active session exercises:\n${exerciseList}\n\nUser said: "${data.text}"`;

    const result = await callDeepSeekJSON(
      {
        messages: [
          { role: "system", content: buildLoggerSystemPrompt() },
          { role: "user", content: userMessage },
        ],
        temperature: 0.1,
        maxTokens: 512,
      },
      (raw) => WorkoutLoggingSchema.parse(raw)
    );

    // Validate the exerciseId is in the active session
    const sessionExerciseIds = new Set(
      data.activeSession.exercises.map((e) => e.exerciseId)
    );
    if (!sessionExerciseIds.has(result.exerciseId)) {
      result.requiresConfirmation = true;
      result.confidence = Math.min(result.confidence, 0.5);
    }

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
    console.error("[parse-workout-log] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
