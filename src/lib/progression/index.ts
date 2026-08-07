// Yono Workout — Progression Logic
// Deterministic rules-based progression guidance.
// This is not AI — it runs locally and offline.

import type { WorkoutSet } from "@/types";
import { MUSCLE_LABELS } from "@/lib/recovery";

export interface ProgressionAdvice {
  action: "increase_weight" | "maintain_weight" | "decrease_weight" | "no_history";
  message: string;
  suggestedWeightKg?: number;
}

export interface SetPerformance {
  weightKg: number;
  reps: number;
}

/**
 * Double progression: suggest weight change based on recent working sets.
 */
export function getProgressionAdvice(
  recentSets: SetPerformance[],
  targetRepMin: number,
  targetRepMax: number,
  currentSuggestedWeightKg: number
): ProgressionAdvice {
  if (recentSets.length === 0) {
    return {
      action: "no_history",
      message: "No previous sets logged. Start conservatively.",
      suggestedWeightKg: currentSuggestedWeightKg,
    };
  }

  // Only consider working sets at the same weight (most recent session weight)
  const lastWeight = recentSets[0].weightKg;
  const setsAtLastWeight = recentSets.filter((s) => s.weightKg === lastWeight);

  if (setsAtLastWeight.length === 0) {
    return {
      action: "maintain_weight",
      message: `Try ${lastWeight} kg — use your last known weight conservatively.`,
      suggestedWeightKg: lastWeight,
    };
  }

  const allReps = setsAtLastWeight.map((s) => s.reps);
  const allAtTop = allReps.every((r) => r >= targetRepMax);
  const avgReps = allReps.reduce((a, b) => a + b, 0) / allReps.length;
  const firstSetReps = allReps[0];

  // All sets hit the top of the rep range → increase weight
  if (allAtTop && setsAtLastWeight.length >= 2) {
    const increase = lastWeight >= 20 ? 2.5 : 1.25;
    const newWeight = Math.round((lastWeight + increase) * 4) / 4; // round to nearest 0.25
    return {
      action: "increase_weight",
      message: `Great! All sets hit ${targetRepMax} reps. Try ${newWeight} kg next time.`,
      suggestedWeightKg: newWeight,
    };
  }

  // First set hit top but later sets fell — maintain
  if (firstSetReps >= targetRepMax && avgReps >= targetRepMin) {
    return {
      action: "maintain_weight",
      message: `First set was strong, but fatigue set in. Keep ${lastWeight} kg and aim for more consistent reps.`,
      suggestedWeightKg: lastWeight,
    };
  }

  // Performance was significantly below target
  if (avgReps < targetRepMin - 2) {
    const decrease = lastWeight >= 20 ? 2.5 : 1.25;
    const newWeight = Math.max(0, Math.round((lastWeight - decrease) * 4) / 4);
    return {
      action: "decrease_weight",
      message: `Performance dropped below range. Consider ${newWeight} kg and longer rest.`,
      suggestedWeightKg: newWeight,
    };
  }

  // Within range but not at top — maintain
  return {
    action: "maintain_weight",
    message: `Keep ${lastWeight} kg and aim to complete all ${targetRepMax} reps.`,
    suggestedWeightKg: lastWeight,
  };
}

/**
 * Estimate one-rep max using Epley formula.
 * Clearly labeled as an estimate.
 */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (reps === 1) return weightKg;
  if (reps <= 0 || weightKg <= 0) return 0;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/**
 * Calculate total volume for a set of WorkoutSets.
 * Only calculates when both weight and reps exist.
 */
export function calculateTotalVolume(sets: WorkoutSet[]): number {
  return sets.reduce((total, set) => {
    if (set.weightKg && set.reps) {
      return total + set.weightKg * set.reps;
    }
    return total;
  }, 0);
}

/**
 * Get the best estimated 1RM from a list of sets.
 */
export function getBestEstimated1RM(sets: WorkoutSet[]): number {
  let best = 0;
  for (const set of sets) {
    if (set.weightKg && set.reps && set.setType !== "warmup") {
      const estimate = estimateOneRepMax(set.weightKg, set.reps);
      if (estimate > best) best = estimate;
    }
  }
  return best;
}

/**
 * Estimate workout duration based on exercises.
 */
export function estimateWorkoutMinutes(
  exercises: Array<{
    targetSets: number;
    restSeconds: number;
    repMax?: number;
  }>
): number {
  // ~2.5 minutes per exercise (setup + sets) + rest time
  let totalSeconds = 0;

  for (const ex of exercises) {
    const setsTime = ex.targetSets * 60; // ~60s per working set
    const restTime = (ex.targetSets - 1) * ex.restSeconds;
    totalSeconds += setsTime + restTime;
  }

  // Add 5 minutes warmup and transition time
  const totalMinutes = Math.ceil(totalSeconds / 60) + 5;
  return Math.min(totalMinutes, 180);
}

/**
 * Get offline/fallback workout suggestion using deterministic rules.
 * No AI required.
 */
export function getFallbackExercises(
  focus: string[],
  availableEquipmentCodes: string[],
  allExercises: Array<{
    id: string;
    category: string;
    equipmentCodes: string[];
    difficulty: string;
    defaultRepMin?: number;
    defaultRepMax?: number;
    defaultRestSeconds?: number;
    primaryMuscles: string[];
  }>,
  exerciseHistory: Map<string, { lastWeightKg?: number; lastReps?: number }>,
  targetCount = 4,
  recoveringLabels?: Set<string>
) {
  const equipmentSet = new Set(availableEquipmentCodes);

  // Map focus areas to categories
  const focusToCategories: Record<string, string[]> = {
    "back": ["Back"],
    "chest": ["Chest"],
    "shoulders": ["Shoulders"],
    "arms": ["Biceps", "Triceps"],
    "biceps": ["Biceps"],
    "triceps": ["Triceps"],
    "legs": ["Quadriceps", "Hamstrings", "Glutes", "Calves"],
    "lower body": ["Quadriceps", "Hamstrings", "Glutes"],
    "upper body": ["Chest", "Back", "Shoulders", "Biceps", "Triceps"],
    "full body": ["Chest", "Back", "Shoulders", "Quadriceps", "Hamstrings"],
    "cardio": ["Cardio"],
    "core": ["Core"],
    "glutes": ["Glutes"],
    "recovery": ["Core", "Shoulders", "Calves"],
  };

  const targetCategories = new Set<string>();
  for (const f of focus) {
    const categories = focusToCategories[f.toLowerCase()];
    if (categories) {
      categories.forEach((c) => targetCategories.add(c));
    }
  }

  if (targetCategories.size === 0) {
    // Default: full body
    ["Chest", "Back", "Quadriceps"].forEach((c) => targetCategories.add(c));
  }

  // Filter exercises by equipment and focus
  let eligible = allExercises.filter(
    (e) =>
      targetCategories.has(e.category) &&
      e.equipmentCodes.some((code) => equipmentSet.has(code)) &&
      e.difficulty !== "advanced"
  );

  // Recovery-aware: drop exercises whose primary muscles are still recovering.
  // If that empties the pool, fall back to the full eligible list rather than
  // returning nothing.
  if (recoveringLabels && recoveringLabels.size > 0) {
    const rested = eligible.filter((e) =>
      e.primaryMuscles.every(
        (m) => !recoveringLabels.has(MUSCLE_LABELS[m] ?? m)
      )
    );
    if (rested.length > 0) eligible = rested;
  }

  // Sort: prefer exercises with history (familiar), then by category
  const categoriesList = [...targetCategories];
  const selected: typeof eligible = [];

  for (const category of categoriesList) {
    if (selected.length >= targetCount) break;
    const categoryExercises = eligible.filter((e) => e.category === category);

    // Prefer ones with history
    const withHistory = categoryExercises.filter((e) => exerciseHistory.has(e.id));
    const withoutHistory = categoryExercises.filter((e) => !exerciseHistory.has(e.id));

    const pool = [...withHistory, ...withoutHistory];
    if (pool.length > 0) {
      selected.push(pool[0]);
    }
  }

  // Fill remaining slots if needed
  const remaining = eligible.filter((e) => !selected.find((s) => s.id === e.id));
  while (selected.length < targetCount && remaining.length > 0) {
    selected.push(remaining.shift()!);
  }

  return selected.map((ex, index) => {
    const history = exerciseHistory.get(ex.id);
    return {
      exerciseId: ex.id,
      order: index + 1,
      targetSets: 3,
      targetRepMin: ex.defaultRepMin ?? 10,
      targetRepMax: ex.defaultRepMax ?? 12,
      suggestedWeightKg: history?.lastWeightKg,
      restSeconds: ex.defaultRestSeconds ?? 90,
    };
  });
}
