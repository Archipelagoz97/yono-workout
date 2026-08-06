"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { HeartPulseIcon, CheckCircle2Icon, ClockIcon } from "lucide-react";
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

const MUSCLE_EMOJIS: Record<string, string> = {
  "Back": "🔙",
  "Traps": "🦖",
  "Rear Delt": "🎯",
  "Shoulders": "🏔️",
  "Chest": "🫁",
  "Triceps": "💪",
  "Biceps": "🦾",
  "Forearms": "🤏",
  "Quads": "🦵",
  "Hamstrings": "🍗",
  "Glutes": "🍑",
  "Adductors": "🦀",
  "Calves": "🐐",
  "Core": "🧱",
  "Lower back": "🛡️",
  "Hip flexors": "🚪",
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

function formatRemaining(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

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

  const muscleData = useMemo(() => {
    if (!recovery) return null;
    const byLabel = new Map<string, { muscle: string; lastTrained: number; hours: number }>();
    for (const muscle of muscleOrder) {
      const ts = recovery.get(muscle);
      if (!ts) continue;
      const label = MUSCLE_LABELS[muscle] ?? muscle.replace(/_/g, " ");
      const elapsed = Math.max(0, (now - ts) / 3600000);
      const existing = byLabel.get(label);
      // Keep the least-recovered muscle per label so we don't show duplicates.
      if (!existing || elapsed < existing.hours) {
        byLabel.set(label, { muscle, lastTrained: ts, hours: elapsed });
      }
    }
    return Array.from(byLabel.values());
  }, [recovery, now]);

  if (!recovery || !muscleData) {
    return (
      <div className="px-4 mb-6">
        <div className="h-40 skeleton rounded-2xl" />
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
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-1.5">
          <HeartPulseIcon className="w-4 h-4 text-accent" />
          Muscle recovery
        </h2>
        <span className="text-[11px] text-muted-foreground">
          {readyCount}/{muscleData.length} ready
        </span>
      </div>
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="space-y-3.5">
          {muscleData.map(({ muscle, hours }) => {
            const label = MUSCLE_LABELS[muscle] ?? muscle.replace(/_/g, " ");
            const target = RECOVERY_HOURS[muscle] ?? DEFAULT_RECOVERY_HOURS;
            const recovered = hours >= target;
            const pct = Math.min(100, Math.round((hours / target) * 100));
            const remaining = Math.max(0, target - hours);
            return (
              <div key={muscle}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">{MUSCLE_EMOJIS[label] ?? "💪"}</span>
                    <span className="text-xs font-semibold text-foreground truncate">
                      {label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {recovered ? (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2Icon className="w-3 h-3" />
                        Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground">
                        <ClockIcon className="w-3 h-3" />
                        {formatRemaining(remaining)} left
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-muted-foreground w-9 text-right">
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      recovered
                        ? "bg-emerald-500"
                        : pct > 50
                        ? "bg-amber-500"
                        : "bg-red-500"
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        Approximate recovery estimates based on when each muscle was last trained.
      </p>
    </div>
  );
}
