"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  SparklesIcon, DumbbellIcon, FootprintsIcon, PersonStandingIcon, LayersIcon,
  HeartPulseIcon, MoonIcon, SunIcon, ZapIcon, ChevronDownIcon, FlameIcon,
  PlayIcon, RepeatIcon, PlusIcon, FileTextIcon, TrashIcon, AlertCircleIcon,
  InfoIcon, CopyIcon, CheckIcon, RefreshCwIcon, MoreHorizontalIcon, BookmarkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { YonoAnimation } from "@/components/yono/YonoAnimation";
import { ExerciseDetailsDialog } from "@/components/workout/ExerciseDetailsDialog";
import { ExerciseSelectorDialog } from "@/components/workout/ExerciseSelectorDialog";
import { ChangeExerciseSheet } from "@/components/workout/ChangeExerciseSheet";
import { MuscleRecoveryPanel } from "@/components/workout/MuscleRecoveryPanel";
import {
  SectionHeader,
  SelectionCard,
  SegmentedControl,
  ChipSelector,
  CompactWorkoutRow,
} from "@/components/workout/TodayControls";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import db from "@/db/database";
import Dexie from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { getSelectedGymId, getWorkoutPrefs, saveWorkoutPrefs } from "@/lib/storage";
import { getTemplates, deleteTemplate, type WorkoutTemplate } from "@/lib/templates";
import { exercises } from "@/data/exercises.compact";
import { getFallbackExercises } from "@/lib/progression";
import { getMuscleRecoveryRows, getRecoveringLabels } from "@/lib/recovery";
import { notifyWorkoutDay } from "@/lib/notifications";
import { kgToDisplay, type WeightUnit } from "@/lib/units";
import type { WorkoutSession } from "@/types";
import type { BulkImportLogResult } from "@/lib/ai/schemas";

const FOCUS_OPTIONS = [
  { id: "choose", label: "Choose for me", icon: SparklesIcon },
  { id: "upper_body", label: "Upper body", icon: DumbbellIcon },
  { id: "lower_body", label: "Lower body", icon: FootprintsIcon },
  { id: "full_body", label: "Full body", icon: PersonStandingIcon },
  { id: "back_arms", label: "Back + Arms", icon: LayersIcon },
  { id: "cardio", label: "Cardio", icon: HeartPulseIcon },
];

const FOCUS_SPECIFIC = [
  { id: "back", label: "Back" },
  { id: "chest", label: "Chest" },
  { id: "shoulders", label: "Shoulders" },
  { id: "arms", label: "Arms" },
  { id: "chest_shoulders", label: "Chest + Shoulders" },
  { id: "legs", label: "Legs" },
  { id: "recovery", label: "Recovery" },
];

const ALL_FOCUS = [...FOCUS_OPTIONS, ...FOCUS_SPECIFIC];

// Fetch the last ~3 training performances (one per session) for an exercise,
// with their working-set weights & reps. Used to ground AI/offline weights.
async function fetchExerciseHistory(exerciseId: string) {
  const sets = await db.workoutSets
    .where("exerciseId")
    .equals(exerciseId)
    .toArray();

  const bySession = new Map<string, { completedAt: number; sets: Array<{ weightKg?: number; reps?: number }> }>();
  for (const s of sets) {
    if (s.setType === "warmup") continue;
    const entry = bySession.get(s.sessionId) ?? { completedAt: s.completedAt ?? 0, sets: [] };
    entry.sets.push({ weightKg: s.weightKg, reps: s.reps });
    if ((s.completedAt ?? 0) > entry.completedAt) entry.completedAt = s.completedAt ?? 0;
    bySession.set(s.sessionId, entry);
  }

  return {
    exerciseId,
    recentPerformances: Array.from(bySession.values())
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, 3),
  };
}

// Last real weight logged per exercise, keyed by exerciseId -> { lastWeightKg, lastReps }.
// Used by the offline fallback so it recommends weights the user can actually do.
async function buildExerciseHistoryMap() {
  const sets = await db.workoutSets.toArray();
  const history = new Map<
    string,
    { lastWeightKg?: number; lastReps?: number; lastTs: number }
  >();
  for (const s of sets) {
    if (s.setType === "warmup" || s.weightKg == null) continue;
    const cur = history.get(s.exerciseId);
    const ts = s.completedAt ?? 0;
    if (!cur || ts >= cur.lastTs) {
      history.set(s.exerciseId, {
        lastWeightKg: s.weightKg,
        lastReps: s.reps,
        lastTs: ts,
      });
    }
  }
  const out = new Map<string, { lastWeightKg?: number; lastReps?: number }>();
  for (const [id, h] of history) {
    out.set(id, { lastWeightKg: h.lastWeightKg, lastReps: h.lastReps });
  }
  return out;
}

const TIME_OPTIONS = [
  { id: "20", label: "20m" },
  { id: "30", label: "30m" },
  { id: "40", label: "40m" },
  { id: "60", label: "60m" },
  { id: "unlimited", label: "No limit" },
];

const ENERGY_OPTIONS = [
  { id: "low", label: "Low", icon: <MoonIcon className="w-4 h-4" /> },
  { id: "okay", label: "Okay", icon: <SunIcon className="w-4 h-4" /> },
  { id: "strong", label: "Strong", icon: <ZapIcon className="w-4 h-4" /> },
];

const EQUIPMENT_OPTIONS = [
  { id: "full", label: "Full gym" },
  { id: "machine", label: "Machines" },
  { id: "cable", label: "Cable" },
  { id: "dumbbell", label: "Dumbbells" },
  { id: "barbell", label: "Barbell" },
  { id: "cardio", label: "Cardio" },
];

type GenerationState = "idle" | "loading" | "success" | "error" | "offline";

// Reverse prompt: paste into an external AI so its log output matches Yono's importer.
const REVERSE_IMPORT_PROMPT = `You are my workout log assistant. Write out my recent workout history so it can be machine-parsed. You may include multiple days. Use this exact format, one block per workout day:

Date: <date or weekday>
Session: <Name> (<day or focus>)

Exercises:
1. <Exercise name> — <sets> sets x <reps> reps @ <weight>kg
2. <Exercise name> — <sets> sets x <reps> reps @ <weight>kg

Rules:
- Use the real exercise names (e.g. "Lat Pulldown", "Bench Press", "Treadmill").
- Always specify weight in kg (convert lb to kg: 1 lb = 0.45 kg).
- Put a "Date:" line before each distinct workout day so they're separated.
- For sets with different weights/reps, write each set separately, e.g. "3x10 @ 30kg, 3x8 @ 35kg".
- Bodyweight exercises: write only sets x reps (no weight), e.g. "3x12".
- Cardio: write duration and distance, e.g. "20 min @ 5 km".
- List exercises in the order I did them. Don't add commentary.`;

function LoadingLogs({ sessions }: { sessions: WorkoutSession[] | undefined }) {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const baseLogs = ["Activating Yono AI..."];
    if (sessions && sessions.length > 0) {
      baseLogs.push(`Analyzing your last ${sessions.length} workouts...`);
      sessions.forEach(s => {
        const dateStr = s.completedAt ? new Date(s.completedAt).toLocaleDateString() : 'Recently';
        baseLogs.push(`>> Reading log: ${s.name} (${dateStr})`);
      });
      baseLogs.push("Calculating rep & load ratios (Progressive Overload)...");
      baseLogs.push("Adjusting for today's energy...");
    } else {
      baseLogs.push("Building your initial program...");
    }
    baseLogs.push("Syncing with your gym equipment...");
    baseLogs.push("Finalizing Yono's workout...");

    let i = 0;
    const interval = setInterval(() => {
      if (i < baseLogs.length) {
        setLogs(prev => {
          const newLogs = [...prev, baseLogs[i]];
          // keep only last 5 lines to prevent overflow
          return newLogs.slice(-5);
        });
        i++;
      }
    }, 700);
    return () => clearInterval(interval);
  }, [sessions]);

  return (
    <div className="w-full max-w-[300px] h-28 mt-6 overflow-hidden bg-black/60 backdrop-blur-md rounded-2xl p-4 shadow-inner border border-white/10 flex flex-col justify-end">
      <div className="flex flex-col gap-1.5 justify-end font-mono text-[11px] text-green-400">
        {logs.map((l, i) => (
          <motion.div
            key={`${i}-${l}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="truncate"
          >
            {l}
          </motion.div>
        ))}
        {logs.length < 8 && (
          <motion.div animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="h-4">
            █
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function TodayPage() {
  const router = useRouter();
  const [selectedFocus, setSelectedFocus] = useState<string | null>(() => getWorkoutPrefs()?.focus ?? null);
  const [selectedTime, setSelectedTime] = useState<string | null>(() => getWorkoutPrefs()?.time ?? null);
  const [selectedEnergy, setSelectedEnergy] = useState<string | null>(() => getWorkoutPrefs()?.energy ?? "okay");
  const [selectedEquipment, setSelectedEquipment] = useState(() => getWorkoutPrefs()?.equipment ?? "full");
  const [generationState, setGenerationState] = useState<GenerationState>("idle");
  const [suggestion, setSuggestion] = useState<unknown | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [gymId] = useState(() => getSelectedGymId());
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(() => getTemplates());

  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importText, setImportText] = useState("");
  const [importState, setImportState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [importResult, setImportResult] = useState<BulkImportLogResult | null>(null);
  const [importError, setImportError] = useState("");
  const [showReversePrompt, setShowReversePrompt] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [startingSession, setStartingSession] = useState(false);
  const startingRef = useRef(false);
  const reduceMotion = useReducedMotion();

  // Short Yono loading transition before entering a workout.
  const startSessionWithTransition = async (sessionId: string) => {
    if (startingRef.current) return;
    startingRef.current = true;
    setStartingSession(true);
    const minDelay = 900;
    const startedAt = Date.now();
    await new Promise((r) => setTimeout(r, minDelay));
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, minDelay - elapsed);
    if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
    setStartingSession(false);
    startingRef.current = false;
    router.push(`/workout/${sessionId}`);
  };

  // Persist last-used generation preferences for smart defaults
  useEffect(() => {
    saveWorkoutPrefs({
      focus: selectedFocus,
      time: selectedTime,
      energy: selectedEnergy,
      equipment: selectedEquipment,
    });
  }, [selectedFocus, selectedTime, selectedEnergy, selectedEquipment]);

  // Live queries from IndexedDB
  const activeSession = useLiveQuery(
    () => db.workoutSessions.where("status").equals("active").first(),
    []
  );

  const recentSessions = useLiveQuery(
    () =>
      db.workoutSessions
        .where("status")
        .equals("completed")
        .reverse()
        .sortBy("completedAt")
        .then((s) => s.slice(0, 3)),
    []
  );

  const gym = useLiveQuery(() => db.gyms.get(gymId ?? "ftl"), [gymId]);
  const profile = useLiveQuery(() => db.profiles.get("main-user"));
  const weeklyPlan = useLiveQuery(() => db.weeklyPlans.get("main-weekly-plan"), []);

  // Once per day, if today is a planned training day, remind the user.
  useEffect(() => {
    if (!weeklyPlan || weeklyPlan.trainingDays.length === 0) return;
    if (typeof window === "undefined") return;
    // Only fire if the user already granted notification permission —
    // the permission prompt is user-initiated to avoid surprise prompts.
    if (!("Notification" in window) || window.Notification.permission !== "granted") {
      return;
    }
    const dayIndex = (new Date().getDay() + 6) % 7; // 0 = Monday
    const todayPlan = weeklyPlan.trainingDays.find((d) => d.dayIndex === dayIndex);
    if (!todayPlan) return;
    notifyWorkoutDay(todayPlan.focus);
  }, [weeklyPlan]);

  const nowTs = useState(() => Date.now())[0];

  const daysSinceLastWorkout = recentSessions?.[0]
    ? Math.floor((nowTs - (recentSessions[0].completedAt ?? 0)) / (1000 * 60 * 60 * 24))
    : null;

  const workoutStreak = (() => {
    if (!recentSessions || recentSessions.length === 0) return 0;
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dayStart = checkDate.getTime();
      const dayEnd = dayStart + 86400000;
      const hasSession = recentSessions.some(
        (s) => s.completedAt && s.completedAt >= dayStart && s.completedAt < dayEnd
      );
      if (hasSession) {
        streak++;
      } else if (i === 0) {
        continue;
      } else {
        break;
      }
    }
    return streak;
  })();

  const getYonoGreeting = () => {
    const hour = new Date().getHours();
    const name = profile?.displayName || "Athlete";
    const daysGap = daysSinceLastWorkout;

    if (daysGap === 0) {
      if (hour < 12) return { line: `Morning, ${name}`, sub: "Two-a-day? Let's go." };
      if (hour < 17) return { line: `Hey ${name}`, sub: "Second round today?" };
      return { line: `Still grinding, ${name}?`, sub: "Respect the hustle." };
    }
    if (daysGap === 1) {
      if (hour < 12) return { line: `Morning, ${name}`, sub: "Build on yesterday's work." };
      if (hour < 17) return { line: `Hey ${name}`, sub: "Day 2 energy. Let's go." };
      return { line: `Evening, ${name}`, sub: "Keep the momentum." };
    }
    if (daysGap !== null && daysGap <= 3) {
      if (hour < 12) return { line: `Morning, ${name}`, sub: `${daysGap} days off. Time to move.` };
      return { line: `Hey ${name}`, sub: `Been ${daysGap} days. Ready to fire it up?` };
    }
    if (daysGap !== null) {
      return { line: `Welcome back, ${name}`, sub: `${daysGap} days is long enough. Let's go.` };
    }

    if (hour < 12) return { line: `Morning, ${name}`, sub: "Fresh start. Let's make it count." };
    if (hour < 17) return { line: `Hey ${name}`, sub: "Yono's ready when you are." };
    return { line: `Evening, ${name}`, sub: "Night session energy." };
  };

  const yonoGreeting = getYonoGreeting();

  const handleGenerate = async () => {
    if (!selectedFocus) {
      setErrorMessage("Pick a training focus to get started.");
      return;
    }

    setGenerationState("loading");
    setErrorMessage("");
    setSuggestion(null);

    try {
      // Build context from IndexedDB
      const [sessions, preferences, memories, gymData] = await Promise.all([
        db.workoutSessions
          .where("status")
          .equals("completed")
          .reverse()
          .sortBy("completedAt")
          .then((s) => s.slice(0, 8)),
        db.exercisePreferences.toArray(),
        db.aiMemories.where("active").equals(1).toArray(),
        db.gyms.get(gymId ?? "ftl"),
      ]);

      const recentSessionsContext = await Promise.all(
        sessions.slice(0, 5).map(async (s) => {
          const sessionExercises = await db.sessionExercises
            .where("sessionId")
            .equals(s.id)
            .toArray();
          const exercisesWithSets = await Promise.all(
            sessionExercises.map(async (ex) => {
              const sets = await db.workoutSets
                .where("sessionExerciseId")
                .equals(ex.id)
                .toArray();
              return {
                exerciseId: ex.exerciseId,
                sets: sets.map((set) => ({
                  weightKg: set.weightKg,
                  reps: set.reps,
                  rpe: set.rpe,
                })),
              };
            })
          );
          return {
            name: s.name,
            focus: s.focus,
            completedAt: s.completedAt ?? s.updatedAt,
            exercises: exercisesWithSets,
          };
        })
      );

      const profile = await db.profiles.get("main-user");

      // Real per-exercise history + recovery status, sent to the AI so its
      // suggested weights match what the user can do and it avoids tired muscles.
      const allSets = await db.workoutSets.toArray();
      // eslint-disable-next-line react-hooks/purity -- event handler, safe to read current time
      const muscleRecovery = getMuscleRecoveryRows(allSets, Date.now()).map(
        ({ label, pct, status }) => ({ label, pct, status })
      );
      const relevantExerciseHistory = await Promise.all(
        recentSessionsContext
          .flatMap((s) => s.exercises.map((e) => e.exerciseId))
          .filter((id, i, arr) => arr.indexOf(id) === i)
          .slice(0, 8)
          .map(fetchExerciseHistory)
      );

      const focusMap: Record<string, string[]> = {
        choose: ["full_body"],
        upper_body: ["upper body"],
        lower_body: ["lower body"],
        full_body: ["full body"],
        back: ["back"],
        chest: ["chest"],
        shoulders: ["shoulders"],
        arms: ["arms"],
        back_arms: ["back", "arms"],
        chest_shoulders: ["chest", "shoulders"],
        legs: ["legs"],
        cardio: ["cardio"],
        recovery: ["recovery"],
      };

      const requestBody = {
        profile: {
          goal: profile?.goal,
          experienceLevel: profile?.experienceLevel,
        },
        request: {
          focus: focusMap[selectedFocus] ?? [selectedFocus],
          availableMinutes:
            selectedTime && selectedTime !== "unlimited"
              ? parseInt(selectedTime)
              : undefined,
          energy: selectedEnergy as "low" | "okay" | "strong" | undefined,
          equipmentMode: selectedEquipment,
        },
        gym: {
          id: gymData?.id ?? "ftl",
          name: gymData?.name ?? "FTL — Full Gym",
          availableEquipmentCodes:
            gymData?.equipmentCodes.filter(
              (code) => !gymData.unavailableEquipmentCodes?.includes(code)
            ) ?? [],
        },
        recentSessions: recentSessionsContext,
        relevantExerciseHistory,
        muscleRecovery,
        preferences,
        notes: [],
        memories,
      };

      const response = await fetch("/api/ai/suggest-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(45000),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "unknown");
        throw new Error(`AI error: ${response.status} ${text}`);
      }

      const data = await response.json();
      setSuggestion(data);
      setGenerationState("success");
    } catch (err) {
      const isOffline = !navigator.onLine;
      if (isOffline) {
        // Generate offline fallback
        await generateOfflineFallback();
      } else {
        setGenerationState("error");
        setErrorMessage(
          `Yono can't reach the AI right now (${(err as Error).message}). Try building manually or going offline.`
        );
      }
    }
  };

  const generateOfflineFallback = async () => {
    const gym = await db.gyms.get(gymId ?? "ftl");
    const availableCodes =
      gym?.equipmentCodes.filter(
        (c) => !gym.unavailableEquipmentCodes?.includes(c)
      ) ?? [];

    const focusMap: Record<string, string[]> = {
      choose: ["full body"],
      upper_body: ["upper body"],
      lower_body: ["lower body"],
      back: ["back"],
      chest: ["chest"],
      shoulders: ["shoulders"],
      arms: ["arms"],
      back_arms: ["back", "arms"],
      chest_shoulders: ["chest", "shoulders"],
      legs: ["legs"],
      cardio: ["cardio"],
      recovery: ["recovery"],
    };

    const focus = focusMap[selectedFocus ?? "choose"] ?? ["full body"];
    // Real weights from logged history instead of empty, so fallback suggests
    // weights the user has actually handled.
    const exerciseHistory = await buildExerciseHistoryMap();

    // Skip muscle groups still recovering (< 60%) so we don't hammer tired muscles.
    const allSets = await db.workoutSets.toArray();
    const recoveringLabels = getRecoveringLabels(getMuscleRecoveryRows(allSets, Date.now()));

    const count =
      selectedTime === "20" ? 3 : selectedTime === "60" ? 6 : 4;

    // Deload detection: if the broad-focus day AND most muscles are still
    // recovering, suggest a lighter session instead of heavy working sets.
    const isBroadFocus =
      ["full body", "upper body", "lower body"].includes(focus[0]);
    const shouldDeload = isBroadFocus && recoveringLabels.size >= 3;

    const selectingFocus = shouldDeload ? ["recovery"] : focus;
    const selected = getFallbackExercises(
      selectingFocus,
      availableCodes,
      exercises,
      exerciseHistory,
      shouldDeload ? 3 : count,
      recoveringLabels
    );

    const deloadSuggestion = shouldDeload
      ? selected.map((ex) => {
          // ~65% of last weight, moderate reps — a deload keeps volume low.
          const lastW = exerciseHistory.get(ex.exerciseId)?.lastWeightKg;
          return {
            ...ex,
            targetSets: 3,
            suggestedWeightKg:
              lastW != null ? Math.round(lastW * 0.65 * 4) / 4 : undefined,
            notes: "Deload set — keep it light.",
          };
        })
      : selected;

    const offlineSuggestion = {
      sessionName: shouldDeload
        ? "Deload / Recovery"
        : (ALL_FOCUS.find((f) => f.id === selectedFocus)?.label ?? "Workout"),
      reason: shouldDeload
        ? "Several muscle groups are still recovering. Yono recommended a light deload session (~65% of your usual weights) so you can keep moving without overtraining. Tap Generate again when you're fresh for a full session."
        : "DeepSeek is unavailable. Yono created a simple workout using your exercise catalog.",
      estimatedMinutes: shouldDeload
        ? 20
        : selectedTime
          ? parseInt(selectedTime)
          : 40,
      exercises: shouldDeload ? deloadSuggestion : selected,
      isOffline: true,
    };

    setSuggestion(offlineSuggestion);
    setGenerationState("offline");
  };

  const handleStartWorkout = async () => {
    if (!suggestion || startingRef.current) return;

    const s = suggestion as {
      sessionName: string;
      exercises: Array<{
        exerciseId: string;
        order: number;
        targetSets: number;
        targetRepMin?: number;
        targetRepMax?: number;
        suggestedWeightKg?: number;
        restSeconds: number;
        notes?: string;
      }>;
    };

    const now = Date.now();
    const sessionId = crypto.randomUUID();

    try {
      await db.transaction(
        "rw",
        [db.workoutSessions, db.sessionExercises],
        async () => {
          await db.workoutSessions.add({
            id: sessionId,
            name: s.sessionName,
            gymId: gymId ?? "ftl",
            status: "active",
            source: generationState === "offline" ? "fallback" : "ai",
            focus: [selectedFocus ?? "full_body"],
            energy: selectedEnergy as "low" | "okay" | "strong" | undefined,
            estimatedMinutes:
              selectedTime !== "unlimited" ? parseInt(selectedTime ?? "40") : undefined,
            startedAt: now,
            createdAt: now,
            updatedAt: now,
          });

          for (const ex of s.exercises) {
            await db.sessionExercises.add({
              id: crypto.randomUUID(),
              sessionId,
              exerciseId: ex.exerciseId,
              order: ex.order,
              status: "pending",
              targetSets: ex.targetSets,
              repMin: ex.targetRepMin,
              repMax: ex.targetRepMax,
              suggestedWeightKg: ex.suggestedWeightKg,
              restSeconds: ex.restSeconds,
              notes: ex.notes,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
      );
    } catch (err) {
      console.error("Failed to start workout:", err);
      setErrorMessage("Couldn't start the workout. Please try again.");
      return;
    }

    await startSessionWithTransition(sessionId);
  };

  const handleRepeatWorkout = async (source?: WorkoutSession) => {
    if (!source || startingRef.current) return;

    const now = Date.now();
    const sessionId = crypto.randomUUID();
    const sourceExercises = await db.sessionExercises
      .where("sessionId")
      .equals(source.id)
      .sortBy("order");

    try {
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
            energy: selectedEnergy as "low" | "okay" | "strong" | undefined,
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
    } catch (err) {
      console.error("Failed to repeat workout:", err);
      setErrorMessage("Couldn't start the workout. Please try again.");
      return;
    }

    await startSessionWithTransition(sessionId);
  };

  const handleStartFromTemplate = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const id = e.currentTarget.dataset.templateId;
    const template = templates.find((t) => t.id === id);
    if (!template || startingRef.current) return;

    const now = Date.now();
    const sessionId = crypto.randomUUID();

    try {
      await db.transaction(
        "rw",
        [db.workoutSessions, db.sessionExercises],
        async () => {
          await db.workoutSessions.add({
            id: sessionId,
            name: template.name,
            gymId: gymId ?? "ftl",
            status: "active",
            source: "template",
            focus: template.focus ?? [],
            energy: selectedEnergy as "low" | "okay" | "strong" | undefined,
            startedAt: now,
            createdAt: now,
            updatedAt: now,
          });

          for (const ex of template.exercises) {
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
    } catch (err) {
      console.error("Failed to start template:", err);
      setErrorMessage("Couldn't start the workout. Please try again.");
      return;
    }

    await startSessionWithTransition(sessionId);
  };

  const handleImportLog = async () => {
    if (!importText.trim()) return;
    setImportState("loading");
    setImportError("");
    setImportResult(null);

    try {
      const response = await fetch("/api/ai/bulk-import-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: importText.trim() }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "unknown" }));
        throw new Error(err.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setImportResult(data);
      setImportState("success");
    } catch (err) {
      setImportState("error");
      setImportError((err as Error).message || "Failed to parse log");
    }
  };

  const handleCopyReversePrompt = async () => {
    try {
      await navigator.clipboard.writeText(REVERSE_IMPORT_PROMPT);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch {
      // Clipboard unavailable — ignore
    }
  };

  const handleConfirmImport = async () => {
    if (!importResult || !gymId) return;
    const DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();

    const tsForSession = (() => {
      const cache = new Map<string, number>();
      let lastKnownTs = now;
      let backfill = 0;
      return (date?: string): number => {
        if (date) {
          if (!cache.has(date)) {
            const d = new Date(`${date}T18:00:00`);
            if (!isNaN(d.getTime())) {
              cache.set(date, d.getTime());
              lastKnownTs = d.getTime();
              backfill = 0;
              return d.getTime();
            }
          } else {
            const t = cache.get(date)!;
            lastKnownTs = t;
            return t;
          }
        }
        const ts = lastKnownTs - (backfill + 1) * DAY;
        backfill++;
        return ts;
      };
    })();

    await db.transaction(
      "rw",
      [db.workoutSessions, db.sessionExercises, db.workoutSets],
      async () => {
        for (const session of importResult.sessions) {
          const sessionId = crypto.randomUUID();
          const completedAt = tsForSession(session.date);

          await db.workoutSessions.add({
            id: sessionId,
            name: session.sessionName,
            gymId,
            status: "completed",
            source: "manual",
            focus: [],
            estimatedMinutes: session.exercises.reduce((t, e) => t + e.sets.length * 3, 0),
            startedAt: completedAt - 3600000,
            completedAt,
            createdAt: now,
            updatedAt: now,
            notes: importResult.notes,
          });

          for (const ex of session.exercises) {
            const seId = crypto.randomUUID();
            await db.sessionExercises.add({
              id: seId,
              sessionId,
              exerciseId: ex.exerciseId,
              order: ex.order,
              status: "completed",
              targetSets: ex.sets.length,
              createdAt: now,
              updatedAt: now,
            });

            for (const set of ex.sets) {
              await db.workoutSets.add({
                id: crypto.randomUUID(),
                sessionId,
                sessionExerciseId: seId,
                exerciseId: ex.exerciseId,
                setNumber: set.setNumber,
                setType: "working",
                weightKg: set.weightKg,
                reps: set.reps,
                completedAt,
                updatedAt: now,
              });
            }
          }
        }
      }
    );

    setShowImportDialog(false);
    setImportText("");
    setImportResult(null);
    setImportState("idle");
  };

  const lastWorkout = activeSession ? null : recentSessions?.[0] ?? null;
  const recentRows = activeSession
    ? (recentSessions ?? [])
    : (recentSessions ?? []).slice(1);

  const recentMeta = (session: WorkoutSession) => {
    const daysSince = session.completedAt
      ? Math.floor((nowTs - session.completedAt) / (1000 * 60 * 60 * 24))
      : null;
    const dayText =
      daysSince === 0 ? "Today" : daysSince === 1 ? "Yesterday" : daysSince ? `${daysSince}d ago` : "";
    return [dayText, session.estimatedMinutes ? `~${session.estimatedMinutes}m` : ""]
      .filter(Boolean)
      .join(" · ");
  };

  return (
    <div className="relative max-w-md mx-auto min-h-dvh bg-background overflow-hidden pb-safe-nav">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-5%] left-[-10%] w-[200px] h-[200px] bg-primary/15 rounded-full blur-[60px]" />
        <div className="absolute top-[15%] right-[-5%] w-[180px] h-[180px] bg-secondary/10 rounded-full blur-[50px]" />
      </div>

      {/* Compact header */}
      <header className="relative z-10 flex items-end justify-between gap-3 px-6 pt-7 pb-6">
        <div className="min-w-0">
          <h1 className="text-[30px] font-extrabold tracking-tight text-foreground leading-tight truncate">
            {yonoGreeting.line}
          </h1>
          <p className="text-[15px] font-medium text-muted-foreground mt-1">
            {yonoGreeting.sub}
          </p>
          {workoutStreak >= 2 && (
            <div className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-1 bg-accent/10 rounded-full">
              <FlameIcon className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-bold text-accent">{workoutStreak}-day streak</span>
            </div>
          )}
        </div>

        {/* Yono Mascot */}
        <div className="w-[68px] h-[68px] shrink-0 bg-card ring-1 ring-foreground/10 rounded-2xl flex items-center justify-center">
          <YonoAnimation state="idle" size={54} />
        </div>
      </header>

      {/* Active / last workout card */}
      <AnimatePresence>
        {activeSession ? (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-4 mb-5"
          >
            <div className="bg-card ring-1 ring-accent/30 border border-accent/20 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-accent uppercase tracking-wide">Active workout</p>
                  <p className="font-semibold text-foreground truncate mt-0.5">{activeSession.name}</p>
                </div>
                <Button
                  size="sm"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0"
                  onClick={() => router.push(`/workout/${activeSession.id}`)}
                >
                  <PlayIcon className="w-4 h-4 mr-1" />
                  Resume
                </Button>
              </div>
            </div>
          </motion.div>
        ) : lastWorkout ? (
          <motion.div
            key="last"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-4 mb-5"
          >
            <div className="bg-card ring-1 ring-primary/20 border border-primary/10 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Last workout</p>
                  <p className="font-semibold text-foreground truncate mt-0.5">{lastWorkout.name}</p>
                </div>
                <Button
                  id="btn-repeat-workout"
                  size="sm"
                  onClick={() => handleRepeatWorkout(lastWorkout)}
                  className="shrink-0"
                >
                  <RepeatIcon className="w-4 h-4 mr-1" />
                  Repeat
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Muscle recovery */}
      <MuscleRecoveryPanel />

      {/* Target focus */}
      <section className="px-4 mb-6 relative z-10">
        <SectionHeader title="Target focus" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {FOCUS_OPTIONS.map((opt) => (
            <SelectionCard
              key={opt.id}
              id={`focus-${opt.id}`}
              icon={<opt.icon className="w-4 h-4" />}
              label={opt.label}
              selected={selectedFocus === opt.id}
              onClick={() => setSelectedFocus(selectedFocus === opt.id ? null : opt.id)}
            />
          ))}
        </div>
        <div className="mt-2.5">
          <ChipSelector
            options={FOCUS_SPECIFIC}
            value={selectedFocus ?? ""}
            onChange={setSelectedFocus}
            idPrefix="focus-specific"
          />
        </div>
      </section>

      {/* Duration */}
      <section className="px-4 mb-6 relative z-10">
        <SectionHeader title="Duration" />
        <SegmentedControl
          options={TIME_OPTIONS}
          value={selectedTime}
          onChange={(id) => setSelectedTime(selectedTime === id ? null : id)}
          idPrefix="time"
        />
      </section>

      {/* Energy */}
      <section className="px-4 mb-6 relative z-10">
        <SectionHeader title="Energy" />
        <SegmentedControl
          options={ENERGY_OPTIONS}
          value={selectedEnergy}
          onChange={(id) => setSelectedEnergy(selectedEnergy === id ? null : id)}
          idPrefix="energy"
        />
      </section>

      {/* Equipment */}
      <section className="px-4 mb-6 relative z-10">
        <SectionHeader title="Equipment" />
        <button
          onClick={() => router.push("/gyms")}
          className="w-full flex items-center justify-between gap-3 p-4 bg-card ring-1 ring-foreground/10 rounded-2xl text-left hover:ring-foreground/20 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 shrink-0 rounded-xl bg-muted flex items-center justify-center">
              <DumbbellIcon className="w-4 h-4 text-foreground" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{gym?.name ?? "FTL Full Gym"}</p>
              <p className="text-[11px] text-muted-foreground truncate">Tap to change gym</p>
            </div>
          </div>
          <ChevronDownIcon className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
        <div className="mt-2.5">
          <ChipSelector
            options={EQUIPMENT_OPTIONS}
            value={selectedEquipment}
            onChange={setSelectedEquipment}
            idPrefix="equipment"
          />
        </div>
      </section>

      {/* Error message */}
      {errorMessage && (
        <div className="mx-4 mb-4 flex items-start gap-2 p-3 bg-destructive/10 rounded-xl text-destructive text-sm">
          <AlertCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* CTA */}
      <div className="px-4 mt-1 mb-3 relative z-10 space-y-2.5">
        <Button
          id="btn-generate-workout"
          onClick={handleGenerate}
          disabled={generationState === "loading" || !selectedFocus || !gym}
          className="w-full h-14 rounded-2xl font-bold text-base shadow-lg shadow-primary/20"
        >
          <SparklesIcon className="w-5 h-5 mr-2" />
          Generate workout with Yono
        </Button>
        <Button
          id="btn-manual-workout"
          variant="outline"
          onClick={() => {
            setSuggestion({
              sessionName: "Custom Workout",
              reason: "A manually built workout.",
              estimatedMinutes: 45,
              exercises: [],
            });
            setGenerationState("success");
          }}
          disabled={generationState === "loading" || !gym}
          className="w-full h-12 rounded-2xl font-semibold"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Create manually
        </Button>
        <button
          onClick={() => setShowMoreSheet(true)}
          className="w-full h-10 rounded-2xl text-xs font-medium text-muted-foreground hover:text-foreground border border-dashed border-border transition-colors flex items-center justify-center gap-1.5"
        >
          <MoreHorizontalIcon className="w-4 h-4" />
          More options
        </button>
      </div>

      {/* Recent workouts */}
      {recentRows.length > 0 && (
        <section className="px-4 pb-4 relative z-10">
          <SectionHeader
            title="Recent workouts"
            action="See all"
            onAction={() => router.push("/history")}
          />
          <div className="space-y-2">
            {recentRows.map((session) => (
              <CompactWorkoutRow
                key={session.id}
                name={session.name}
                meta={recentMeta(session)}
                repeatId={`repeat-${session.id}`}
                onRepeat={() => handleRepeatWorkout(session)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Fullscreen AI Loading */}
      <AnimatePresence>
        {generationState === "loading" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl"
          >
            <div className="w-48 h-48 relative mb-6">
              <YonoAnimation state="thinking" />
            </div>
            <h2 className="text-2xl font-extrabold text-foreground animate-pulse mb-2 text-center px-4">
              Building your workout...
            </h2>
            <p className="text-muted-foreground text-center px-8 text-sm max-w-[300px]">
              Yono is designing the best session based on your ability and workout history.
            </p>

            <LoadingLogs sessions={recentSessions} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workout suggestion Modal */}
      <Dialog
        open={!!suggestion && (generationState === "success" || generationState === "offline")}
        onOpenChange={(open) => {
          if (!open) {
            setSuggestion(null);
            setGenerationState("idle");
          }
        }}
      >
        <DialogContent className="max-w-sm p-0 bg-transparent border-none shadow-none">
          {suggestion ? (
            <WorkoutSuggestionCard
              suggestion={suggestion as any}
              onStart={handleStartWorkout}
              onRegenerate={handleGenerate}
              availableEquipmentCodes={
                gym?.equipmentCodes.filter(
                  (c) => !gym.unavailableEquipmentCodes?.includes(c)
                ) ?? []
              }
              onReplaceExercise={async (oldId, newId) => {
                let suggestedWeightKg: number | undefined;
                const lastSet = await db.workoutSets
                  .where("[exerciseId+completedAt]")
                  .between(
                    [newId, Dexie.minKey],
                    [newId, Dexie.maxKey]
                  )
                  .reverse()
                  .first();
                if (lastSet && lastSet.weightKg != null) {
                  suggestedWeightKg = lastSet.weightKg;
                }
                setSuggestion((prev: any) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    exercises: prev.exercises.map((e: any) =>
                      e.exerciseId === oldId
                        ? { ...e, exerciseId: newId, suggestedWeightKg }
                        : e
                    )
                  };
                });
              }}
              onAddExercise={(newId) => {
                setSuggestion((prev: any) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    exercises: [
                      ...prev.exercises,
                      {
                        exerciseId: newId,
                        order: prev.exercises.length,
                        targetSets: 3,
                        targetRepMin: 8,
                        targetRepMax: 12,
                        restSeconds: 90,
                      }
                    ]
                  };
                });
              }}
              onRemoveExercise={(id) => {
                setSuggestion((prev: any) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    exercises: prev.exercises.filter((e: any) => e.exerciseId !== id)
                  };
                });
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* More options sheet */}
      <Sheet open={showMoreSheet} onOpenChange={setShowMoreSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-6">
          <SheetHeader className="pb-2">
            <SheetTitle>More options</SheetTitle>
            <SheetDescription>Templates and tools for your session.</SheetDescription>
          </SheetHeader>

          <div className="px-4 space-y-4">
            <button
              onClick={() => {
                setShowMoreSheet(false);
                setShowImportDialog(true);
                setImportState("idle");
                setImportText("");
                setImportResult(null);
                setImportError("");
              }}
              className="w-full flex items-center gap-3 p-3.5 bg-muted/40 rounded-2xl text-left hover:bg-muted/60 transition-colors"
            >
              <span className="w-9 h-9 shrink-0 rounded-xl bg-card ring-1 ring-foreground/10 flex items-center justify-center">
                <FileTextIcon className="w-4 h-4 text-foreground" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Import from AI chat log</p>
                <p className="text-[11px] text-muted-foreground">Paste a log from ChatGPT, Claude, or any AI.</p>
              </div>
            </button>

            {templates.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <BookmarkIcon className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Templates</h3>
                </div>
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between gap-3 p-3 bg-muted/40 rounded-2xl"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{template.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {template.exercises.length} exercises
                          {template.focus && template.focus.length > 0 ? ` · ${template.focus.join(", ")}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          data-template-id={template.id}
                          onClick={handleStartFromTemplate}
                        >
                          <PlayIcon className="w-3.5 h-3.5 mr-1" />
                          Start
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            deleteTemplate(template.id);
                            setTemplates(getTemplates());
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Import AI Log Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(open) => { setShowImportDialog(open); if (!open) { setImportState("idle"); } }}>
        <DialogContent className="max-w-sm p-5">
          {importState === "idle" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground mb-1">Import AI Workout Log</h2>
                <p className="text-sm text-muted-foreground">
                  Paste your gym log from ChatGPT, Claude, or any AI you use to track workouts.
                </p>
              </div>

              {/* Reverse prompt — makes your AI output a Yono-ready format */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <button
                  id="btn-toggle-reverse-prompt"
                  onClick={() => {
                    setShowReversePrompt((v) => !v);
                    setPromptCopied(false);
                  }}
                  className="w-full flex items-center justify-between text-sm font-semibold text-primary"
                >
                  <span className="flex items-center gap-1.5">
                    <InfoIcon className="w-4 h-4" />
                    Prompt template for your AI
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {showReversePrompt ? "Hide" : "Show"}
                  </span>
                </button>

                <AnimatePresence>
                  {showReversePrompt && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="text-xs text-muted-foreground mt-3 mb-2 leading-relaxed">
                        Paste this into ChatGPT/Claude and ask it to log your workout. The
                        result will import into Yono almost perfectly.
                      </p>
                      <pre className="whitespace-pre-wrap break-words text-[11px] leading-relaxed bg-background border border-border rounded-lg p-3 text-foreground/90 max-h-44 overflow-y-auto">
                        {REVERSE_IMPORT_PROMPT}
                      </pre>
                      <Button
                        id="btn-copy-reverse-prompt"
                        onClick={handleCopyReversePrompt}
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full h-9 rounded-lg text-xs font-semibold"
                      >
                        {promptCopied ? (
                          <>
                            <CheckIcon className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <CopyIcon className="w-3.5 h-3.5 mr-1.5" />
                            Copy prompt
                          </>
                        )}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`e.g.\nMonday Back Day:\n- Lat pulldown 30kg 3x10\n- Seated cable row 25kg 3x12\n- Dumbbell curl 10kg 3x12`}
                className="w-full h-40 rounded-xl border border-border bg-muted/50 p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Button
                onClick={handleImportLog}
                disabled={!importText.trim()}
                className="w-full h-11 rounded-xl font-semibold"
              >
                <FileTextIcon className="w-4 h-4 mr-2" />
                Parse with Yono AI
              </Button>
            </div>
          )}

          {importState === "loading" && (
            <div className="flex flex-col items-center py-8">
              <YonoAnimation state="thinking" size={80} />
              <p className="text-sm text-muted-foreground mt-4">Yono is reading your workout log...</p>
            </div>
          )}

          {importState === "error" && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-xl text-destructive text-sm">
                <AlertCircleIcon className="w-4 h-4 mt-0.5 shrink-0" />
                {importError || "Something went wrong."}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setImportState("idle")}>
                  Back
                </Button>
                <Button className="flex-1" onClick={handleImportLog}>
                  Retry
                </Button>
              </div>
            </div>
          )}

          {importState === "success" && importResult && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">
                  {importResult.sessions.length} session
                  {importResult.sessions.length > 1 ? "s" : ""} found
                </h2>
                {importResult.source && (
                  <p className="text-xs text-muted-foreground mt-0.5">From: {importResult.source}</p>
                )}
              </div>

              {importResult.confidence < 0.7 && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2">
                  <AlertCircleIcon className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Low parsing confidence. Please review the sessions below before saving.
                  </p>
                </div>
              )}

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {importResult.sessions.map((session, si) => {
                  const sessionDate = session.date
                    ? new Date(`${session.date}T00:00:00`).toLocaleDateString(undefined, {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "Date unknown";
                  const lowConf = (session.confidence ?? importResult.confidence) < 0.7;
                  return (
                    <div key={si} className="p-3 bg-muted/50 rounded-xl">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-foreground text-sm">
                          {session.sessionName}
                        </p>
                        <span className="text-[11px] text-muted-foreground shrink-0">{sessionDate}</span>
                      </div>
                      {lowConf && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                          Low confidence — review below
                        </p>
                      )}
                      <div className="mt-1.5 space-y-1">
                        {session.exercises.map((ex) => {
                          const def = exercises.find((e) => e.id === ex.exerciseId);
                          return (
                            <p key={ex.exerciseId + ex.order} className="text-xs text-muted-foreground">
                              {def?.name ?? ex.exerciseId}
                              <span className="text-muted-foreground/70">
                                {" "}
                                —{" "}
                                {ex.sets
                                  .map((s) =>
                                    `${s.weightKg ? s.weightKg + "kg " : ""}${s.reps ? s.reps + " reps" : ""}`
                                  )
                                  .join(" | ")}
                              </span>
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setImportState("idle")}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleConfirmImport}>
                  Save {importResult.sessions.length} session
                  {importResult.sessions.length > 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Start workout transition overlay */}
      <AnimatePresence>
        {startingSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
            role="status"
            aria-live="assertive"
          >
            <YonoAnimation
              state="encouraging"
              size={140}
              reducedMotion={!!reduceMotion}
            />
            <p className="mt-6 text-center font-display text-xl font-bold text-foreground px-8 leading-snug">
              janji harus semangat ya maniez
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Yono is setting up your session...
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WorkoutSuggestionCard({
  suggestion,
  onStart,
  onRegenerate,
  onReplaceExercise,
  onAddExercise,
  onRemoveExercise,
  availableEquipmentCodes,
}: {
  suggestion: {
    sessionName: string;
    reason: string;
    estimatedMinutes: number;
    exercises: Array<{
      exerciseId: string;
      order: number;
      targetSets: number;
      targetRepMin?: number;
      targetRepMax?: number;
      suggestedWeightKg?: number;
      restSeconds: number;
    }>;
    isOffline?: boolean;
  };
  onStart: () => void;
  onRegenerate: () => void;
  onReplaceExercise: (oldId: string, newId: string) => void;
  onAddExercise: (newId: string) => void;
  onRemoveExercise: (id: string) => void;
  availableEquipmentCodes: string[];
}) {
  const [detailsExId, setDetailsExId] = useState<string | null>(null);
  const [changeExId, setChangeExId] = useState<string | null>(null);
  const [showAddSelector, setShowAddSelector] = useState(false);

  const profile = useLiveQuery(() => db.profiles.get("main-user"), []);
  const weightUnit: WeightUnit = profile?.preferredWeightUnit ?? "kg";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="mx-4 mb-6"
    >
      <Card className="p-5 border-2 border-primary/20 bg-card shadow-md">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            {suggestion.isOffline && (
              <Badge variant="outline" className="mb-2 text-xs">
                Offline suggestion
              </Badge>
            )}
            <h2 className="text-xl font-display font-bold text-foreground">
              {suggestion.sessionName}
            </h2>
            <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
              {suggestion.reason}
            </p>
          </div>
          <Badge variant="secondary" className="ml-2 shrink-0">
            ~{suggestion.estimatedMinutes}m
          </Badge>
        </div>

        {/* Exercise list */}
        <div className="space-y-2 mb-4">
          {suggestion.exercises.map((ex, idx) => {
            const exerciseDef = exercises.find((e) => e.id === ex.exerciseId);
            return (
              <div
                key={ex.exerciseId}
                onClick={() => setChangeExId(ex.exerciseId)}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl cursor-pointer hover:bg-muted/80 transition-colors"
              >
                <span className="text-sm font-bold text-muted-foreground w-5">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailsExId(ex.exerciseId);
                    }}
                  >
                    <p className="font-medium text-foreground text-sm truncate group-hover:underline">
                      {exerciseDef?.name ?? ex.exerciseId}
                    </p>
                    <InfoIcon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ex.targetSets} sets
                    {ex.targetRepMin && ex.targetRepMax
                      ? ` × ${ex.targetRepMin}–${ex.targetRepMax}`
                      : ex.targetRepMin
                      ? ` × ${ex.targetRepMin}+`
                      : ""}
                    {ex.suggestedWeightKg
                      ? ` · ${Math.round(kgToDisplay(ex.suggestedWeightKg, weightUnit) * 100) / 100} ${weightUnit}`
                      : ""}
                    {" · "}{ex.restSeconds}s rest
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setChangeExId(ex.exerciseId);
                  }}
                  className="p-2 text-muted-foreground hover:text-primary transition-colors"
                  aria-label={`Change ${exerciseDef?.name ?? ex.exerciseId}`}
                >
                  <RefreshCwIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveExercise(ex.exerciseId);
                  }}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors ml-2"
                  aria-label={`Remove ${exerciseDef?.name ?? ex.exerciseId}`}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          <Button
            variant="outline"
            className="w-full border-dashed mt-2 rounded-xl"
            onClick={() => setShowAddSelector(true)}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Exercise
          </Button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            id="btn-start-workout"
            onClick={onStart}
            className="flex-1 h-12 font-semibold rounded-xl"
          >
            <PlayIcon className="w-4 h-4 mr-1.5" />
            Start workout
          </Button>
          <Button
            id="btn-regenerate-workout"
            variant="outline"
            onClick={onRegenerate}
            className="h-12 px-4 rounded-xl"
          >
            <RefreshCwIcon className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      <ExerciseDetailsDialog
        exerciseId={detailsExId}
        onOpenChange={(open) => !open && setDetailsExId(null)}
        onReplace={(newId) => {
          if (detailsExId) onReplaceExercise(detailsExId, newId);
          setDetailsExId(null);
        }}
      />

      <ChangeExerciseSheet
        open={!!changeExId}
        onOpenChange={(open) => !open && setChangeExId(null)}
        currentExerciseId={changeExId}
        usedExerciseIds={suggestion.exercises.map((e) => e.exerciseId)}
        availableEquipmentCodes={availableEquipmentCodes}
        onSelect={(newId) => {
          if (changeExId) onReplaceExercise(changeExId, newId);
          setChangeExId(null);
        }}
      />

      <ExerciseSelectorDialog
        open={showAddSelector}
        onOpenChange={setShowAddSelector}
        onSelect={(newId) => {
          onAddExercise(newId);
          setShowAddSelector(false);
        }}
      />
    </motion.div>
  );
}
