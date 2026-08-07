"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUpIcon,
  ZapIcon,
  CalendarIcon,
  TargetIcon,
  MedalIcon,
  FlameIcon,
  StarIcon,
  TrophyIcon,
  HeartIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/db/database";
import { estimateOneRepMax, calculateTotalVolume } from "@/lib/progression";
import { exercises as exerciseCatalog } from "@/data/exercises.compact";
import { kgToDisplay, formatWeight, type WeightUnit } from "@/lib/units";
import { evaluateAchievements, getAchievementByCode } from "@/lib/achievements";
import type { WorkoutSet } from "@/types";
const exerciseMap = new Map(exerciseCatalog.map((e) => [e.id, e]));

const ACHIEVEMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  medal: MedalIcon,
  flame: FlameIcon,
  calendar: CalendarIcon,
  target: TargetIcon,
  zap: ZapIcon,
  star: StarIcon,
  trophy: TrophyIcon,
  heart: HeartIcon,
};

interface ExerciseTrend {
  exerciseId: string;
  name: string;
  sessions: Array<{ completedAt: number; bestWeightKg: number; bestReps: number; est1RM: number }>;
  repPRs: Array<{ reps: number; weightKg: number }>;
  lastWeightKg?: number;
  peakWeightKg: number;
}

// ─────────────────────────────────────────────────────────
// Lightweight SVG line chart (no external dependencies)
// ─────────────────────────────────────────────────────────
function SimpleLineChart({
  points,
  unit,
}: {
  points: Array<{ completedAt: number; value: number; label: string }>;
  unit: WeightUnit;
}) {
  const W = 320;
  const H = 130;
  const PAD_X = 8;
  const PAD_Y = 16;

  const values = points.map((p) => p.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const span = max - min;
  const yMax = max + span * 0.15;
  const yMin = Math.max(0, min - span * 0.2);

  const xFor = (i: number) =>
    points.length === 1
      ? PAD_X + (W - PAD_X * 2) / 2
      : PAD_X + (i / (points.length - 1)) * (W - PAD_X * 2);
  const yFor = (v: number) => H - PAD_Y - ((v - yMin) / (yMax - yMin || 1)) * (H - PAD_Y * 2);

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.value).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${xFor(points.length - 1)} ${H - PAD_Y} L ${xFor(0)} ${H - PAD_Y} Z`;

  const first = points[0];
  const last = points[points.length - 1];

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#chartFill)" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={xFor(i)}
            cy={yFor(p.value)}
            r="3"
            fill="var(--color-background)"
            stroke="var(--color-primary)"
            strokeWidth="2"
          >
            <title>{`${p.label}: ${Math.round(p.value * 100) / 100} ${unit}`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground px-1">
        <span>
          {new Date(first.completedAt).toLocaleDateString("en", {
            month: "short",
            year: "2-digit",
          })}
        </span>
        <span className="font-semibold text-foreground">
          {Math.round(last.value * 100) / 100} {unit}
        </span>
        <span>
          {new Date(last.completedAt).toLocaleDateString("en", {
            month: "short",
            year: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  const profile = useLiveQuery(() => db.profiles.get("main-user"), []);
  const weightUnit: WeightUnit = profile?.preferredWeightUnit ?? "kg";

  const sessions = useLiveQuery(
    () =>
      db.workoutSessions
        .where("status")
        .equals("completed")
        .toArray(),
    []
  );

  const allSets = useLiveQuery(() => db.workoutSets.toArray(), []);

  const achievementUnlocks = useLiveQuery(() => db.achievementUnlocks.toArray(), []);

  // ─────────────────────────────────────────────────────────
  // Achievement evaluation + persistence
  // ─────────────────────────────────────────────────────────
  const achievements = useMemo(() => {
    if (!sessions || !allSets) return null;
    const workingSets = allSets.filter((s) => s.setType !== "warmup");
    const muscleSet = new Set<string>();
    for (const s of workingSets) {
      const def = exerciseMap.get(s.exerciseId);
      if (def) def.primaryMuscles.forEach((m) => muscleSet.add(m));
    }
    return evaluateAchievements(sessions, allSets, muscleSet);
  }, [sessions, allSets]);

  useEffect(() => {
    if (!achievements || !achievementUnlocks) return;
    const earnedAt = new Map(achievementUnlocks.map((u) => [u.code, u.earnedAt]));
    const now = Date.now();
    for (const a of achievements) {
      if (a.earned && !earnedAt.has(a.code)) {
        db.achievementUnlocks.put({ code: a.code, earnedAt: now }).catch(() => {});
      }
    }
  }, [achievements, achievementUnlocks]);

  const stats = useMemo(() => {
    if (!sessions || !allSets) return null;

    const completedSessions = sessions;
    const workingSets = allSets.filter((s) => s.setType !== "warmup");

    // Personal records per exercise
    const prMap = new Map<string, { weightKg: number; reps: number; est1RM: number }>();
    for (const set of workingSets) {
      if (!set.weightKg || !set.reps) continue;
      const est1RM = estimateOneRepMax(set.weightKg, set.reps);
      const existing = prMap.get(set.exerciseId);
      if (!existing || est1RM > existing.est1RM) {
        prMap.set(set.exerciseId, { weightKg: set.weightKg, reps: set.reps, est1RM });
      }
    }

    // Total volume
    const totalVolume = calculateTotalVolume(workingSets);

    // Days trained this month
    const now = new Date();
    const thisMonth = completedSessions.filter((s) => {
      if (!s.completedAt) return false;
      const d = new Date(s.completedAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    // Unique muscle groups this week
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentSets = workingSets.filter((s) => s.completedAt > weekAgo);
    const muscleGroups = new Set<string>();
    for (const set of recentSets) {
      const def = exerciseMap.get(set.exerciseId);
      if (def) def.primaryMuscles.forEach((m) => muscleGroups.add(m));
    }

    return {
      totalSessions: completedSessions.length,
      totalSets: workingSets.length,
      totalVolume: Math.round(totalVolume),
      thisMonthSessions: thisMonth.length,
      personalRecords: [...prMap.entries()].slice(0, 10),
      recentMuscleGroups: [...muscleGroups].slice(0, 8),
    };
  }, [sessions, allSets]);

  // Per-exercise trends + rep PRs
  const trends = useMemo(() => {
    if (!allSets) return [];
    const workingSets = allSets.filter(
      (s) => s.setType !== "warmup" && s.weightKg && s.reps
    );

    // Group sets into sessions per exercise
    const byExercise = new Map<string, Map<string, WorkoutSet[]>>();
    for (const s of workingSets) {
      let bySession = byExercise.get(s.exerciseId);
      if (!bySession) {
        bySession = new Map();
        byExercise.set(s.exerciseId, bySession);
      }
      const list = bySession.get(s.sessionId);
      if (list) list.push(s);
      else bySession.set(s.sessionId, [s]);
    }

    const result: ExerciseTrend[] = [];
    for (const [exerciseId, bySession] of byExercise) {
      const sessionPoints: ExerciseTrend["sessions"] = [];
      for (const [sessionId, sets] of bySession) {
        // Best set of the session by est 1RM
        let best: { weightKg: number; reps: number; est1RM: number } | null = null;
        for (const set of sets) {
          const est = estimateOneRepMax(set.weightKg!, set.reps!);
          if (!best || est > best.est1RM) {
            best = { weightKg: set.weightKg!, reps: set.reps!, est1RM: est };
          }
        }
        if (!best) continue;
        const completedAt =
          sessions?.find((s) => s.id === sessionId)?.completedAt ?? 0;
        sessionPoints.push({
          completedAt,
          bestWeightKg: best.weightKg,
          bestReps: best.reps,
          est1RM: best.est1RM,
        });
      }
      if (sessionPoints.length === 0) continue;
      sessionPoints.sort((a, b) => a.completedAt - b.completedAt);

      // Rep PRs: heaviest weight at each rep count
      const repPRMap = new Map<number, number>();
      for (const s of workingSets) {
        if (s.exerciseId !== exerciseId) continue;
        const cur = repPRMap.get(s.reps!) ?? 0;
        if (s.weightKg! > cur) repPRMap.set(s.reps!, s.weightKg!);
      }
      const repPRs = [...repPRMap.entries()]
        .sort((a, b) => a[0] - b[0])
        .filter(([reps]) => reps >= 1 && reps <= 20)
        .map(([reps, weightKg]) => ({ reps, weightKg }));

      const peakWeightKg = Math.max(...sessionPoints.map((p) => p.bestWeightKg));
      const def = exerciseMap.get(exerciseId);

      result.push({
        exerciseId,
        name: def?.name ?? exerciseId,
        sessions: sessionPoints,
        repPRs,
        lastWeightKg: sessionPoints[sessionPoints.length - 1].bestWeightKg,
        peakWeightKg,
      });
    }

    // Sort by most sessions first
    result.sort((a, b) => b.sessions.length - a.sessions.length);
    return result;
  }, [allSets, sessions]);

  const selectedTrend =
    (selectedExerciseId &&
      trends.find((t) => t.exerciseId === selectedExerciseId)) ||
    trends[0];

  // Per-exercise insight: direction + something to double down on.
  const selectedInsight = useMemo(() => {
    if (!selectedTrend || selectedTrend.sessions.length < 2) return null;
    const pts = selectedTrend.sessions;
    const recent = pts.slice(-3);
    const first = pts[0];
    const last = pts[pts.length - 1];
    const totalChange = ((last.est1RM - first.est1RM) / (first.est1RM || 1)) * 100;
    const recentChange =
      ((recent[recent.length - 1].est1RM - recent[0].est1RM) /
        (recent[0].est1RM || 1)) *
      100;

    let direction: "up" | "flat" | "down";
    if (recentChange > 1) direction = "up";
    else if (recentChange < -1) direction = "down";
    else direction = "flat";

    const total = Math.round(totalChange);
    const recentSigned = Math.round(recentChange);

    if (direction === "up") {
      if (total > 15) {
        return {
          tone: "accent" as const,
          text: `You're up ${total}% overall on this lift. To keep climbing, add ~2.5kg and stay at the same reps, or stay at weight and push reps.`,
        };
      }
      return {
        tone: "primary" as const,
        text: `Trending up (${recentSigned >= 0 ? "+" : ""}${recentSigned}% over last 3 sessions). Steady like this and you&apos;ll beat your peak soon.`,
      };
    }
    if (direction === "down") {
      return {
        tone: "destructive" as const,
        text: `Off your best in the last ${recent.length} ${recent.length === 1 ? "session" : "sessions"} (${recentSigned}%). Could be fatigue — consider a lighter session or more rest before retesting.`,
      };
    }
    return {
      tone: "secondary" as const,
      text: `Strength has been steady. To grow it, add a small weight step or a couple of reps — otherwise this plateaus.`,
    };
  }, [selectedTrend]);

  if (!stats) {
    return (
      <div className="min-h-dvh yono-gradient content-with-nav">
        <div className="px-4 pt-12">
          <h1 className="text-2xl font-display font-bold">Progress</h1>
        </div>
        <div className="px-4 mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 skeleton rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh yono-gradient content-with-nav">
      {/* Header */}
      <div className="px-4 pt-12 pb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Progress</h1>
        <p className="text-muted-foreground text-sm mt-1">Calculated from your logged sets.</p>
      </div>

      {/* Stats grid */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-6">
        <StatCard
          icon={<CalendarIcon className="w-5 h-5 text-primary" />}
          label="Total sessions"
          value={stats.totalSessions.toString()}
        />
        <StatCard
          icon={<ZapIcon className="w-5 h-5 text-accent" />}
          label="This month"
          value={`${stats.thisMonthSessions} sessions`}
        />
        <StatCard
          icon={<TrendingUpIcon className="w-5 h-5 text-secondary" />}
          label="Total sets"
          value={stats.totalSets.toLocaleString()}
        />
        <StatCard
          icon={<TargetIcon className="w-5 h-5 text-primary" />}
          label="Total volume"
          value={`${(stats.totalVolume / 1000).toFixed(1)}t`}
        />
      </div>

      {/* Recent muscle groups */}
      {stats.recentMuscleGroups.length > 0 && (
        <div className="px-4 mb-6">
          <h2 className="text-base font-semibold text-foreground mb-3">Muscles trained this week</h2>
          <div className="flex flex-wrap gap-2">
            {stats.recentMuscleGroups.map((m) => (
              <Badge key={m} variant="secondary" className="capitalize">
                {m.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {achievements && (
        <div className="px-4 mb-6">
          <h2 className="text-base font-semibold text-foreground mb-3">
            Achievements
            <span className="text-muted-foreground font-normal text-sm ml-2">
              {achievements.filter((a) => a.earned).length}/{achievements.length} unlocked
            </span>
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {achievements.map((a) => {
              const def = getAchievementByCode(a.code);
              if (!def) return null;
              const Icon = ACHIEVEMENT_ICONS[def.icon] ?? MedalIcon;
              const pct = Math.min(100, Math.round((a.progress.current / a.progress.target) * 100));
              return (
                <motion.div
                  key={a.code}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  <Card
                    className={`p-3 h-full ${
                      a.earned
                        ? "bg-primary/5 border-primary/40"
                        : "opacity-60 border-border"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon
                        className={`w-5 h-5 shrink-0 ${
                          a.earned ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight">
                          {def.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                          {def.description}
                        </p>
                      </div>
                    </div>
                    {!a.earned && (
                      <div className="mt-2">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary/50 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                          {a.progress.current.toLocaleString()} /{" "}
                          {a.progress.target.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Exercise progress charts */}
      {trends.length > 0 && (
        <div className="px-4 mb-6">
          <h2 className="text-base font-semibold text-foreground mb-3">
            Strength over time
          </h2>

          {/* Exercise selector */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mb-3">
            {trends.map((t) => (
              <button
                key={t.exerciseId}
                onClick={() => setSelectedExerciseId(t.exerciseId)}
                className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-all ${
                  selectedTrend?.exerciseId === t.exerciseId
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          {selectedTrend && (
            <motion.div
              key={selectedTrend.exerciseId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-foreground text-sm">
                    {selectedTrend.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Best {formatWeight(selectedTrend.peakWeightKg, weightUnit)}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {selectedTrend.sessions.length}{" "}
                      {selectedTrend.sessions.length === 1 ? "session" : "sessions"}
                    </Badge>
                  </div>
                </div>

                {selectedTrend.sessions.length >= 2 ? (
                  <SimpleLineChart
                    unit={weightUnit}
                    points={selectedTrend.sessions.map((s) => ({
                      completedAt: s.completedAt,
                      value: kgToDisplay(s.bestWeightKg, weightUnit),
                      label: `${new Date(s.completedAt).toLocaleDateString()}: ${kgToDisplay(s.bestWeightKg, weightUnit)} ${weightUnit} × ${s.bestReps}`,
                    }))}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Log this exercise in at least 2 workouts to see your progress chart.
                  </p>
                )}

                <p className="text-[10px] text-muted-foreground mt-2">
                  Best working set weight per session. Progress is expected to move
                  gradually.
                </p>
              </Card>

              {/* Insight callout */}
              {selectedInsight && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`mt-3 rounded-2xl px-4 py-3 border ${
                    selectedInsight.tone === "destructive"
                      ? "bg-destructive/10 border-destructive/30"
                      : selectedInsight.tone === "accent"
                        ? "bg-accent/10 border-accent/30"
                        : selectedInsight.tone === "secondary"
                          ? "bg-secondary/10 border-secondary/30"
                          : "bg-primary/10 border-primary/30"
                  }`}
                >
                  <p className="text-xs leading-relaxed text-foreground">
                    <span className="font-semibold">Yono&apos;s take: </span>
                    {selectedInsight.text}
                  </p>
                </motion.div>
              )}

              {/* Rep records */}
              {selectedTrend.repPRs.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Rep records
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTrend.repPRs.map(({ reps, weightKg }) => (
                      <span
                        key={reps}
                        className="text-xs bg-background border border-border px-2 py-1 rounded-lg font-mono"
                      >
                        {formatWeight(weightKg, weightUnit)} × {reps}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    Heaviest weight ever lifted at each rep count.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* Personal records */}
      {stats.personalRecords.length > 0 && (
        <div className="px-4 mb-6">
          <h2 className="text-base font-semibold text-foreground mb-3">Personal records</h2>
          <div className="space-y-2">
            {stats.personalRecords.map(([exerciseId, pr], index) => {
              const def = exerciseMap.get(exerciseId);
              return (
                <motion.div
                  key={exerciseId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.06, type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Card className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {def?.name ?? exerciseId}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatWeight(pr.weightKg, weightUnit)} × {pr.reps} reps
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Est. 1RM</p>
                      <p className="font-bold text-primary">
                        {Math.round(kgToDisplay(pr.est1RM, weightUnit))} {weightUnit}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            1RM estimates use the Epley formula and are approximate.
          </p>
        </div>
      )}

      {stats.totalSessions === 0 && (
        <div className="px-4 text-center py-16">
          <TrendingUpIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Complete your first workout to see progress here.</p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-1">{icon}</div>
        <p className="text-2xl font-display font-bold text-foreground leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </Card>
    </motion.div>
  );
}
