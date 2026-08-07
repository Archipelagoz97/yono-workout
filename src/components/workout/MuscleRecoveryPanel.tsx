"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { HeartPulseIcon } from "lucide-react";
import db from "@/db/database";
import { exercises as exerciseCatalog } from "@/data/exercises.compact";
import { StatusChip } from "@/components/workout/TodayControls";
import { formatWeight, type WeightUnit } from "@/lib/units";

const exerciseMap = new Map(exerciseCatalog.map((e) => [e.id, e]));

// Recovery windows (hours) per muscle group.
// Large / compound muscles recover slower; smaller ones faster.
const RECOVERY_HOURS: Record<string, number> = {
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

const DEFAULT_RECOVERY_HOURS = 48;

// Several muscle IDs map to the same display label (e.g. latissimus_dorsi,
// rhomboids and middle_traps all become "Back"). We group by label and keep
// only the least-recovered muscle per group so no label is ever duplicated.
const MUSCLE_LABELS: Record<string, string> = {
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

const muscleOrder = [
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

function formatAgo(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m ago`;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function formatReadyAt(fromTs: number, remainingHours: number): string {
  const ready = new Date(fromTs + remainingHours * 3600000);
  const time = ready.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (remainingHours < 24) return `~${time} today`;
  const diffDays = Math.ceil(remainingHours / 24);
  const date = ready.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return `${date} (${diffDays} days)`;
}

function statusFor(hours: number, target: number): "fresh" | "recovering" | "recent" {
  if (hours >= target) return "fresh";
  if (hours < 24) return "recent";
  return "recovering";
}

// The most recent logged workout that trained a muscle, for the auto "why".
interface TrainedBout {
  exerciseId: string;
  exerciseName: string;
  lastTs: number;
  workingSets: number;
  lastReps?: number;
  lastWeightKg?: number;
}

export function MuscleRecoveryPanel() {
  const sets = useLiveQuery(() => db.workoutSets.toArray(), []);
  const profile = useLiveQuery(() => db.profiles.get("main-user"), []);
  const [now] = useState(() => Date.now());

  const weightUnit: WeightUnit = profile?.preferredWeightUnit ?? "kg";

  const recovery = useMemo(() => {
    if (!sets) return null;
    const lastTrained = new Map<string, number>();
    const lastBout = new Map<string, TrainedBout>();
    const boutSets = new Map<string, { count: number; reps?: number; weightKg?: number }>();

    for (const s of sets) {
      const def = exerciseMap.get(s.exerciseId);
      if (!def) continue;
      const ts = s.completedAt ?? 0;
      for (const muscle of def.primaryMuscles) {
        const cur = lastTrained.get(muscle) ?? 0;
        if (ts > cur) {
          lastTrained.set(muscle, ts);
          lastBout.set(muscle, {
            exerciseId: s.exerciseId,
            exerciseName: def.name,
            lastTs: ts,
            workingSets: 0,
          });
        }
        // Accumulate working-set summary for the most recent bout of this muscle.
        const bout = lastBout.get(muscle);
        if (bout && bout.lastTs === ts) {
          const agg = boutSets.get(muscle) ?? { count: 0 };
          if (s.setType !== "warmup") {
            agg.count += 1;
            if (s.reps != null) agg.reps = s.reps;
            if (s.weightKg != null) agg.weightKg = s.weightKg;
          }
          boutSets.set(muscle, agg);
          bout.workingSets = agg.count;
          bout.lastReps = agg.reps;
          bout.lastWeightKg = agg.weightKg;
        }
      }
    }
    return { lastTrained, lastBout };
  }, [sets]);

  const muscleData = useMemo(() => {
    if (!recovery) return null;
    const byLabel = new Map<string, { muscle: string; lastTrained: number; hours: number }>();
    for (const muscle of muscleOrder) {
      const ts = recovery.lastTrained.get(muscle);
      if (!ts) continue;
      const label = MUSCLE_LABELS[muscle] ?? muscle.replace(/_/g, " ");
      const elapsed = Math.max(0, (now - ts) / 3600000);
      const existing = byLabel.get(label);
      // Keep the least-recovered muscle per label so no duplicate groups show.
      if (!existing || elapsed < existing.hours) {
        byLabel.set(label, { muscle, lastTrained: ts, hours: elapsed });
      }
    }
    return Array.from(byLabel.values());
  }, [recovery, now]);

  if (!recovery || !muscleData) {
    return (
      <div className="px-4 mb-6 relative z-10">
        <div className="h-36 skeleton rounded-2xl" />
      </div>
    );
  }

  if (muscleData.length === 0) {
    return null;
  }

  const readyCount = muscleData.filter(({ muscle, hours }) => {
    const target = RECOVERY_HOURS[muscle] ?? DEFAULT_RECOVERY_HOURS;
    return hours >= target;
  }).length;

  return (
    <div className="px-4 mb-6 relative z-10">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-[19px] font-semibold tracking-tight text-foreground flex items-center gap-1.5">
          <HeartPulseIcon className="w-4 h-4 text-accent" />
          Muscle recovery
        </h2>
        <span className="text-xs font-medium text-muted-foreground">
          {readyCount}/{muscleData.length} ready
        </span>
      </div>

      <div className="bg-card ring-1 ring-foreground/10 rounded-2xl px-4 py-1">
        {muscleData.map(({ muscle, hours }) => {
          const label = MUSCLE_LABELS[muscle] ?? muscle.replace(/_/g, " ");
          const target = RECOVERY_HOURS[muscle] ?? DEFAULT_RECOVERY_HOURS;
          const status = statusFor(hours, target);
          const pct = Math.min(100, Math.round((hours / target) * 100));
          const bout = recovery.lastBout.get(muscle);
          const lastTrained = recovery.lastTrained.get(muscle) ?? 0;

          let reason = "";
          if (bout) {
            const parts: string[] = [bout.exerciseName];
            if (bout.workingSets > 0) {
              const setStr = `${bout.workingSets}×${bout.lastReps ?? "?"}`;
              const weightStr =
                bout.lastWeightKg != null
                  ? formatWeight(bout.lastWeightKg, weightUnit)
                  : null;
              parts.push(weightStr ? `${setStr} @ ${weightStr}` : setStr);
            }
            parts.push(formatAgo(hours));
            reason = `Recovering from ${parts.join(" · ")}`;
          }

          return (
            <div
              key={muscle}
              className="py-3 border-b border-border/60 last:border-0"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground truncate">{label}</p>
                    <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
                      {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full max-w-[160px] rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-400 to-secondary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">
                    {status === "fresh"
                      ? "Ready to train"
                      : `Will be ready ${formatReadyAt(lastTrained, target - hours)}`}
                  </p>
                  {reason && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {reason}
                    </p>
                  )}
                </div>
                <StatusChip status={status} className="shrink-0" />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground mt-2">
        Percentages and reasons are estimates from your recent logged workouts.
      </p>
    </div>
  );
}