"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  PlusIcon,
  MinusIcon,
  TimerIcon,
  FlagIcon,
  InfoIcon,
  Undo2Icon,
  BookmarkIcon,
  Link2Icon,
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
import { getProgressionAdvice } from "@/lib/progression";
import { notifyRestComplete, unlockAudio } from "@/lib/notifications";
import { kgToDisplay, displayToKg, roundToPlate, formatWeight } from "@/lib/units";
import { ExerciseDetailsDialog } from "@/components/workout/ExerciseDetailsDialog";
import { saveTemplate, createTemplateFromSession } from "@/lib/templates";
import type { WorkoutSet } from "@/types";

const exerciseMap = new Map(exerciseCatalog.map((e) => [e.id, e]));

const REST_DEFAULTS: Record<string, number> = {
  working: 90,
  warmup: 60,
};

const SWIPE_THRESHOLD = 50;

function getVolumeAchievement(totalKg: number): { emoji: string; label: string; copy: string } {
  if (totalKg >= 1000) {
    return {
      emoji: "⛴️",
      label: "Kapal Tongkang",
      copy: "Kamu baru aja ngangkat kapal tongkang! Ngga ngerti gimana caranya, tapi kita semua bangga.",
    };
  }
  if (totalKg >= 500) {
    return {
      emoji: "🦏",
      label: "Sekawan Lengkap",
      copy: "Setara ngangkat DD, Reyn, Fio, Vinka, dan Yono sekaligus. Mereka berlima ngga tahu harus bangga atau ketakutan.",
    };
  }
  if (totalKg >= 250) {
    return {
      emoji: "🧸",
      label: "Trio Tangguh",
      copy: "Setara ngangkat Okta, Nadhifa, dan Albert sekaligus. Gengmu itu beban, literally.",
    };
  }
  if (totalKg >= 100) {
    return {
      emoji: "🦘",
      label: "Legacy Arc",
      copy: "Setara ngangkat Chris pas masih gendut. Buat yang dulu ngeliat, ini arc redemption terbaik.",
    };
  }
  return {
    emoji: "🎒",
    label: "Beban Hidup",
    copy: "Baru ngangkat beban hidup. Yang penting udah mulai, sisanya nyusul.",
  };
}

export default function WorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  // State
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setNumber, setSetNumber] = useState(1);
  const [setType, setSetType] = useState<"warmup" | "working">("working");
  const [weight, setWeight] = useState<number>(0);
  const [reps, setReps] = useState<number>(10);
  const [rpe, setRpe] = useState<number>(0);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [distanceMeters, setDistanceMeters] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCopy, setSavedCopy] = useState<string | null>(null);
  const [yonoState, setYonoState] = useState<YonoState>("idle");
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [detailsExId, setDetailsExId] = useState<string | null>(null);
  const [lastSavedSet, setLastSavedSet] = useState<{
    id: string;
    exerciseIndex: number;
    setNumber: number;
    warmup: boolean;
  } | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateSaved, setTemplateSaved] = useState(false);

  // Rest timer
  const [restActive, setRestActive] = useState(false);
  const [restRemaining, setRestRemaining] = useState(0);
  const [restTotal, setRestTotal] = useState(90);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number | null>(null);

  // Live data
  const session = useLiveQuery(() => db.workoutSessions.get(sessionId), [sessionId]);
  const profile = useLiveQuery(() => db.profiles.get("main-user"), []);
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
            .sortBy("setNumber")
        : [],
    [currentSessionExercise?.id]
  );

  const allSessionSets = useLiveQuery(
    () =>
      db.workoutSets
        .where("sessionId")
        .equals(sessionId)
        .filter((s) => s.weightKg != null && s.reps != null)
        .toArray(),
    [sessionId]
  );

  const totalVolumeKg =
    allSessionSets?.reduce((sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0), 0) ?? 0;

  // Summary of all logged work for the completion popup, grouped by exercise.
  const exerciseSummary = useMemo(() => {
    if (!sessionExercises || !allSessionSets) return [];
    return sessionExercises
      .map((se) => {
        const def = exerciseMap.get(se.exerciseId);
        const sets = allSessionSets.filter(
          (s) => s.sessionExerciseId === se.id && s.setType !== "warmup"
        );
        if (sets.length === 0) return null;
        const workingWeight = sets.filter((s) => s.weightKg != null).map((s) => s.weightKg as number);
        const reps = sets.filter((s) => s.reps != null).map((s) => s.reps as number);
        const duration = sets.filter((s) => s.durationSeconds != null).map((s) => s.durationSeconds as number);
        return {
          name: def?.name ?? se.exerciseId,
          setCount: sets.length,
          totalReps: reps.reduce((a, b) => a + b, 0),
          avgWeightKg: workingWeight.length > 0
            ? workingWeight.reduce((a, b) => a + b, 0) / workingWeight.length
            : undefined,
          totalDurationSeconds: duration.reduce((a, b) => a + b, 0),
          durationBased: duration.length > 0 && workingWeight.length === 0,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);
  }, [sessionExercises, allSessionSets]);

  const measurementType = exerciseDef?.measurementType;
  const weightUnit = profile?.preferredWeightUnit ?? "kg";
  const hasWeightInput =
    measurementType === "weight_reps" ||
    measurementType === "weighted_bodyweight_reps" ||
    measurementType === "assisted_weight_reps";
  const hasRepsInput =
    measurementType === "weight_reps" ||
    measurementType === "bodyweight_reps" ||
    measurementType === "weighted_bodyweight_reps" ||
    measurementType === "assisted_weight_reps";
  const hasDurationInput =
    measurementType === "duration" ||
    measurementType === "distance_duration" ||
    measurementType === "calories_duration";
  const hasDistanceInput = measurementType === "distance_duration";
  const isStrengthType = hasWeightInput || hasRepsInput;

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

  // Initialize inputs from suggestion or history
  useEffect(() => {
    if (!currentSessionExercise) return;
    const suggested = currentSessionExercise.suggestedWeightKg;
    if (suggested) {
      setWeight(kgToDisplay(suggested, weightUnit));
    } else {
      setWeight(0);
    }
    const targetRepMax = currentSessionExercise.repMax ?? 12;
    setReps(targetRepMax);
    setRpe(0);
    setSetType("working");
    setDurationSeconds(0);
    setDistanceMeters(0);
    setLastSavedSet(null);
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    if (undoBannerTimerRef.current) clearTimeout(undoBannerTimerRef.current);
    unlockAudio();
  }, [currentSessionExercise?.id]);

  // Pre-fill from last set
  useEffect(() => {
    if (!completedSets || completedSets.length === 0) return;
    const lastSet = completedSets[completedSets.length - 1];
    if (lastSet.weightKg) setWeight(kgToDisplay(lastSet.weightKg, weightUnit));
    if (lastSet.reps) setReps(lastSet.reps);
    if (lastSet.durationSeconds) setDurationSeconds(lastSet.durationSeconds);
    if (lastSet.distanceMeters) setDistanceMeters(lastSet.distanceMeters);
    if (lastSet.setType === "warmup") setSetType("warmup");
    else setSetType("working");
  }, [completedSets?.length, weightUnit]);

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
          notifyRestComplete();
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

  const workingSetsDone =
    completedSets?.filter((s) => s.setType !== "warmup").length ?? 0;
  const warmupSetsDone =
    completedSets?.filter((s) => s.setType === "warmup").length ?? 0;
  const targetSets = currentSessionExercise?.targetSets ?? 3;

  // Superset grouping: members share the same supersetGroup id
  const supersetGroup = currentSessionExercise?.supersetGroup;
  const groupMembers = supersetGroup
    ? (sessionExercises ?? []).filter((e) => e.supersetGroup === supersetGroup)
    : [];
  const isLastInGroup = currentSessionExercise
    ? groupMembers.length === 0 ||
      groupMembers[groupMembers.length - 1].id === currentSessionExercise.id
    : true;

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

  const progressionAdvice = currentSessionExercise && lastSessionSets.length > 0 && isStrengthType
    ? getProgressionAdvice(
        lastSessionSets
          .filter((s) => s.weightKg && s.reps)
          .map((s) => ({ weightKg: s.weightKg!, reps: s.reps! })),
        currentSessionExercise.repMin ?? 8,
        currentSessionExercise.repMax ?? 12,
        displayToKg(weight, weightUnit)
      )
    : null;

  const clearAdvanceTimer = () => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  };

  const clearUndoBannerTimer = () => {
    if (undoBannerTimerRef.current) {
      clearTimeout(undoBannerTimerRef.current);
      undoBannerTimerRef.current = null;
    }
  };

  const goToExercise = (index: number) => {
    if (index < 0 || index >= totalExercises) return;
    clearAdvanceTimer();
    clearUndoBannerTimer();
    setExerciseIndex(index);
    setSetNumber(1);
    setLastSavedSet(null);
  };

  const goPrev = () => {
    if (exerciseIndex > 0) goToExercise(exerciseIndex - 1);
  };

  const goNext = () => {
    if (exerciseIndex < totalExercises - 1) {
      goToExercise(exerciseIndex + 1);
    } else {
      setShowFinishDialog(true);
    }
  };

  // Toggle superset grouping with the next exercise
  const toggleSuperset = async () => {
    if (!currentSessionExercise) return;
    const now = Date.now();

    if (currentSessionExercise.supersetGroup) {
      // Unlink all members of the current group
      for (const member of groupMembers) {
        await db.sessionExercises.update(member.id, {
          supersetGroup: undefined,
          updatedAt: now,
        });
      }
      setSavedCopy("Superset removed.");
      return;
    }

    const nextExercise = sessionExercises?.[exerciseIndex + 1];
    if (!nextExercise) return;

    const groupId = crypto.randomUUID();
    await db.sessionExercises.update(currentSessionExercise.id, {
      supersetGroup: groupId,
      updatedAt: now,
    });
    await db.sessionExercises.update(nextExercise.id, {
      supersetGroup: groupId,
      updatedAt: now,
    });
    setSavedCopy(`Superset: ${exerciseDef?.name} + next exercise.`);
  };

  const handleCompleteSet = useCallback(async () => {
    if (isSaving || !currentSessionExercise) return;

    setIsSaving(true);
    try {
      const now = Date.now();
      const setRecord: WorkoutSet = {
        id: crypto.randomUUID(),
        sessionId,
        sessionExerciseId: currentSessionExercise.id,
        exerciseId: currentSessionExercise.exerciseId,
        setNumber,
        setType,
        completedAt: now,
        updatedAt: now,
      };

      if (hasWeightInput) {
        if (measurementType === "assisted_weight_reps") {
          setRecord.assistanceWeightKg =
            weight > 0
              ? Math.round(displayToKg(weight, weightUnit) * 100) / 100
              : undefined;
        } else {
          setRecord.weightKg =
            weight > 0
              ? Math.round(displayToKg(weight, weightUnit) * 100) / 100
              : undefined;
        }
      }
      if (hasRepsInput) {
        setRecord.reps = reps > 0 ? reps : undefined;
      }
      if (hasDurationInput) {
        setRecord.durationSeconds = durationSeconds > 0 ? durationSeconds : undefined;
      }
      if (hasDistanceInput) {
        setRecord.distanceMeters = distanceMeters > 0 ? distanceMeters : undefined;
      }
      if (rpe > 0) {
        setRecord.rpe = rpe;
      }

      await db.workoutSets.add(setRecord);

      // Track for undo
      setLastSavedSet({
        id: setRecord.id,
        exerciseIndex,
        setNumber,
        warmup: setType === "warmup",
      });
      clearUndoBannerTimer();
      undoBannerTimerRef.current = setTimeout(() => {
        setLastSavedSet(null);
      }, 6000);

      // Build feedback message with the actual set details.
      const setLabel = setType === "warmup" ? `Warmup ${setNumber}` : `Set ${setNumber}`;
      let detail: string;
      if (hasWeightInput && weight > 0) {
        detail = `${formatWeight(setRecord.weightKg ?? setRecord.assistanceWeightKg ?? 0, weightUnit)} × ${setRecord.reps ?? "—"} reps`;
      } else if (hasDurationInput && durationSeconds > 0) {
        detail = `${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toString().padStart(2, "0")}`;
      } else if (hasDistanceInput && distanceMeters > 0) {
        detail = `${distanceMeters} m`;
      } else if (setRecord.reps) {
        detail = `${setRecord.reps} reps`;
      } else {
        detail = "saved";
      }
      const flavor = getRandomCopy("set_complete", true);
      setSavedCopy(`${setLabel} ditambah · ${detail} · ${flavor ?? "Yono approves."}`);
      setYonoState("set_complete");
      // Advance set number / exercise
      const isWarmupSet = setType === "warmup";
      const workingAfterThis = workingSetsDone + 1;

      if (!isWarmupSet && workingAfterThis >= targetSets) {
        if (!isLastInGroup) {
          // Superset: go straight to the next member, no rest
          clearAdvanceTimer();
          advanceTimerRef.current = setTimeout(() => {
            const nextMember = groupMembers.find(
              (m) => m.order > currentSessionExercise.order
            );
            const nextIndex = nextMember
              ? sessionExercises?.findIndex((e) => e.id === nextMember.id) ?? exerciseIndex
              : exerciseIndex + 1;
            if (nextIndex >= 0 && nextIndex < (sessionExercises?.length ?? 1)) {
              setExerciseIndex(nextIndex);
              setSetNumber(1);
            }
            setYonoState("idle");
            setSavedCopy(null);
          }, 1200);
        } else {
          // Start rest timer for the last member of the group
          const restDuration =
            currentSessionExercise.restSeconds ?? REST_DEFAULTS.working;
          setRestTotal(restDuration);
          setRestRemaining(restDuration);
          setRestActive(true);

          // Move to next exercise after a moment
          clearAdvanceTimer();
          advanceTimerRef.current = setTimeout(() => {
            if (exerciseIndex < totalExercises - 1) {
              setExerciseIndex((prev) => prev + 1);
              setSetNumber(1);
            }
            setYonoState("resting");
            setSavedCopy(null);
          }, 1500);
        }
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
  }, [
    isSaving,
    currentSessionExercise,
    sessionId,
    setNumber,
    setType,
    weight,
    reps,
    rpe,
    durationSeconds,
    distanceMeters,
    exerciseIndex,
    totalExercises,
    workingSetsDone,
    targetSets,
    hasWeightInput,
    hasRepsInput,
    hasDurationInput,
    hasDistanceInput,
    measurementType,
    weightUnit,
    isLastInGroup,
    groupMembers,
    sessionExercises,
  ]);

  const handleUndoLastSet = async () => {
    if (!lastSavedSet) return;
    const setToDelete = await db.workoutSets.get(lastSavedSet.id).catch(() => undefined);
    if (setToDelete) {
      await db.workoutSets.delete(lastSavedSet.id);
    }
    // Stop rest timer
    setRestActive(false);
    setRestRemaining(0);
    // Revert position (works whether or not auto-advance fired)
    clearAdvanceTimer();
    goToExercise(lastSavedSet.exerciseIndex);
    setSetNumber(lastSavedSet.setNumber);
    setLastSavedSet(null);
    setSavedCopy("Set removed.");
    setYonoState("idle");
  };

  const handleSaveTemplate = async () => {
    const name = templateName.trim() || session?.name || "Workout template";
    const template = createTemplateFromSession(
      name,
      session?.focus,
      (sessionExercises ?? []).map((ex) => ({
        exerciseId: ex.exerciseId,
        order: ex.order,
        targetSets: ex.targetSets,
        repMin: ex.repMin,
        repMax: ex.repMax,
        suggestedWeightKg: ex.suggestedWeightKg,
        restSeconds: ex.restSeconds,
        notes: ex.notes,
      }))
    );
    saveTemplate(template);
    setTemplateSaved(true);
  };

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

  const toggleWeightUnit = useCallback(async (unit: "kg" | "lb") => {
    if (unit === weightUnit || !profile) return;
    try {
      // Convert the currently entered weight to the new unit before switching.
      setWeight((w) => Math.round(kgToDisplay(displayToKg(w, weightUnit), unit) * 100) / 100);
      const now = Date.now();
      await db.profiles.update("main-user", {
        preferredWeightUnit: unit,
        updatedAt: now,
      });
      setSavedCopy(`Unit ganti ke ${unit.toUpperCase()}. Beban tetap sama.`);
    } catch {
      setSavedCopy("Unit gagal diganti. Coba lagi.");
    }
  }, [weightUnit, profile]);

  // Touch swipe navigation
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  if (!session || !sessionExercises) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-center">
          <YonoAnimation state="thinking" size={100} />
          <p className="text-muted-foreground mt-3">Loading workout...</p>
        </div>
      </div>
    );
  }

  if (sessionExercises.length === 0) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
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

  const weightLabel =
    measurementType === "assisted_weight_reps" ? "Assistance weight" : "Weight";

  return (
    <div className="min-h-dvh bg-background flex flex-col content-with-nav">
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
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setTemplateSaved(false);
              setTemplateName(session?.name ?? "");
              setShowTemplateDialog(true);
            }}
            className="p-2 text-muted-foreground hover:text-primary transition-colors"
            title="Save as template"
            id="btn-save-template"
          >
            <BookmarkIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowFinishDialog(true)}
            className="p-2 -mr-2 text-muted-foreground hover:text-foreground"
            id="btn-finish-workout"
          >
            <FlagIcon className="w-5 h-5" />
          </button>
        </div>
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
      <div
        className="flex-1 px-4"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
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
              {setType === "warmup" ? (
                <Badge variant="secondary" className="text-xs">
                  Warmup set {warmupSetsDone + 1}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  Working set {workingSetsDone + 1} of {targetSets}
                </Badge>
              )}
              {currentSessionExercise?.repMin && currentSessionExercise?.repMax && isStrengthType && (
                <Badge variant="secondary" className="text-xs">
                  Target {currentSessionExercise.repMin}–{currentSessionExercise.repMax} reps
                </Badge>
              )}
              {supersetGroup && (
                <Badge variant="outline" className="text-xs border-accent/40 text-accent">
                  Superset
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                id="btn-toggle-superset"
                onClick={toggleSuperset}
                disabled={!isStrengthType || !sessionExercises}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  supersetGroup
                    ? "bg-accent/15 border-accent/40 text-accent"
                    : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                } disabled:opacity-40`}
              >
                <Link2Icon className="w-3.5 h-3.5" />
                {supersetGroup ? "In superset" : "Superset"}
              </button>
            </div>
          </div>

          {/* Warmup / Working toggle */}
          {isStrengthType && (
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-1 p-1 bg-muted/60 rounded-xl">
                <button
                  id="btn-set-type-working"
                  onClick={() => setSetType("working")}
                  className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                    setType === "working"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Working
                </button>
                <button
                  id="btn-set-type-warmup"
                  onClick={() => setSetType("warmup")}
                  className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                    setType === "warmup"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Warmup
                </button>
              </div>
            </div>
          )}

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
                    {s.weightKg
                      ? `${formatWeight(s.weightKg, weightUnit)} × ${s.reps ?? "?"}`
                      : s.assistanceWeightKg
                      ? `${formatWeight(s.assistanceWeightKg, weightUnit)} assist × ${s.reps ?? "?"}`
                      : s.durationSeconds
                      ? `${Math.floor(s.durationSeconds / 60)}:${(s.durationSeconds % 60).toString().padStart(2, "0")}${s.distanceMeters ? ` · ${s.distanceMeters} m` : ""}`
                      : s.reps
                      ? `${s.reps} reps`
                      : "—"}
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
          {hasWeightInput && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground block">{weightLabel}</label>
                <div className="flex items-center gap-0.5 p-0.5 bg-muted/60 rounded-lg">
                  {(["kg", "lb"] as const).map((u) => (
                    <button
                      key={u}
                      id={`btn-unit-${u}`}
                      onClick={() => toggleWeightUnit(u)}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                        weightUnit === u
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground"
                      }`}
                    >
                      {u.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4 justify-center">
                <button
                  id="btn-weight-decrease"
                  onClick={() => setWeight((w) => Math.max(0, roundToPlate(w - (weightUnit === "lb" ? 2.5 : 1.25), weightUnit)))}
                  className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center touch-target hover:bg-muted/70 active:scale-95 transition-all"
                >
                  <MinusIcon className="w-5 h-5" />
                </button>
                <div className="text-center min-w-[100px]">
                  <span className="numeric-display">{weight}</span>
                  <span className="text-sm text-muted-foreground ml-1">{weightUnit}</span>
                </div>
                <button
                  id="btn-weight-increase"
                  onClick={() => setWeight((w) => roundToPlate(w + (weightUnit === "lb" ? 2.5 : 1.25), weightUnit))}
                  className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center touch-target hover:bg-muted/70 active:scale-95 transition-all"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="flex justify-center gap-2 mt-2">
                {(weightUnit === "lb" ? [5, 10, 20] : [2.5, 5, 10]).map((inc) => (
                  <button
                    key={inc}
                    onClick={() => setWeight((w) => roundToPlate(w + inc, weightUnit))}
                    className="px-3 py-1 text-xs bg-muted rounded-lg border border-border hover:bg-muted/70 transition-colors"
                  >
                    +{inc}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reps control */}
          {hasRepsInput && (
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

          {/* Duration control */}
          {hasDurationInput && (
            <div className="mb-5">
              <label className="text-sm font-medium text-foreground block mb-2">
                Duration{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  (minutes)
                </span>
              </label>
              <div className="flex items-center gap-4 justify-center">
                <button
                  id="btn-duration-decrease"
                  onClick={() => setDurationSeconds((d) => Math.max(0, d - 15))}
                  className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center touch-target hover:bg-muted/70 active:scale-95 transition-all"
                >
                  <MinusIcon className="w-5 h-5" />
                </button>
                <div className="text-center min-w-[110px]">
                  <span className="numeric-display">
                    {Math.floor(durationSeconds / 60)}:{(durationSeconds % 60).toString().padStart(2, "0")}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">min</span>
                </div>
                <button
                  id="btn-duration-increase"
                  onClick={() => setDurationSeconds((d) => d + 15)}
                  className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center touch-target hover:bg-muted/70 active:scale-95 transition-all"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="flex justify-center gap-2 mt-2">
                {[30, 60, 120].map((inc) => (
                  <button
                    key={inc}
                    onClick={() => setDurationSeconds((d) => d + inc)}
                    className="px-3 py-1 text-xs bg-muted rounded-lg border border-border hover:bg-muted/70 transition-colors"
                  >
                    +{inc}s
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Distance control */}
          {hasDistanceInput && (
            <div className="mb-5">
              <label className="text-sm font-medium text-foreground block mb-2">
                Distance{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  (meters)
                </span>
              </label>
              <div className="flex items-center gap-4 justify-center">
                <button
                  id="btn-distance-decrease"
                  onClick={() => setDistanceMeters((d) => Math.max(0, d - 100))}
                  className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center touch-target hover:bg-muted/70 active:scale-95 transition-all"
                >
                  <MinusIcon className="w-5 h-5" />
                </button>
                <div className="text-center min-w-[110px]">
                  <span className="numeric-display">{distanceMeters}</span>
                  <span className="text-sm text-muted-foreground ml-1">m</span>
                </div>
                <button
                  id="btn-distance-increase"
                  onClick={() => setDistanceMeters((d) => d + 100)}
                  className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center touch-target hover:bg-muted/70 active:scale-95 transition-all"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="flex justify-center gap-2 mt-2">
                {[500, 1000, 2000].map((inc) => (
                  <button
                    key={inc}
                    onClick={() => setDistanceMeters((d) => d + inc)}
                    className="px-3 py-1 text-xs bg-muted rounded-lg border border-border hover:bg-muted/70 transition-colors"
                  >
                    +{inc >= 1000 ? `${inc / 1000}km` : `${inc}m`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* RPE control */}
          {isStrengthType && (
            <div className="mb-5">
              <label className="text-sm font-medium text-foreground block mb-2">
                RPE{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  {rpe > 0 ? `${rpe}/10` : "— optional"}
                </span>
              </label>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {[6, 7, 8, 9, 10].map((v) => (
                  <button
                    key={v}
                    id={`btn-rpe-${v}`}
                    onClick={() => setRpe(rpe === v ? 0 : v)}
                    className={`w-10 h-10 rounded-xl text-sm font-semibold border transition-all ${
                      rpe === v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {v}
                  </button>
                ))}
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
                Complete {setType === "warmup" ? "Warmup" : "Set"}
              </>
            )}
          </Button>

          {/* Undo last set */}
          <AnimatePresence>
            {lastSavedSet && !restActive && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-3"
              >
                <Button
                  id="btn-undo-set"
                  variant="outline"
                  onClick={handleUndoLastSet}
                  className="w-full h-10 text-xs font-medium rounded-xl text-muted-foreground"
                >
                  <Undo2Icon className="w-4 h-4 mr-1.5" />
                  Undo last set
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
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
            onClick={goPrev}
            disabled={exerciseIndex === 0}
            className="flex-1 rounded-xl"
          >
            <ChevronLeftIcon className="w-4 h-4 mr-1" /> Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goNext}
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

      {/* Save as template */}
      <Dialog open={showTemplateDialog} onOpenChange={(open) => { setShowTemplateDialog(open); if (!open) { setTemplateSaved(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{templateSaved ? "Template saved" : "Save as template"}</DialogTitle>
            <DialogDescription>
              {templateSaved
                ? "This workout is now available in your templates to start again any time."
                : "Templates are stored on this device and let you repeat a workout with one tap."}
            </DialogDescription>
          </DialogHeader>
          {templateSaved ? (
            <div className="flex flex-col gap-2 mt-4">
              <Button
                onClick={() => { setShowTemplateDialog(false); setTemplateSaved(false); }}
                className="w-full h-12 font-semibold"
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 mt-4">
              <input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name"
                className="h-11 rounded-xl border border-border bg-muted/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Button
                id="btn-confirm-save-template"
                onClick={handleSaveTemplate}
                disabled={!templateName.trim()}
                className="w-full h-12 font-semibold"
              >
                <BookmarkIcon className="w-4 h-4 mr-1.5" />
                Save template
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
          <div className="mb-6 space-y-2">
            <div className="text-5xl">{getVolumeAchievement(totalVolumeKg).emoji}</div>
            <p className="font-display text-lg font-bold text-primary">
              {getVolumeAchievement(totalVolumeKg).label}
            </p>
            <DialogDescription className="text-base mx-auto max-w-xs">
              {getVolumeAchievement(totalVolumeKg).copy}
            </DialogDescription>
            {totalVolumeKg >= 100 && (
              <p className="text-sm text-muted-foreground">
                {Math.round(totalVolumeKg).toLocaleString("id-ID")} kg diangkat hari ini.
              </p>
            )}
          </div>

          {/* Exercise summary */}
          {exerciseSummary.length > 0 && (
            <div className="mb-6 text-left">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
                Kamu ngangkat
              </p>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1 scrollbar-none">
                {exerciseSummary.map((e) => {
                  let detail = `${e.setCount} set × ${e.totalReps} reps`;
                  if (e.durationBased && e.totalDurationSeconds > 0) {
                    const mins = Math.floor(e.totalDurationSeconds / 60);
                    const secs = e.totalDurationSeconds % 60;
                    detail = `${e.setCount} set × ${mins}:${secs.toString().padStart(2, "0")}`;
                  } else if (e.avgWeightKg) {
                    detail = `${e.setCount} set × ${e.totalReps} reps × ${formatWeight(e.avgWeightKg, weightUnit)}`;
                  }
                  return (
                    <div
                      key={e.name}
                      className="flex items-center justify-between gap-3 p-2.5 bg-muted/50 rounded-xl"
                    >
                      <span className="text-sm font-medium text-foreground truncate">{e.name}</span>
                      <span className="text-sm font-semibold text-primary whitespace-nowrap font-mono">
                        {detail}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
