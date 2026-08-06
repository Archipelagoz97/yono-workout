"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { YonoAnimation } from "@/components/yono/YonoAnimation";
import db from "@/db/database";

const EXPERIENCE_OPTIONS = [
  { id: "beginner", label: "Newbie", emoji: "🌱", desc: "Just getting started" },
  { id: "intermediate", label: "Regular", emoji: "💪", desc: "Been at it a while" },
  { id: "advanced", label: "Veteran", emoji: "🏆", desc: "Years under the bar" },
];

const GOAL_OPTIONS = [
  { id: "build_muscle", label: "Build Muscle", emoji: "🏋️", desc: "Hypertrophy focus" },
  { id: "get_stronger", label: "Get Stronger", emoji: "⚡", desc: "Strength & powerlifting" },
  { id: "lose_weight", label: "Lose Weight", emoji: "🔥", desc: "Cutting & conditioning" },
  { id: "general_fitness", label: "Stay Fit", emoji: "🧘", desc: "General health & wellness" },
];

type Step = "welcome" | "name" | "experience" | "goal" | "done";

interface OnboardingDialogProps {
  onComplete: () => void;
}

export function OnboardingDialog({ onComplete }: OnboardingDialogProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [experience, setExperience] = useState("intermediate");
  const [goal, setGoal] = useState("build_muscle");

  const handleComplete = async () => {
    const now = Date.now();
    await db.profiles.put({
      id: "main-user",
      displayName: name.trim(),
      experienceLevel: experience as "beginner" | "intermediate" | "advanced",
      goal,
      preferredWeightUnit: "kg",
      preferredDistanceUnit: "km",
      yonoPersonality: "balanced",
      createdAt: now,
      updatedAt: now,
    });
    onComplete();
  };

  const stepContent = {
    welcome: (
      <motion.div
        key="welcome"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="flex flex-col items-center text-center"
      >
        <div className="mb-6">
          <YonoAnimation state="greeting" size={140} />
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">
          Hey! I'm Yono 🐾
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed mb-8 max-w-xs">
          Your AI gym buddy. I'll plan workouts, track progress, and keep you motivated.
          Let's get to know each other first.
        </p>
        <Button
          onClick={() => setStep("name")}
          className="w-full h-12 rounded-xl text-base font-semibold"
        >
          Let's go!
        </Button>
      </motion.div>
    ),

    name: (
      <motion.div
        key="name"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -30 }}
        className="flex flex-col items-center text-center"
      >
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <YonoAnimation state="idle" size={60} />
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">
          What should I call you?
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          Your gym nickname, real name, or whatever feels right.
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Chris, GymRat99, SwoleMama..."
          autoFocus
          className="w-full h-12 rounded-xl border border-border bg-muted/50 px-4 text-foreground text-center text-lg font-semibold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 mb-6"
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) setStep("experience"); }}
        />
        <div className="flex gap-3 w-full">
          <Button
            variant="outline"
            onClick={() => setStep("welcome")}
            className="flex-1 h-11 rounded-xl"
          >
            Back
          </Button>
          <Button
            onClick={() => setStep("experience")}
            disabled={!name.trim()}
            className="flex-1 h-11 rounded-xl font-semibold"
          >
            Good name!
          </Button>
        </div>
      </motion.div>
    ),

    experience: (
      <motion.div
        key="experience"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -30 }}
        className="flex flex-col text-center"
      >
        <div className="mb-6">
          <YonoAnimation state="thinking" size={80} />
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">
          How long you been at this, {name.trim() || "champ"}?
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          Helps me pick the right intensity for you.
        </p>
        <div className="space-y-3 mb-6">
          {EXPERIENCE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setExperience(opt.id)}
              className={`w-full p-4 rounded-2xl border-2 text-left flex items-center gap-4 transition-all ${
                experience === opt.id
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <span className="text-3xl">{opt.emoji}</span>
              <div>
                <p className="font-semibold text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
              {experience === opt.id && (
                <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-3 w-full">
          <Button
            variant="outline"
            onClick={() => setStep("name")}
            className="flex-1 h-11 rounded-xl"
          >
            Back
          </Button>
          <Button
            onClick={() => setStep("goal")}
            className="flex-1 h-11 rounded-xl font-semibold"
          >
            Next
          </Button>
        </div>
      </motion.div>
    ),

    goal: (
      <motion.div
        key="goal"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -30 }}
        className="flex flex-col text-center"
      >
        <div className="mb-6">
          <YonoAnimation state="encouraging" size={80} />
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">
          What's the mission?
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          Your main goal. We can always switch it up later.
        </p>
        <div className="space-y-3 mb-6">
          {GOAL_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setGoal(opt.id)}
              className={`w-full p-4 rounded-2xl border-2 text-left flex items-center gap-4 transition-all ${
                goal === opt.id
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <span className="text-3xl">{opt.emoji}</span>
              <div>
                <p className="font-semibold text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
              {goal === opt.id && (
                <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-3 w-full">
          <Button
            variant="outline"
            onClick={() => setStep("experience")}
            className="flex-1 h-11 rounded-xl"
          >
            Back
          </Button>
          <Button
            onClick={handleComplete}
            className="flex-1 h-11 rounded-xl font-semibold"
          >
            Let's go!
          </Button>
        </div>
      </motion.div>
    ),
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {stepContent[step as Exclude<Step, "done">]}
      </AnimatePresence>
    </div>
  );
}
