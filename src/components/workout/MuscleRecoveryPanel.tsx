"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { HeartPulseIcon } from "lucide-react";
import db from "@/db/database";
import { exercises as exerciseCatalog } from "@/data/exercises.compact";
import { cn } from "@/lib/utils";

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

export function MuscleRecoveryPanel() {
  const sets = useLiveQuery(() => db.workoutSets.toArray(), []);
  const [now] = useState(() => Date.now());

  const recovery = useMemo(() => {
    if (!sets) return null;
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
  }, [sets]);

  if (!recovery) {
    return (
      <div className="px-4 mb-6">
        <div className="h-32 skeleton rounded-2xl" />
      </div>
    );
  }

  const tracked = muscleOrder.filter((m) => recovery.has(m));

  if (tracked.length === 0) {
    return null;
  }

  const heatFor = (muscle: string) => {
    const hours = Math.max(0, (now - (recovery.get(muscle) ?? 0)) / 3600000);
    const target = RECOVERY_HOURS[muscle] ?? DEFAULT_RECOVERY_HOURS;
    const recovered = hours >= target;
    // 0 → just trained (hot), target → ready (cool)
    const t = Math.min(1, hours / target);
    return { hours, recovered, t };
  };

  return (
    <div className="px-4 mb-6 relative z-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-1.5">
          <HeartPulseIcon className="w-4 h-4 text-accent" />
          Muscle recovery
        </h2>
        <span className="text-[11px] text-muted-foreground">
          last 7 days
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {tracked.map((muscle) => {
          const { hours, recovered, t } = heatFor(muscle);
          const label = MUSCLE_LABELS[muscle] ?? muscle.replace(/_/g, " ");
          return (
            <div
              key={muscle}
              className={cn(
                "flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-2xl border backdrop-blur-md transition-all",
                recovered
                  ? "bg-emerald-500/15 border-emerald-500/30"
                  : t > 0.5
                  ? "bg-amber-500/15 border-amber-500/30"
                  : "bg-red-500/20 border-red-500/40"
              )}
              title={`${label} — last trained ${Math.floor(hours)}h ago`}
            >
              <span className="text-xs font-bold text-foreground">
                {label}
              </span>
              <span
                className={cn(
                  "text-[10px] mt-0.5",
                  recovered ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                )}
              >
                {recovered ? "Ready" : hours < 1 ? "Now" : `${Math.round(hours)}h`}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        Approximate recovery estimates based on when each muscle was last trained.
      </p>
    </div>
  );
}
