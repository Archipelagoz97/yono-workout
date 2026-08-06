"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUpIcon, ZapIcon, CalendarIcon, TargetIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/db/database";
import { estimateOneRepMax, calculateTotalVolume } from "@/lib/progression";
import { exercises as exerciseCatalog } from "@/data/exercises.compact";

const exerciseMap = new Map(exerciseCatalog.map((e) => [e.id, e]));

export default function ProgressPage() {
  const sessions = useLiveQuery(
    () =>
      db.workoutSessions
        .where("status")
        .equals("completed")
        .toArray(),
    []
  );

  const allSets = useLiveQuery(() => db.workoutSets.toArray(), []);

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

  if (!stats) {
    return (
      <div className="min-h-screen yono-gradient content-with-nav">
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
    <div className="min-h-screen yono-gradient content-with-nav">
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
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {def?.name ?? exerciseId}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {pr.weightKg} kg × {pr.reps} reps
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Est. 1RM</p>
                      <p className="font-bold text-primary">{Math.round(pr.est1RM)} kg</p>
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
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1">{icon}</div>
      <p className="text-2xl font-display font-bold text-foreground leading-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </Card>
  );
}
