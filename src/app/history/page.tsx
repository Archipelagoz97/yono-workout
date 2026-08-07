"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { CalendarIcon, SearchIcon, TrashIcon, ChevronRightIcon, PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/db/database";
import type { WorkoutSession, SessionExercise, WorkoutSet } from "@/types";
import { exercises as exerciseCatalog } from "@/data/exercises.compact";
import { formatWeight, type WeightUnit } from "@/lib/units";

const exerciseMap = new Map(exerciseCatalog.map((e) => [e.id, e]));

// ─────────────────────────────────────────────────────────
// Calendar heatmap (GitHub-style contribution graph)
// ─────────────────────────────────────────────────────────
function WorkoutHeatmap({ sessions }: { sessions: WorkoutSession[] }) {
  const weeks = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const s of sessions) {
      if (!s.completedAt) continue;
      const d = new Date(s.completedAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }

    // Build weeks ending today, going back 53 weeks
    const grid: Array<Array<{ date: Date; count: number } | null>> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Start of the week (Sunday) of 53 weeks ago
    const start = new Date(today);
    const dayOffset = (start.getDay() + 6) % 7; // Monday-start? use Sunday
    start.setDate(start.getDate() - dayOffset - 53 * 7);

    const cursor = new Date(start);
    for (let w = 0; w < 54; w++) {
      const week: Array<{ date: Date; count: number } | null> = [];
      for (let d = 0; d < 7; d++) {
        if (cursor > today) {
          week.push(null);
        } else {
          const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
          week.push({ date: new Date(cursor), count: byDay.get(key) ?? 0 });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      grid.push(week);
    }
    return grid;
  }, [sessions]);

  const colorFor = (count: number) => {
    if (count === 0) return "bg-muted";
    return "bg-primary/80";
  };

  const today = new Date();
  const thisMonth = today.toLocaleDateString("en", { month: "short" });

  // Newest weeks first so they align to the right and are visible on load.
  const reversedWeeks = [...weeks].reverse();

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Activity</h2>
        <span className="text-xs text-muted-foreground">Last 12 months</span>
      </div>
      <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain scrollbar-none -mx-1 px-1 pb-1">
        <div className="flex flex-row-reverse gap-[3px] w-max min-w-full">
          {reversedWeeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((cell, di) =>
                cell ? (
                  <div
                    key={di}
                    title={`${cell.date.toDateString()}: ${cell.count} ${cell.count === 1 ? "workout" : "workouts"}`}
                    className={`w-[11px] h-[11px] rounded-[3px] ${colorFor(cell.count)}`}
                  />
                ) : (
                  <div key={di} className="w-[11px] h-[11px] rounded-[3px] bg-transparent" />
                )
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-muted-foreground">{thisMonth} is here</span>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          Less
          <span className="w-[11px] h-[11px] rounded-[3px] bg-muted" />
          <span className="w-[11px] h-[11px] rounded-[3px] bg-primary/30" />
          <span className="w-[11px] h-[11px] rounded-[3px] bg-primary/60" />
          <span className="w-[11px] h-[11px] rounded-[3px] bg-primary/80" />
          More
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
// Session detail drill-down
// ─────────────────────────────────────────────────────────
function SessionDetailDialog({
  session,
  onOpenChange,
  onRepeat,
}: {
  session: WorkoutSession | null;
  onOpenChange: (open: boolean) => void;
  onRepeat: (session: WorkoutSession) => void;
}) {
  const sessionId = session?.id;

  const profile = useLiveQuery(() => db.profiles.get("main-user"), []);
  const weightUnit: WeightUnit = profile?.preferredWeightUnit ?? "kg";

  const exercises = useLiveQuery(
    () =>
      sessionId
        ? db.sessionExercises
            .where("sessionId")
            .equals(sessionId)
            .sortBy("order")
        : [],
    [sessionId]
  );

  const setsByExercise = useLiveQuery(
    () =>
      sessionId
        ? db.workoutSets
            .where("sessionId")
            .equals(sessionId)
            .toArray()
        : [],
    [sessionId]
  );

  const groupSets = (ex: SessionExercise): WorkoutSet[] =>
    (setsByExercise ?? [])
      .filter((s) => s.sessionExerciseId === ex.id)
      .sort((a, b) => a.setNumber - b.setNumber);

  const totalSets = setsByExercise?.length ?? 0;

  return (
    <Dialog open={!!session} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 flex flex-col max-h-[85vh]">
        {session && (
          <>
            <DialogHeader className="p-5 pb-3 border-b border-border">
              <DialogTitle className="text-lg text-left">{session.name}</DialogTitle>
              <DialogDescription className="text-left">
                {session.completedAt
                  ? new Date(session.completedAt).toLocaleDateString("en", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : new Date(session.updatedAt).toLocaleDateString()}
                {session.estimatedMinutes ? ` · ~${session.estimatedMinutes}m` : ""}
                {" · "}{totalSets} sets
              </DialogDescription>
              {session.focus && session.focus.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {session.focus.map((f) => (
                    <Badge key={f} variant="secondary" className="text-xs">
                      {f.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              )}
            </DialogHeader>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-5 space-y-4">
                {!exercises && (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 skeleton rounded-xl" />
                    ))}
                  </div>
                )}

                {exercises?.map((ex, ei) => {
                  const def = exerciseMap.get(ex.exerciseId);
                  const sets = groupSets(ex);
                  return (
                    <div key={ex.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-muted-foreground w-5">
                          {ei + 1}
                        </span>
                        <p className="font-semibold text-foreground text-sm flex-1">
                          {def?.name ?? ex.exerciseId}
                        </p>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {sets.filter((s) => s.setType !== "warmup").length} working
                        </Badge>
                      </div>
                      <div className="pl-7 space-y-1">
                        {sets.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">
                            No sets logged
                          </p>
                        )}
                        {sets.map((s) => {
                          let detail: string;
                          if (s.weightKg) {
                            detail = `${formatWeight(s.weightKg, weightUnit)} × ${s.reps ?? "?"}`;
                          } else if (s.assistanceWeightKg) {
                            detail = `${formatWeight(s.assistanceWeightKg, weightUnit)} assist × ${s.reps ?? "?"}`;
                          } else if (s.durationSeconds) {
                            detail = `${Math.floor(s.durationSeconds / 60)}:${(s.durationSeconds % 60)
                              .toString()
                              .padStart(2, "0")}${s.distanceMeters ? ` · ${s.distanceMeters} m` : ""}`;
                          } else if (s.reps) {
                            detail = `${s.reps} reps`;
                          } else {
                            detail = "—";
                          }
                          return (
                            <div
                              key={s.id}
                              className="flex items-center gap-2 text-xs py-1 border-b border-border/50 last:border-0"
                            >
                              <span className="text-muted-foreground w-4 font-mono">
                                {s.setNumber}
                              </span>
                              <span className="font-mono text-foreground">{detail}</span>
                              {s.rpe ? (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  RPE {s.rpe}
                                </Badge>
                              ) : null}
                              {s.setType !== "working" ? (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 capitalize"
                                >
                                  {s.setType}
                                </Badge>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border">
              <Button
                onClick={() => onRepeat(session)}
                className="w-full h-11 rounded-xl font-semibold"
              >
                <PlayIcon className="w-4 h-4 mr-2" />
                Repeat this workout
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────
// History page
// ─────────────────────────────────────────────────────────
export default function HistoryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<WorkoutSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [detailSession, setDetailSession] = useState<WorkoutSession | null>(null);

  const sessions = useLiveQuery(
    () =>
      db.workoutSessions
        .where("status")
        .equals("completed")
        .reverse()
        .sortBy("completedAt"),
    []
  );

  // Batch set counts: single query instead of one per card (fixes N+1)
  const setCounts = useLiveQuery(
    () =>
      db.workoutSets.toArray().then((sets) => {
        const map = new Map<string, number>();
        for (const s of sets) {
          map.set(s.sessionId, (map.get(s.sessionId) ?? 0) + 1);
        }
        return map;
      }),
    []
  );

  const filtered = sessions?.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.focus?.some((f) => f.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const exercises = await db.sessionExercises
        .where("sessionId")
        .equals(deleteTarget.id)
        .toArray();
      await db.transaction(
        "rw",
        [db.workoutSessions, db.sessionExercises, db.workoutSets],
        async () => {
          for (const ex of exercises) {
            await db.workoutSets.where("sessionExerciseId").equals(ex.id).delete();
          }
          await db.sessionExercises.where("sessionId").equals(deleteTarget.id).delete();
          await db.workoutSessions.delete(deleteTarget.id);
        }
      );
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleRepeat = async (source: WorkoutSession) => {
    const now = Date.now();
    const sessionId = crypto.randomUUID();
    const sourceExercises = await db.sessionExercises
      .where("sessionId")
      .equals(source.id)
      .sortBy("order");

    await db.transaction(
      "rw",
      [db.workoutSessions, db.sessionExercises],
      async () => {
        await db.workoutSessions.add({
          id: sessionId,
          name: source.name,
          gymId: source.gymId ?? "ftl",
          status: "active",
          source: "duplicate",
          focus: source.focus,
          energy: source.energy,
          estimatedMinutes: source.estimatedMinutes,
          startedAt: now,
          createdAt: now,
          updatedAt: now,
        });

        for (const ex of sourceExercises) {
          await db.sessionExercises.add({
            id: crypto.randomUUID(),
            sessionId,
            exerciseId: ex.exerciseId,
            order: ex.order,
            status: "pending",
            targetSets: ex.targetSets,
            repMin: ex.repMin,
            repMax: ex.repMax,
            suggestedWeightKg: ex.suggestedWeightKg,
            restSeconds: ex.restSeconds,
            notes: ex.notes,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    );

    setDetailSession(null);
    router.push(`/workout/${sessionId}`);
  };

  const totalSessions = sessions?.length ?? 0;

  return (
    <div className="min-h-dvh yono-gradient content-with-nav">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-display font-bold text-foreground">History</h1>
          <Badge variant="secondary">{totalSessions} sessions</Badge>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          All your workout records, stored locally.
        </p>

        <div className="relative w-full min-w-0 max-w-full">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="history-search"
            placeholder="Search workouts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
      </div>

      {/* Heatmap */}
      {sessions && sessions.length > 0 && (
        <div className="px-4">
          <WorkoutHeatmap sessions={sessions} />
        </div>
      )}

      {/* Session list */}
      <div className="px-4 space-y-3">
        {!sessions && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 skeleton rounded-2xl" />
            ))}
          </div>
        )}

        {sessions && filtered?.length === 0 && (
          <div className="text-center py-16">
            <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {search ? "No workouts match your search." : "No completed workouts yet."}
            </p>
            {!search && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/today")}
              >
                Start your first workout
              </Button>
            )}
          </div>
        )}

        {filtered?.map((session, index) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-20px" }}
            transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 25 }}
          >
            <SessionCard
              session={session}
              setCount={setCounts?.get(session.id) ?? 0}
              onOpen={() => setDetailSession(session)}
              onDelete={() => setDeleteTarget(session)}
            />
          </motion.div>
        ))}
      </div>

      {/* Session detail */}
      <SessionDetailDialog
        session={detailSession}
        onOpenChange={(open) => !open && setDetailSession(null)}
        onRepeat={handleRepeat}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete workout?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{deleteTarget?.name}&quot; and all its sets.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={isDeleting}
              id="btn-confirm-delete-session"
            >
              <TrashIcon className="w-4 h-4 mr-1.5" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SessionCard({
  session,
  setCount,
  onOpen,
  onDelete,
}: {
  session: WorkoutSession;
  setCount: number;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const date = session.completedAt
    ? new Date(session.completedAt)
    : new Date(session.updatedAt);

  const daysSince = Math.floor(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card
      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onOpen}
    >
      <div className="flex items-center gap-3">
        {/* Date badge */}
        <div className="flex flex-col items-center justify-center w-12 h-12 bg-primary/10 rounded-xl shrink-0">
          <span className="text-xs font-bold text-primary">
            {date.toLocaleDateString("en", { month: "short" }).toUpperCase()}
          </span>
          <span className="text-lg font-bold text-primary leading-none">{date.getDate()}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{session.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {daysSince === 0 ? "Today" : daysSince === 1 ? "Yesterday" : `${daysSince}d ago`}
            </span>
            <span className="text-xs text-muted-foreground">· {setCount} sets</span>
            {session.estimatedMinutes && (
              <span className="text-xs text-muted-foreground">
                · ~{session.estimatedMinutes}m
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
            aria-label="Delete workout"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
          <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
}
