// Yono Workout — Achievement Badges
// Deterministic, locally-computed gamification based on logged workouts.

import type { WorkoutSession, WorkoutSet } from "@/types";
import { estimateOneRepMax, calculateTotalVolume } from "@/lib/progression";

export interface AchievementDef {
  code: string;
  name: string;
  description: string;
  icon: "medal" | "flame" | "calendar" | "target" | "zap" | "star" | "trophy" | "heart";
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    code: "first_workout",
    name: "First Steps",
    description: "Complete your first workout.",
    icon: "star",
  },
  {
    code: "streak_3",
    name: "On a Roll",
    description: "Train 3 days in a row.",
    icon: "flame",
  },
  {
    code: "streak_7",
    name: "Unstoppable",
    description: "Train 7 days in a row.",
    icon: "flame",
  },
  {
    code: "week_3",
    name: "Weekly Warrior",
    description: "Complete 3 workouts in a single week.",
    icon: "calendar",
  },
  {
    code: "sessions_10",
    name: "Double Digits",
    description: "Complete 10 workouts total.",
    icon: "calendar",
  },
  {
    code: "sessions_25",
    name: "Veteran",
    description: "Complete 25 workouts total.",
    icon: "trophy",
  },
  {
    code: "volume_10t",
    name: "Lifter",
    description: "Log 10,000 kg of lifetime training volume.",
    icon: "zap",
  },
  {
    code: "volume_50t",
    name: "Beast Mode",
    description: "Log 50,000 kg of lifetime training volume.",
    icon: "zap",
  },
  {
    code: "first_pr",
    name: "Personal Best",
    description: "Beat your previous best weight on any lift.",
    icon: "target",
  },
  {
    code: "muscles_10",
    name: "Explorer",
    description: "Train 10 different muscle groups.",
    icon: "medal",
  },
  {
    code: "session_90min",
    name: "Endurance",
    description: "Log a single workout of 90+ minutes.",
    icon: "heart",
  },
];

const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

export interface AchievementResult {
  code: string;
  earned: boolean;
  earnedAt: number | null;
  progress: { current: number; target: number };
}

export function evaluateAchievements(
  sessions: WorkoutSession[],
  allSets: WorkoutSet[],
  trainedMuscleGroups: Set<string>
): AchievementResult[] {
  const completed = sessions
    .filter((s) => s.completedAt)
    .sort((a, b) => a.completedAt! - b.completedAt!);
  const workingSets = allSets.filter((s) => s.setType !== "warmup");

  const daySet = new Set<string>();
  for (const s of completed) daySet.add(dayKey(s.completedAt!));
  const days = [...daySet].sort();
  const totalSessions = completed.length;

  let longestStreak = 0;
  let run = 0;
  let prevDay: Date | null = null;
  for (const d of days) {
    const [y, m, day] = d.split("-").map(Number);
    const date = new Date(y, m, day);
    if (prevDay && date.getTime() - prevDay.getTime() === 86400000) run++;
    else run = 1;
    if (run > longestStreak) longestStreak = run;
    prevDay = date;
  }

  const weekCounts = new Map<string, number>();
  for (const s of completed) {
    const d = new Date(s.completedAt!);
    const day = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    const key = `${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`;
    weekCounts.set(key, (weekCounts.get(key) ?? 0) + 1);
  }
  const maxWeek = Math.max(0, ...weekCounts.values());

  const totalVolume = calculateTotalVolume(workingSets);

  const bestByExercise = new Map<string, number>();
  let prCount = 0;
  const setsByTime = workingSets
    .filter((s) => s.weightKg && s.reps)
    .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0));
  for (const s of setsByTime) {
    const est = estimateOneRepMax(s.weightKg!, s.reps!);
    const prev = bestByExercise.get(s.exerciseId) ?? 0;
    if (est > prev) {
      if (prev > 0) prCount++;
      bestByExercise.set(s.exerciseId, est);
    }
  }

  const maxSessionMinutes = Math.max(
    0,
    ...completed.map((s) => {
      if (!s.startedAt || !s.completedAt) return 0;
      return (s.completedAt - s.startedAt) / 60000;
    })
  );

  const progressFor = (code: string): { current: number; target: number } => {
    switch (code) {
      case "first_workout":
        return { current: totalSessions, target: 1 };
      case "streak_3":
        return { current: longestStreak, target: 3 };
      case "streak_7":
        return { current: longestStreak, target: 7 };
      case "week_3":
        return { current: maxWeek, target: 3 };
      case "sessions_10":
        return { current: totalSessions, target: 10 };
      case "sessions_25":
        return { current: totalSessions, target: 25 };
      case "volume_10t":
        return { current: Math.round(totalVolume), target: 10000 };
      case "volume_50t":
        return { current: Math.round(totalVolume), target: 50000 };
      case "first_pr":
        return { current: prCount, target: 1 };
      case "muscles_10":
        return { current: trainedMuscleGroups.size, target: 10 };
      case "session_90min":
        return { current: Math.floor(maxSessionMinutes), target: 90 };
      default:
        return { current: 0, target: 1 };
    }
  };

  const isEarned = (code: string): boolean => {
    const p = progressFor(code);
    return p.current >= p.target;
  };

  const firstSessionAt = completed[0]?.completedAt ?? null;

  return ACHIEVEMENTS.map((a) => {
    const progress = progressFor(a.code);
    return {
      code: a.code,
      earned: isEarned(a.code),
      earnedAt: isEarned(a.code) ? firstSessionAt : null,
      progress,
    };
  });
}

export function getAchievementByCode(code: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.code === code);
}
