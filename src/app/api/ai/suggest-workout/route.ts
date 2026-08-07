import { NextRequest, NextResponse } from "next/server";
import { callDeepSeekJSON, DeepSeekError } from "@/lib/ai/deepseek";
import { buildPlannerSystemPrompt } from "@/lib/ai/prompts";
import {
  SuggestWorkoutRequestSchema,
  WorkoutSuggestionSchema,
} from "@/lib/ai/schemas";
import { ZodError } from "zod";
import { exercises } from "@/data/exercises.compact";

const exerciseIds = new Set(exercises.map((e) => e.id));

export async function POST(req: NextRequest) {
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 50000) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    const body = await req.json();
    const context = SuggestWorkoutRequestSchema.parse(body);

    const recentSessionsStr = context.recentSessions
      .map((s) => `- ${s.name} (${new Date(s.completedAt).toLocaleDateString()}, focus: ${s.focus.join(", ")})`)
      .join("\n");

    const exerciseHistoryStr = context.relevantExerciseHistory
      .map((h) => {
        const lastPerf = h.recentPerformances[0];
        if (!lastPerf) return `- ${h.exerciseId}: No history`;
        const setsStr = lastPerf.sets
          .slice(0, 3)
          .map((s) => `${s.weightKg ?? "BW"}kg x ${s.reps ?? "?"}`)
          .join(", ");
        return `- ${h.exerciseId}: Last time ${setsStr}`;
      })
      .join("\n");

    const preferencesStr = context.preferences
      .map((p: unknown) => {
        const pref = p as { exerciseId: string; preference: string };
        return `- ${pref.exerciseId}: ${pref.preference}`;
      })
      .join("\n") || "None";

    const memoriesStr = context.memories
      .map((m: unknown) => {
        const mem = m as { content: string };
        return `- ${mem.content}`;
      })
      .join("\n") || "None";

    const recoveryStr = context.muscleRecovery?.length
      ? context.muscleRecovery
          .map((r) => `- ${r.label}: ${r.pct}% recovered (${r.status})`)
          .join("\n")
      : "No training history yet";

    // Map exerciseId -> most recent working weight from real logged sets.
    // Used to clamp the AI's suggested weights so they stay close to reality.
    const lastWeightByExercise = new Map<string, number>();
    for (const h of context.relevantExerciseHistory) {
      const recent = h.recentPerformances
        .filter((p) => p.sets.some((s) => s.weightKg != null && s.reps != null))
        .sort((a, b) => b.completedAt - a.completedAt);
      for (const perf of recent) {
        const last = [...perf.sets]
          .reverse()
          .find((s) => s.weightKg != null);
        if (last?.weightKg != null) {
          lastWeightByExercise.set(h.exerciseId, last.weightKg);
          break;
        }
      }
    }

    const availableExerciseIds = context.gym.availableEquipmentCodes
      ? exercises
          .filter((e) =>
            e.equipmentCodes.some((ec) =>
              context.gym.availableEquipmentCodes.includes(ec)
            )
          )
          .map((e) => e.id)
          .join(", ")
      : exercises.map((e) => e.id).join(", ");

    const userMessage = [
      "User request:",
      `- Focus: ${context.request.focus.join(", ")}`,
      `- Available time: ${context.request.availableMinutes ? context.request.availableMinutes + " minutes" : "No limit"}`,
      `- Energy: ${context.request.energy ?? "Not specified"}`,
      `- Equipment mode: ${context.request.equipmentMode ?? "Full gym"}`,
      `- Discomfort areas: ${context.request.discomfortAreas?.join(", ") ?? "None"}`,
      "",
      "User profile:",
      `- Goal: ${context.profile.goal ?? "General fitness"}`,
      `- Experience: ${context.profile.experienceLevel ?? "Not specified"}`,
      "",
      `Gym: ${context.gym.name}`,
      `Available equipment: ${context.gym.availableEquipmentCodes.join(", ")}`,
      "",
      `Recent sessions (last ${context.recentSessions.length}):`,
      recentSessionsStr,
      "",
      "Exercise history for relevant exercises:",
      exerciseHistoryStr,
      "",
      "Muscle recovery (last X hours):",
      recoveryStr,
      "",
      "Exercise preferences:",
      preferencesStr,
      "",
      "Memories:",
      memoriesStr,
      "",
      "Available exercise IDs (use ONLY these):",
      availableExerciseIds,
    ].join("\n");

    const suggestion = await callDeepSeekJSON(
      {
        messages: [
          { role: "system", content: buildPlannerSystemPrompt() },
          { role: "user", content: userMessage },
        ],
        temperature: 0.6,
        maxTokens: 2048,
      },
      (raw) => WorkoutSuggestionSchema.parse(raw)
    );

    // Validate exercise IDs exist
    const invalidIds = suggestion.exercises.filter(
      (e) => !exerciseIds.has(e.exerciseId)
    );
    if (invalidIds.length > 0) {
      return NextResponse.json(
        {
          error: "AI suggested unknown exercise IDs: " + invalidIds.map((e) => e.exerciseId).join(", "),
        },
        { status: 422 }
      );
    }

    // Validate rep ranges
    for (const ex of suggestion.exercises) {
      if (
        ex.targetRepMin !== undefined &&
        ex.targetRepMax !== undefined &&
        ex.targetRepMin > ex.targetRepMax
      ) {
        ex.targetRepMin = ex.targetRepMax - 2;
      }
    }

    // Clamp suggested weights to reality: set from last logged weight if missing,
    // and never invent a weight more than ~5% above the user's last real weight.
    for (const ex of suggestion.exercises) {
      const lastWeight = lastWeightByExercise.get(ex.exerciseId);
      if (lastWeight == null) continue;
      if (ex.suggestedWeightKg == null) {
        ex.suggestedWeightKg = lastWeight;
      } else if (ex.suggestedWeightKg > lastWeight * 1.05) {
        ex.suggestedWeightKg = Math.round(Math.max(lastWeight, lastWeight * 1.05) * 4) / 4;
      }
    }

    return NextResponse.json(suggestion);
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
    console.error("[suggest-workout] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
