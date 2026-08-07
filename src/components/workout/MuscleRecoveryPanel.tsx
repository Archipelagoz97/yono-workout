"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { HeartPulseIcon } from "lucide-react";
import db from "@/db/database";
import { exercises as exerciseCatalog } from "@/data/exercises.compact";
import { StatusChip } from "@/components/workout/TodayControls";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";

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
  const now = new Date();
  const sameDay = ready.toDateString() === now.toDateString();
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
  return sameDay ? `~${time} today` : `${date}${diffDays > 1 ? ` (${diffDays} days)` : ""}`;
}

function statusFor(hours: number, target: number): "fresh" | "recovering" | "recent" {
  if (hours >= target) return "fresh";
  if (hours < 24) return "recent";
  return "recovering";
}

export function MuscleRecoveryPanel() {
  const sets = useLiveQuery(() => db.workoutSets.toArray(), []);
  const [now] = useState(() => Date.now());
  const [editMuscle, setEditMuscle] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const noteRow = useLiveQuery(() => db.recoveryNotes.get("main-recovery-note"), []);
  const reasons = noteRow?.reasons ?? {};

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

  const openEditor = (muscle: string) => {
    setEditMuscle(muscle);
    setDraft(reasons[muscle] ?? "");
  };

  const saveNote = async () => {
    if (!editMuscle) return;
    const next = { ...reasons };
    if (draft.trim()) next[editMuscle] = draft.trim();
    else delete next[editMuscle];
    await db.recoveryNotes.put({
      id: "main-recovery-note",
      reasons: next,
      updatedAt: Date.now(),
    });
    setEditMuscle(null);
  };

  const editLabel = editMuscle ? (MUSCLE_LABELS[editMuscle] ?? editMuscle.replace(/_/g, " ")) : "";
  const editTarget = editMuscle ? (RECOVERY_HOURS[editMuscle] ?? DEFAULT_RECOVERY_HOURS) : 0;
  const editTs = editMuscle ? (recovery.get(editMuscle) ?? now) : now;
  const editHours = editMuscle ? Math.max(0, (now - editTs) / 3600000) : 0;
  const editStatus = editMuscle ? statusFor(editHours, editTarget) : "fresh";

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
          const reason = reasons[muscle];
          const lastTrained = recovery.get(muscle) ?? 0;
          return (
            <button
              key={muscle}
              onClick={() => openEditor(muscle)}
              className="w-full text-left flex items-center justify-between gap-2 py-3 border-b border-border/60 last:border-0 group"
            >
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
                  {status === "fresh" ? (
                    "Ready"
                  ) : (
                    <>
                      {formatReadyAt(lastTrained, target - hours)} · {formatAgo(hours)}
                    </>
                  )}
                </p>
                {reason && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate italic">
                    “{reason}”
                  </p>
                )}
              </div>
              <StatusChip status={status} className="shrink-0" />
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground mt-2">
        Percentages are estimates from recent logged workouts. Tap a muscle to add a note.
      </p>

      {/* Editor sheet */}
      <Sheet open={!!editMuscle} onOpenChange={(open) => !open && setEditMuscle(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-6">
          <SheetHeader className="pb-2">
            <SheetTitle>
              {editLabel}
              <span className="ml-2 text-xs font-medium text-muted-foreground capitalize">
                {editStatus}
              </span>
            </SheetTitle>
            <SheetDescription>
              {editStatus === "fresh"
                ? "This muscle group is ready to train."
                : `Will be ready ${formatReadyAt(editTs, editTarget - editHours)}. Add a note to remember why it’s still recovering.`}
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 space-y-4">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Why is this still recovering? e.g. sore from yesterday, injury flare-up, long session..."
              rows={3}
              className="w-full rounded-xl border border-border bg-muted/50 p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex gap-2">
              {draft.trim() && (
                <Button variant="ghost" className="flex-1 text-muted-foreground" onClick={() => setDraft("")}>
                  Clear
                </Button>
              )}
              <Button className="flex-1" onClick={saveNote} disabled={!draft.trim()}>
                Save note
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}