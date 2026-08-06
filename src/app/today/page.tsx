"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ZapIcon, ClockIcon, FlameIcon, WrenchIcon, RefreshCwIcon, PlayIcon, AlertCircleIcon, Settings2Icon, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { YonoAnimation } from "@/components/yono/YonoAnimation";
import { ExerciseDetailsDialog } from "@/components/workout/ExerciseDetailsDialog";
import { getCopy } from "@/data/yono-copy";
import db from "@/db/database";
import { useLiveQuery } from "dexie-react-hooks";
import { getSelectedGymId, setSelectedGymId } from "@/lib/storage";
import { exercises } from "@/data/exercises.compact";
import { getFallbackExercises } from "@/lib/progression";
import type { WorkoutSession } from "@/types";

const FOCUS_OPTIONS = [
  { id: "choose", label: "Choose for me", emoji: "🎲" },
  { id: "upper_body", label: "Upper body", emoji: "💪" },
  { id: "lower_body", label: "Lower body", emoji: "🦵" },
  { id: "full_body", label: "Full body", emoji: "🏋️" },
  { id: "back", label: "Back", emoji: "🔙" },
  { id: "chest", label: "Chest", emoji: "🫁" },
  { id: "shoulders", label: "Shoulders", emoji: "🔝" },
  { id: "arms", label: "Arms", emoji: "💪" },
  { id: "back_arms", label: "Back + Arms", emoji: "🎯" },
  { id: "chest_shoulders", label: "Chest + Shoulders", emoji: "⬆️" },
  { id: "legs", label: "Legs", emoji: "🦿" },
  { id: "cardio", label: "Cardio", emoji: "🏃" },
  { id: "recovery", label: "Recovery", emoji: "🧘" },
];

const TIME_OPTIONS = [
  { id: "20", label: "20 min" },
  { id: "30", label: "30 min" },
  { id: "40", label: "40 min" },
  { id: "60", label: "60 min" },
  { id: "unlimited", label: "No limit" },
];

const ENERGY_OPTIONS = [
  { id: "low", label: "Low", emoji: "😴" },
  { id: "okay", label: "Okay", emoji: "😊" },
  { id: "strong", label: "Strong", emoji: "⚡" },
];

const EQUIPMENT_OPTIONS = [
  { id: "full", label: "FTL Full Gym" },
  { id: "machine", label: "Machine only" },
  { id: "cable", label: "Cable only" },
  { id: "dumbbell", label: "Dumbbell only" },
  { id: "barbell", label: "Barbell only" },
  { id: "cardio", label: "Cardio only" },
];

type GenerationState = "idle" | "loading" | "success" | "error" | "offline";

export default function TodayPage() {
  const router = useRouter();
  const [selectedFocus, setSelectedFocus] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedEnergy, setSelectedEnergy] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState("full");
  const [generationState, setGenerationState] = useState<GenerationState>("idle");
  const [suggestion, setSuggestion] = useState<unknown | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [greetingCopy] = useState(() => getCopy("greeting"));
  const [gymId] = useState(() => getSelectedGymId());

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

  const daysSinceLastWorkout = recentSessions?.[0]
    ? Math.floor((Date.now() - (recentSessions[0].completedAt ?? 0)) / (1000 * 60 * 60 * 24))
    : null;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

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
        relevantExerciseHistory: [],
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
        throw new Error(`AI error: ${response.status}`);
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
          "Yono can't reach the AI right now. You can use an offline workout suggestion."
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
      arms: ["arms"],
      back_arms: ["back", "arms"],
      legs: ["legs"],
      cardio: ["cardio"],
    };

    const focus = focusMap[selectedFocus ?? "choose"] ?? ["full body"];
    const exerciseHistory = new Map<string, { lastWeightKg?: number }>();

    const count =
      selectedTime === "20" ? 3 : selectedTime === "60" ? 6 : 4;

    const selected = getFallbackExercises(
      focus,
      availableCodes,
      exercises,
      exerciseHistory,
      count
    );

    const offlineSuggestion = {
      sessionName: FOCUS_OPTIONS.find((f) => f.id === selectedFocus)?.label ?? "Workout",
      reason:
        "DeepSeek is unavailable. Yono created a simple workout using your exercise catalog.",
      estimatedMinutes: selectedTime ? parseInt(selectedTime) : 40,
      exercises: selected,
      isOffline: true,
    };

    setSuggestion(offlineSuggestion);
    setGenerationState("offline");
  };

  const handleStartWorkout = async () => {
    if (!suggestion) return;

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

    router.push(`/workout/${sessionId}`);
  };

  return (
    <div className="min-h-screen yono-gradient content-with-nav">
      {/* Header */}
      <div className="px-4 pt-12 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <div>
            <p className="text-muted-foreground text-sm font-medium">{getGreeting()}</p>
            <h1 className="text-2xl font-display font-bold text-foreground mt-0.5">
              {greetingCopy}
            </h1>
          </div>
          <div className="flex flex-col items-center">
            <YonoAnimation
              state="greeting"
              size={80}
              className="drop-shadow-sm"
            />
          </div>
        </motion.div>

        {/* Status row */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {gym && (
            <Badge variant="secondary" className="text-xs">
              🏋️ {gym.name}
            </Badge>
          )}
          {daysSinceLastWorkout !== null && (
            <Badge variant="outline" className="text-xs">
              {daysSinceLastWorkout === 0
                ? "Trained today"
                : daysSinceLastWorkout === 1
                ? "Last trained yesterday"
                : `Last trained ${daysSinceLastWorkout}d ago`}
            </Badge>
          )}
        </div>
      </div>

      {/* Resume active workout banner */}
      <AnimatePresence>
        {activeSession && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-4 mb-4"
          >
            <Card className="border-2 border-accent bg-accent/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-accent uppercase tracking-wide">Active workout</p>
                  <p className="font-semibold text-foreground mt-0.5">{activeSession.name}</p>
                </div>
                <Button
                  size="sm"
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={() => router.push(`/workout/${activeSession.id}`)}
                >
                  <PlayIcon className="w-4 h-4 mr-1" />
                  Resume
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Training focus selector */}
      <div className="px-4 mb-6">
        <h2 className="text-base font-semibold text-foreground mb-3">What are we training today?</h2>
        <div className="flex flex-wrap gap-2">
          {FOCUS_OPTIONS.map((opt) => (
            <motion.button
              key={opt.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedFocus(opt.id === selectedFocus ? null : opt.id)}
              className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                selectedFocus === opt.id
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-foreground border-border hover:border-primary/50"
              }`}
              id={`focus-${opt.id}`}
            >
              <span className="mr-1">{opt.emoji}</span>
              {opt.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Available time */}
      <div className="px-4 mb-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
          <ClockIcon className="w-3.5 h-3.5" /> Available time
        </h3>
        <div className="flex gap-2 flex-wrap">
          {TIME_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              id={`time-${opt.id}`}
              onClick={() => setSelectedTime(opt.id === selectedTime ? null : opt.id)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                selectedTime === opt.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:border-primary/40"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Energy level */}
      <div className="px-4 mb-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
          <FlameIcon className="w-3.5 h-3.5" /> Energy level
        </h3>
        <div className="flex gap-2">
          {ENERGY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              id={`energy-${opt.id}`}
              onClick={() => setSelectedEnergy(opt.id === selectedEnergy ? null : opt.id)}
              className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                selectedEnergy === opt.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:border-primary/40"
              }`}
            >
              {opt.emoji} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment mode */}
      <div className="px-4 mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
          <WrenchIcon className="w-3.5 h-3.5" /> Equipment mode
        </h3>
        <div className="flex gap-2 flex-wrap">
          {EQUIPMENT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              id={`equipment-${opt.id}`}
              onClick={() => setSelectedEquipment(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                selectedEquipment === opt.id
                  ? "bg-secondary text-secondary-foreground border-secondary"
                  : "bg-card text-foreground border-border hover:border-secondary/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="mx-4 mb-4 flex items-start gap-2 p-3 bg-destructive/10 rounded-xl text-destructive text-sm">
          <AlertCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Generate button */}
      <div className="px-4 mb-6">
        <Button
          id="btn-generate-workout"
          onClick={handleGenerate}
          disabled={generationState === "loading"}
          className="w-full h-14 text-base font-semibold rounded-2xl shadow-md"
          size="lg"
        >
          {generationState === "loading" ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 mr-2"
              >
                <RefreshCwIcon className="w-5 h-5" />
              </motion.div>
              Building your workout...
            </>
          ) : (
            <>
              <ZapIcon className="w-5 h-5 mr-2" />
              Generate workout
            </>
          )}
        </Button>
      </div>

      {/* Workout suggestion */}
      <AnimatePresence>
      {suggestion && (generationState === "success" || generationState === "offline") ? (
          <WorkoutSuggestionCard
            suggestion={suggestion as {
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
                notes?: string;
              }>;
              isOffline?: boolean;
            }}
            onStart={handleStartWorkout}
            onRegenerate={handleGenerate}
            onReplaceExercise={(oldId, newId) => {
              setSuggestion((prev: any) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  exercises: prev.exercises.map((e: any) => 
                    e.exerciseId === oldId ? { ...e, exerciseId: newId } : e
                  )
                };
              });
            }}
          />
        ) : null}
      </AnimatePresence>

      {/* Recent workouts */}
      {recentSessions && recentSessions.length > 0 && (
        <div className="px-4 pb-4">
          <h2 className="text-base font-semibold text-foreground mb-3">Recent workouts</h2>
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <RecentSessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WorkoutSuggestionCard({
  suggestion,
  onStart,
  onRegenerate,
  onReplaceExercise,
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
}) {
  const [detailsExId, setDetailsExId] = useState<string | null>(null);

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
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl"
              >
                <span className="text-sm font-bold text-muted-foreground w-5">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div 
                    className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors group"
                    onClick={() => setDetailsExId(ex.exerciseId)}
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
                    {ex.suggestedWeightKg ? ` · ${ex.suggestedWeightKg} kg` : ""}
                    {" · "}{ex.restSeconds}s rest
                  </p>
                </div>
              </div>
            );
          })}
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
    </motion.div>
  );
}

function RecentSessionCard({ session }: { session: WorkoutSession }) {
  const daysSince = session.completedAt
    ? Math.floor((Date.now() - session.completedAt) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer">
      <div>
        <p className="font-medium text-foreground text-sm">{session.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {daysSince === 0
            ? "Today"
            : daysSince === 1
            ? "Yesterday"
            : `${daysSince}d ago`}
          {session.estimatedMinutes ? ` · ~${session.estimatedMinutes}m` : ""}
        </p>
      </div>
      <Badge variant="outline" className="text-xs">
        {session.focus?.join(", ") ?? ""}
      </Badge>
    </Card>
  );
}
