// Yono Workout — Muscle Recovery Logic
// Shared by the Today screen panel, the AI workout planner, and the
// offline fallback generator so all three agree on recovery status.

import type { WorkoutSet } from "@/types";
import { exercises as exerciseCatalog } from "@/data/exercises.compact";

const exerciseMap = new Map(exerciseCatalog.map((e) => [e.id, e]));

// Recovery windows (hours) per muscle group.
// Large / compound muscles recover slower; smaller ones faster.
export const RECOVERY_HOURS: Record<string, number> = {
  latissimus_dorsi: 48,
  rhomboids: 48,
  trapezius: 48,
  upper_traps: 48,
  middle_traps: 48,
  rear_deltoid: 48,
  deltoid: 48,
  lateral_deltoid: 48,
  front_deltoid: 48,
  pectoralis_major: 48,
  upper_pectoralis_major: 48,
  lower_pectoralis_major: 48,
  triceps: 24,
  triceps_long_head: 24,
  biceps: 24,
  biceps_brachii: 24,
  biceps_long_head: 24,
  brachialis: 24,
  brachioradialis: 24,
  quadriceps: 72,
  hamstrings: 72,
  glutes: 48,
  gluteus_medius: 48,
  adductors: 48,
  gastrocnemius: 48,
  soleus: 48,
  core: 24,
  rectus_abdominis: 24,
  obliques: 24,
  transverse_abdominis: 24,
  erector_spinae: 48,
  quadratus_lumborum: 48,
  hip_flexors: 24,
  tensor_fasciae_latae: 48,
  forearms: 24,
};

export const DEFAULT_RECOVERY_HOURS = 48;

// Several muscle IDs map to the same display label (e.g. latissimus_dorsi,
// rhomboids and middle_traps all become "Back"). We group by label and keep
// only the least-recovered muscle per group so no label is ever duplicated.
export const MUSCLE_LABELS: Record<string, string> = {
  latissimus_dorsi: "Back",
  rhomboids: "Back",
  trapezius: "Traps",
  upper_traps: "Traps",
  middle_traps: "Back",
  rear_deltoid: "Rear Delt",
  deltoid: "Shoulders",
  lateral_deltoid: "Shoulders",
  front_deltoid: "Shoulders",
  pectoralis_major: "Chest",
  upper_pectoralis_major: "Chest",
  lower_pectoralis_major: "Chest",
  triceps: "Triceps",
  triceps_long_head: "Triceps",
  biceps: "Biceps",
  biceps_brachii: "Biceps",
  biceps_long_head: "Biceps",
  brachialis: "Biceps",
  brachioradialis: "Forearms",
  quadriceps: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  gluteus_medius: "Glutes",
  adductors: "Adductors",
  gastrocnemius: "Calves",
  soleus: "Calves",
  core: "Core",
  rectus_abdominis: "Core",
  obliques: "Core",
  transverse_abdominis: "Core",
  erector_spinae: "Lower back",
  quadratus_lumborum: "Lower back",
  hip_flexors: "Hip flexors",
  tensor_fasciae_latae: "Glutes",
  forearms: "Forearms",
};

export const muscleOrder = [
  "quadriceps",
  "hamstrings",
  "glutes",
  "adductors",
  "gastrocnemius",
  "soleus",
  "pectoralis_major",
  "latissimus_dorsi",
  "rhomboids",
  "deltoid",
  "rear_deltoid",
  "biceps",
  "triceps",
  "erector_spinae",
  "core",
];

export type RecoveryStatus = "fresh" | "recovering" | "recent";

export interface MuscleRecoveryRow {
  muscle: string;
  label: string;
  lastTrainedAt: number;
  recoveryHours: number;
  elapsedHours: number;
  pct: number;
  status: RecoveryStatus;
}

export function statusFor(hours: number, target: number): RecoveryStatus {
  if (hours >= target) return "fresh";
  if (hours < 24) return "recent";
  return "recovering";
}

/**
 * Most recent timestamp each muscle id was trained, across all logged sets.
 */
export function getLastTrainedPerMuscle(sets: WorkoutSet[]): Map<string, number> {
  const lastTrained = new Map<string, number>();
  for (const s of sets) {
    const def = exerciseMap.get(s.exerciseId);
    if (!def) continue;
    const ts = s.completedAt ?? 0;
    for (const muscle of def.primaryMuscles) {
      const cur = lastTrained.get(muscle) ?? 0;
      if (ts > cur) lastTrained.set(muscle, ts);
    }
  }
  return lastTrained;
}

/**
 * Recovery status grouped by display label. For each label only the
 * least-recovered muscle is kept, so no group is duplicated.
 */
export function getMuscleRecoveryRows(sets: WorkoutSet[], now: number): MuscleRecoveryRow[] {
  const lastTrained = getLastTrainedPerMuscle(sets);
  const byLabel = new Map<string, MuscleRecoveryRow>();

  for (const muscle of muscleOrder) {
    const ts = lastTrained.get(muscle);
    if (!ts) continue;
    const label = MUSCLE_LABELS[muscle] ?? muscle.replace(/_/g, " ");
    const recoveryHours = RECOVERY_HOURS[muscle] ?? DEFAULT_RECOVERY_HOURS;
    const elapsedHours = Math.max(0, (now - ts) / 3600000);
    const existing = byLabel.get(label);
    if (!existing || elapsedHours < existing.elapsedHours) {
      byLabel.set(label, {
        muscle,
        label,
        lastTrainedAt: ts,
        recoveryHours,
        elapsedHours,
        pct: Math.min(100, Math.round((elapsedHours / recoveryHours) * 100)),
        status: statusFor(elapsedHours, recoveryHours),
      });
    }
  }

  return Array.from(byLabel.values());
}

/**
 * Labels of muscle groups that are still meaningfully recovering.
 * A group is "available" once it has recovered at least 60% of its window,
 * so very recent sessions (< 60% of the window) are skipped by generators.
 */
export function getRecoveringLabels(rows: MuscleRecoveryRow[]): Set<string> {
  return new Set(rows.filter((r) => r.pct < 60).map((r) => r.label));
}
