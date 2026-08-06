import { NextRequest, NextResponse } from "next/server";
import { callDeepSeekJSON, DeepSeekError } from "@/lib/ai/deepseek";
import { buildModifierSystemPrompt } from "@/lib/ai/prompts";
import {
  ModifyWorkoutRequestSchema,
  WorkoutModificationSchema,
} from "@/lib/ai/schemas";
import { ZodError } from "zod";
import { exercises } from "@/data/exercises.compact";

const exerciseIds = new Set(exercises.map((e) => e.id));

export async function POST(req: NextRequest) {
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 20000) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    const body = await req.json();
    const data = ModifyWorkoutRequestSchema.parse(body);

    const exerciseList = data.currentWorkout.exercises
      .map(
        (e) =>
          `- ${e.exerciseId}: ${e.targetSets} sets x ${e.targetRepMin ?? "?"}-${e.targetRepMax ?? "?"} reps, ${e.suggestedWeightKg ?? "BW"}kg, ${e.restSeconds}s rest`
      )
      .join("\n");

    const availableExerciseIds = exercises
      .filter((e) =>
        e.equipmentCodes.some((ec) => data.availableEquipmentCodes.includes(ec))
      )
      .map((e) => e.id)
      .join(", ");

    const userMessage = [
      `Current workout: ${data.currentWorkout.sessionName}`,
      "Exercises:",
      exerciseList,
      "",
      `Available equipment: ${data.availableEquipmentCodes.join(", ")}`,
      "",
      `User instruction: ${data.instruction}`,
      "",
      "Available exercise IDs (use ONLY these):",
      availableExerciseIds,
    ].join("\n");

    const modification = await callDeepSeekJSON(
      {
        messages: [
          { role: "system", content: buildModifierSystemPrompt() },
          { role: "user", content: userMessage },
        ],
        temperature: 0.4,
        maxTokens: 1024,
      },
      (raw) => WorkoutModificationSchema.parse(raw)
    );

    // Validate that all exerciseIds in changes exist
    for (const change of modification.changes) {
      const ids: string[] = [];
      if ("exerciseId" in change) ids.push(change.exerciseId);
      if ("fromExerciseId" in change) ids.push(change.fromExerciseId);
      if ("toExerciseId" in change) ids.push(change.toExerciseId);
      for (const id of ids) {
        if (!exerciseIds.has(id)) {
          return NextResponse.json(
            { error: `Unknown exercise ID in modification: ${id}` },
            { status: 422 }
          );
        }
      }
    }

    return NextResponse.json(modification);
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
    console.error("[modify-workout] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
