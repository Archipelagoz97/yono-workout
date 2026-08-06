"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  SkipForwardIcon,
  PlusIcon,
  MinusIcon,
  TimerIcon,
  XIcon,
  FlagIcon,
  InfoIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { YonoAnimation, type YonoState, type YonoAnimationFamily } from "@/components/yono/YonoAnimation";
import { getRandomCopy } from "@/data/yono-copy";
import db from "@/db/database";
import { useLiveQuery } from "dexie-react-hooks";
import { exercises as exerciseCatalog } from "@/data/exercises.compact";
import { saveActiveWorkoutState, getActiveWorkoutState, clearActiveWorkoutState } from "@/lib/storage";
import { getProgressionAdvice, estimateOneRepMax } from "@/lib/progression";
import { ExerciseDetailsDialog } from "@/components/workout/ExerciseDetailsDialog";

const exerciseMap = new Map(exerciseCatalog.map((e) => [e.id, e]));

const REST_DEFAULTS: Record<string, number> = {
  working: 90,
  warmup: 60,
};

export default function WorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  // State
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setNumber, setSetNumber] = useState(1);
  const [weightKg, setWeightKg] = useState<number>(0);
  const [reps, setReps] = useState<number>(10);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCopy, setSavedCopy] = useState<string | null>(null);
  const [yonoState, setYonoState] = useState<YonoState>("idle");
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [detailsExId, setDetailsExId] = useState<string | null>(null);

  // Rest timer
  const [restActive, setRestActive] = useState(false);
  const [restRemaining, setRestRemaining] = useState(0);
  const [restTotal, setRestTotal] = useState(90);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Live data
  const session = useLiveQuery(() => db.workoutSessions.get(sessionId), [sessionId]);
  const sessionExercises = useLiveQuery(
    () =>
      db.sessionExercises
        .where("sessionId")
        .equals(sessionId)
        .sortBy("order"),
    [sessionId]
  );

  const currentSessionExercise = sessionExercises?.[exerciseIndex];
  const exerciseDef = currentSessionExercise
    ? exerciseMap.get(currentSessionExercise.exerciseId)
    : undefined;

  const completedSets = useLiveQuery(
    () =>
      currentSessionExercise
        ? db.workoutSets
            .where("sessionExerciseId")
            .equals(currentSessionExercise.id)
            .toArray()
        : [],
    [currentSessionExercise?.id]
  );

  // Restore state from localStorage
  useEffect(() => {
    const saved = getActiveWorkoutState();
    if (saved && saved.sessionId === sessionId) {
      setExerciseIndex(saved.currentExerciseIndex);
      setSetNumber(saved.currentSetNumber);

      // Restore rest timer
      if (saved.restTimerTargetAt && !saved.restTimerPaused) {
        const remaining = Math.max(0, Math.ceil((saved.restTimerTargetAt - Date.now()) / 1000));
        if (remaining > 0) {
          setRestRemaining(remaining);
          setRestTotal(remaining);
          setRestActive(true);
        }
      }
    }
  }, [sessionId]);

  // Save state to localStorage
  useEffect(() => {
    if (!session) return;
    saveActiveWorkoutState({
      sessionId,
      currentExerciseIndex: exerciseIndex,
      currentSetNumber: setNumber,
      restTimerTargetAt: restActive ? Date.now() + restRemaining * 1000 : undefined,
      restTimerPaused: !restActive,
    });
  }, [sessionId, exerciseIndex, setNumber, restActive, restRemaining, session]);

  // Initialize weight from suggestion or history
  useEffect(() => {
    if (!currentSessionExercise) return;
    const suggested = currentSessionExercise.suggestedWeightKg;
    if (suggested) {
      setWeightKg(suggested);
    } else {
      setWeightKg(0);
    }
    const targetRepMax = currentSessionExercise.repMax ?? 12;
    setReps(targetRepMax);
  }, [currentSessionExercise?.id]);

  // Pre-fill from last set
  useEffect(() => {
    if (!completedSets || completedSets.length === 0) return;
    const lastSet = completedSets[completedSets.length - 1];
    if (lastSet.weightKg) setWeightKg(lastSet.weightKg);
    if (lastSet.reps) setReps(lastSet.reps);
  }, [completedSets?.length]);

  // Rest timer countdown
  useEffect(() => {
    if (!restActive) {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
      return;
    }

    restTimerRef.current = setInterval(() => {
      setRestRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(restTimerRef.current!);
          setRestActive(false);
          setYonoState("performing");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [restActive]);

  // Progress
  const totalExercises = sessionExercises?.length ?? 1;
  const progressPct = ((exerciseIndex) / totalExercises) * 100;

  // Get exercise history
  const exerciseHistory = useLiveQuery(
    () =>
      currentSessionExercise
        ? db.workoutSets
            .where("exerciseId")
            .equals(currentSessionExercise.exerciseId)
            .filter((s) => s.sessionId !== sessionId && s.setType !== "warmup")
            .reverse()
            .limit(10)
            .toArray()
        : [],
    [currentSessionExercise?.exerciseId, sessionId]
  );

  const lastSessionSets = exerciseHistory?.slice(0, 3) ?? [];

  const progressionAdvice = currentSessionExercise && lastSessionSets.length > 0
    ? getProgressionAdvice(
        lastSessionSets
          .filter((s) => s.weightKg && s.reps)
          .map((s) => ({ weightKg: s.weightKg!, reps: s.reps! })),
        currentSessionExercise.repMin ?? 8,
        currentSessionExercise.repMax ?? 12,
        weightKg
      )
    : null;

  const handleCompleteSet = useCallback(async () => {
    if (isSaving || !currentSessionExercise) return;

    setIsSaving(true);
    try {
      const now = Date.now();
      await db.workoutSets.add({
        id: crypto.randomUUID(),
        sessionId,
        sessionExerciseId: currentSessionExercise.id,
        exerciseId: currentSessionExercise.exerciseId,
        setNumber,
        setType: "working",
        weightKg: weightKg > 0 ? weightKg : undefined,
        reps: reps > 0 ? reps : undefined,
        completedAt: now,
        updatedAt: now,
      });

      const copy = getRandomCopy("set_complete");
      setSavedCopy(copy ?? null);
      setYonoState("set_complete");

      // Start rest timer
      const restDuration = currentSessionExercise.restSeconds ?? REST_DEFAULTS.working;
      setRestTotal(restDuration);
      setRestRemaining(restDuration);
      setRestActive(true);

      // Advance set number
      const targetSets = currentSessionExercise.targetSets ?? 3;
      if (setNumber >= targetSets) {
        // Move to next exercise after a moment
        setTimeout(() => {
          if (exerciseIndex < totalExercises - 1) {
            setExerciseIndex((prev) => prev + 1);
            setSetNumber(1);
          }
          setYonoState("resting");
          setSavedCopy(null);
        }, 1500);
      } else {
        setSetNumber((prev) => prev + 1);
        setTimeout(() => {
          setYonoState("resting");
          setSavedCopy(null);
        }, 1500);
      }
    } catch (err) {
      console.error("Failed to save set:", err);
      setSavedCopy("The set could not be saved. Your input is still visible — try again.");
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, currentSessionExercise, sessionId, setNumber, weightKg, reps, exerciseIndex, totalExercises]);

  const handleFinishWorkout = async () => {
    setIsFinishing(true);
    try {
      const now = Date.now();
      await db.workoutSessions.update(sessionId, {
        status: "completed",
        completedAt: now,
        updatedAt: now,
      });
      clearActiveWorkoutState();
      setShowFinishDialog(false);
      setShowCompleteDialog(true);
    } finally {
      setIsFinishing(false);
    }
  };

  if (!session || !sessionExercises) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <YonoAnimation state="thinking" size={100} />
          <p className="text-muted-foreground mt-3">Loading workout...</p>
        </div>
      </div>
    );
  }

  if (sessionExercises.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground">No exercises in this workout.</p>
          <Button className="mt-4" onClick={() => router.back()}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  const animFamily = (exerciseDef?.animationFamily as YonoAnimationFamily) ?? "generic_machine";

  return (
    <div className="min-h-screen bg-background flex flex-col content-with-nav">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-xs text-muted-foreground font-medium">
            Exercise {exerciseIndex + 1} of {totalExercises}
          </p>
          <p className="text-sm font-semibold text-foreground">{session.name}</p>
        </div>
        <button
          onClick={() => setShowFinishDialog(true)}
          className="p-2 -mr-2 text-muted-foreground hover:text-foreground"
          id="btn-finish-workout"
        >
          <FlagIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-4">
        <Progress value={progressPct} className="h-1.5 rounded-full" />
      </div>

      {/* Yono */}
      <div className="flex justify-center my-2">
        <YonoAnimation
          state={restActive ? "resting" : yonoState}
          animationFamily={animFamily}
          exerciseId={currentSessionExercise?.exerciseId}
          size={110}
        />
      </div>

      {/* Feedback copy */}
      <AnimatePresence>
        {savedCopy && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center text-sm text-muted-foreground px-4 mb-2"
          >
            {savedCopy}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Main exercise card */}
      <div className="flex-1 px-4">
        <Card className="p-5 mb-4 shadow-sm">
          {/* Exercise name */}
          <div className="mb-4">
            <div 
              className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors group mb-1"
              onClick={() => {
                if (currentSessionExercise) setDetailsExId(currentSessionExercise.exerciseId);
              }}
            >
              <h2 className="text-xl font-display font-bold text-foreground group-hover:underline">
                {exerciseDef?.name ?? currentSessionExercise?.exerciseId}
              </h2>
              <InfoIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs">
                Set {setNumber} of {currentSessionExercise?.targetSets ?? 3}
              </Badge>
              {currentSessionExercise?.repMin && currentSessionExercise?.repMax && (
                <Badge variant="secondary" className="text-xs">
                  Target {currentSessionExercise.repMin}–{currentSessionExercise.repMax} reps
                </Badge>
              )}
            </div>
          </div>

          {/* Rest timer */}
          <AnimatePresence>
            {restActive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
              >
                <div className="flex items-center justify-between p-3 bg-accent/10 rounded-xl">
                  <div className="flex items-center gap-2">
                    <TimerIcon className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium text-accent">Rest</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setRestRemaining((r) => Math.max(0, r - 15))}
                      className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                    >
                      -15s
                    </button>
                    <span className="numeric-display text-2xl text-accent">
                      {Math.floor(restRemaining / 60)}:{(restRemaining % 60).toString().padStart(2, "0")}
                    </span>
                    <button
                      onClick={() => setRestRemaining((r) => r + 30)}
                      className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                    >
                      +30s
                    </button>
                  </div>
                  <button
                    onClick={() => { setRestActive(false); setRestRemaining(0); }}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                  >
                    Skip
                  </button>
                </div>
                <div className="relative h-1 mt-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-accent rounded-full"
                    animate={{
                      width: `${restTotal > 0 ? ((restTotal - restRemaining) / restTotal) * 100 : 0}%`,
                    }}
                    transition={{ duration: 1, ease: "linear" }}
                  />
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-accent/30 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: restTotal, ease: "linear" }}
                    key={`ghost-${restTotal}`}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Previous performance */}
          {lastSessionSets.length > 0 && (
            <div className="mb-4 p-3 bg-muted/50 rounded-xl">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Last time</p>
              <div className="flex flex-wrap gap-1.5">
                {lastSessionSets.slice(0, 3).map((s, i) => (
                  <span
                    key={i}
                    className="text-xs bg-background border border-border px-2 py-1 rounded-lg font-mono"
                  >
                    {s.weightKg ?? "BW"}{s.weightKg ? " kg" : ""} × {s.reps ?? "?"}
                  </span>
                ))}
              </div>
              {progressionAdvice && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  {progressionAdvice.message}
                </p>
              )}
            </div>
          )}

          {/* Weight control */}
          {exerciseDef?.measurementType === "weight_reps" ||
           exerciseDef?.measurementType === "weighted_bodyweight_reps" ? (
            <div className="mb-4">
              <label className="text-sm font-medium text-foreground block mb-2">Weight</label>
              <div className="flex items-center gap-4 justify-center">
                <button
                  id="btn-weight-decrease"
                  onClick={() => setWeightKg((w) => Math.max(0, Math.round((w - 1.25) * 100) / 100))}
                  className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center touch-target hover:bg-muted/70 active:scale-95 transition-all"
                >
                  <MinusIcon className="w-5 h-5" />
                </button>
                <div className="text-center min-w-[100px]">
                  <span className="numeric-display">{weightKg}</span>
                  <span className="text-sm text-muted-foreground ml-1">kg</span>
                </div>
                <button
                  id="btn-weight-increase"
                  onClick={() => setWeightKg((w) => Math.round((w + 1.25) * 100) / 100)}
                  className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center touch-target hover:bg-muted/70 active:scale-95 transition-all"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="flex justify-center gap-2 mt-2">
                {[2.5, 5, 10].map((inc) => (
                  <button
                    key={inc}
                    onClick={() => setWeightKg((w) => Math.round((w + inc) * 100) / 100)}
                    className="px-3 py-1 text-xs bg-muted rounded-lg border border-border hover:bg-muted/70 transition-colors"
                  >
                    +{inc}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Reps control */}
          {(exerciseDef?.measurementType === "weight_reps" ||
            exerciseDef?.measurementType === "bodyweight_reps" ||
            exerciseDef?.measurementType === "weighted_bodyweight_reps") && (
            <div className="mb-5">
              <label className="text-sm font-medium text-foreground block mb-2">Reps</label>
              <div className="flex items-center gap-4 justify-center">
                <button
                  id="btn-reps-decrease"
                  onClick={() => setReps((r) => Math.max(0, r - 1))}
                  className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center touch-target hover:bg-muted/70 active:scale-95 transition-all"
                >
                  <MinusIcon className="w-5 h-5" />
                </button>
                <div className="text-center min-w-[80px]">
                  <span className="numeric-display">{reps}</span>
                </div>
                <button
                  id="btn-reps-increase"
                  onClick={() => setReps((r) => r + 1)}
                  className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center touch-target hover:bg-muted/70 active:scale-95 transition-all"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Complete Set button */}
          <Button
            id="btn-complete-set"
            onClick={handleCompleteSet}
            disabled={isSaving || restActive}
            size="lg"
            className="w-full h-14 text-base font-bold rounded-2xl shadow-md"
          >
            {isSaving ? (
              "Saving..."
            ) : restActive ? (
              <>
                <TimerIcon className="w-5 h-5 mr-2" />
                Resting... ({restRemaining}s)
              </>
            ) : (
              <>
                <CheckIcon className="w-5 h-5 mr-2" />
                Complete Set
              </>
            )}
          </Button>
        </Card>

        {/* Quick cues */}
        {exerciseDef?.quickCues && exerciseDef.quickCues.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Form cues</p>
            <div className="flex flex-wrap gap-1.5">
              {exerciseDef.quickCues.map((cue, i) => (
                <span
                  key={i}
                  className="text-xs bg-card border border-border px-2 py-1 rounded-lg text-muted-foreground"
                >
                  {cue}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Exercise navigation */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (exerciseIndex > 0) {
                setExerciseIndex((i) => i - 1);
                setSetNumber(1);
              }
            }}
            disabled={exerciseIndex === 0}
            className="flex-1 rounded-xl"
          >
            <ChevronLeftIcon className="w-4 h-4 mr-1" /> Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (exerciseIndex < totalExercises - 1) {
                setExerciseIndex((i) => i + 1);
                setSetNumber(1);
              } else {
                setShowFinishDialog(true);
              }
            }}
            className="flex-1 rounded-xl"
          >
            {exerciseIndex < totalExercises - 1 ? (
              <>
                Next <ChevronRightIcon className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                <FlagIcon className="w-4 h-4 mr-1" /> Finish
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Finish confirmation */}
      <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finish workout?</DialogTitle>
            <DialogDescription>
              Your sets are already saved. Finishing will mark this session as complete.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            <Button
              id="btn-confirm-finish"
              onClick={handleFinishWorkout}
              disabled={isFinishing}
              className="w-full h-12 font-semibold"
            >
              {isFinishing ? "Finishing..." : "Finish workout"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFinishDialog(false)}
              className="w-full h-12"
            >
              Keep going
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Workout complete overlay */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="max-w-sm p-6 text-center">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-display">Workout Complete! 🎉</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center mb-6">
            <div className="w-40 h-40">
              <YonoAnimation state="workout_complete" animationFamily="core_hold" />
            </div>
          </div>
          <DialogDescription className="text-base mb-8">
            Great job! Your workout has been saved to your history.
          </DialogDescription>
          <Button onClick={() => router.push("/today")} className="w-full h-12 text-lg rounded-xl">
            Back to Dashboard
          </Button>
        </DialogContent>
      </Dialog>

      {/* Exercise details & replacement dialog */}
      <ExerciseDetailsDialog
        exerciseId={detailsExId}
        onOpenChange={(open) => !open && setDetailsExId(null)}
        onReplace={async (newId) => {
          if (currentSessionExercise) {
            await db.sessionExercises.update(currentSessionExercise.id!, {
              exerciseId: newId
            });
            setDetailsExId(null);
          }
        }}
      />
    </div>
  );
}
