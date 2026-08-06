"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getExerciseArchetype } from "./ExerciseArchetypes";

// ─────────────────────────────────────────────────────────
// YONO ANIMATION COMPONENT
// Placeholder SVG animations until Rive files are ready.
// The API mirrors the final Rive-based component so replacing
// is a drop-in swap.
// ─────────────────────────────────────────────────────────

export type YonoState =
  | "idle"
  | "greeting"
  | "thinking"
  | "performing"
  | "set_complete"
  | "resting"
  | "tired"
  | "encouraging"
  | "workout_complete"
  | "personal_record"
  | "error";

export type YonoIntensity = "low" | "medium" | "high";

export type YonoAnimationFamily =
  | "vertical_pull"
  | "horizontal_pull"
  | "horizontal_push"
  | "vertical_push"
  | "squat"
  | "leg_press"
  | "hip_hinge"
  | "curl"
  | "tricep_extension"
  | "lateral_raise"
  | "rear_delt"
  | "core_hold"
  | "running"
  | "cycling"
  | "rowing_cardio"
  | "stair_climbing"
  | "generic_machine"
  | "generic_dumbbell"
  | "generic_barbell";

interface YonoAnimationProps {
  exerciseId?: string;
  animationFamily?: YonoAnimationFamily;
  state?: YonoState;
  intensity?: YonoIntensity;
  reducedMotion?: boolean;
  size?: number;
  className?: string;
}

function YonoHead({
  expression = "neutral",
  earAngle = 0,
  eyeScale = 1,
}: {
  expression?: "neutral" | "happy" | "tired" | "focused" | "surprised";
  earAngle?: number;
  eyeScale?: number;
}) {
  return (
    <g>
      {/* Head */}
      <ellipse cx="0" cy="0" rx="26" ry="24" fill="#E8C49A" />

      {/* Ears */}
      <motion.g
        animate={{ rotate: earAngle }}
        style={{ transformOrigin: "-15px -13px" }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        <ellipse cx="-19" cy="-15" rx="10" ry="15" fill="#C4905A" />
        <ellipse cx="-19" cy="-15" rx="6" ry="10" fill="#E8C49A" />
      </motion.g>
      <motion.g
        animate={{ rotate: -earAngle }}
        style={{ transformOrigin: "19px -13px" }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        <ellipse cx="19" cy="-15" rx="10" ry="15" fill="#C4905A" />
        <ellipse cx="19" cy="-15" rx="6" ry="10" fill="#E8C49A" />
      </motion.g>

      {/* Eyes */}
      <motion.g animate={{ scaleY: eyeScale }} style={{ transformOrigin: "-8px -1px" }}>
        <ellipse cx="-8" cy="-1" rx="5" ry={expression === "tired" ? 3 : 5} fill="#3D2B1F" />
        <ellipse cx="-10" cy="-3" rx="1.5" ry="1.5" fill="white" opacity="0.8" />
      </motion.g>
      <motion.g animate={{ scaleY: eyeScale }} style={{ transformOrigin: "8px -1px" }}>
        <ellipse cx="8" cy="-1" rx="5" ry={expression === "tired" ? 3 : 5} fill="#3D2B1F" />
        <ellipse cx="6" cy="-3" rx="1.5" ry="1.5" fill="white" opacity="0.8" />
      </motion.g>

      {/* Eyebrows */}
      {expression === "focused" && (
        <>
          <path d="M-12 -8 Q-8 -11 -4 -8" stroke="#3D2B1F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M4 -8 Q8 -11 12 -8" stroke="#3D2B1F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </>
      )}
      {expression === "surprised" && (
        <>
          <path d="M-12 -9 Q-8 -13 -4 -9" stroke="#3D2B1F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M4 -9 Q8 -13 12 -9" stroke="#3D2B1F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* Nose */}
      <ellipse cx="0" cy="8" rx="5" ry="3.5" fill="#3D2B1F" />
      <ellipse cx="-1" cy="7" rx="1.5" ry="1" fill="white" opacity="0.5" />

      {/* Mouth */}
      {expression === "happy" ? (
        <path d="M-5 13 Q0 18 5 13" stroke="#3D2B1F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      ) : expression === "tired" ? (
        <path d="M-5 14 Q0 12 5 14" stroke="#3D2B1F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M-5 13 Q0 16 5 13" stroke="#3D2B1F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      )}

      {/* Sweatband */}
      <rect x="-24" y="-11" width="48" height="6" rx="3" fill="#F4845F" opacity="0.9" />
      <rect x="-6" y="-13" width="12" height="4" rx="2" fill="#E8643F" />
    </g>
  );
}

// ─── Yono SVG Base Dog ─────────────────────────────────────
function YonoBase({
  expression = "neutral",
  earAngle = 0,
  tailWag = false,
  armLeft = 0,
  armRight = 0,
  eyeScale = 1,
  sparkle = false,
}: {
  expression?: "neutral" | "happy" | "tired" | "focused" | "surprised";
  earAngle?: number;
  tailWag?: boolean;
  armLeft?: number;
  armRight?: number;
  eyeScale?: number;
  sparkle?: boolean;
}) {
  return (
    <g>
      {/* Body */}
      <ellipse cx="60" cy="75" rx="28" ry="22" fill="#D4A57A" />

      {/* Head */}
      <g transform="translate(60, 45)">
        <YonoHead expression={expression} earAngle={earAngle} eyeScale={eyeScale} />
      </g>

      {/* Arms */}
      <motion.g
        animate={{ rotate: armLeft }}
        style={{ transformOrigin: "38px 70px" }}
        transition={{ type: "spring", stiffness: 150 }}
      >
        <ellipse cx="32" cy="72" rx="8" ry="12" fill="#D4A57A" />
        {/* Left paw */}
        <ellipse cx="32" cy="83" rx="6" ry="5" fill="#C4905A" />
      </motion.g>
      <motion.g
        animate={{ rotate: armRight }}
        style={{ transformOrigin: "82px 70px" }}
        transition={{ type: "spring", stiffness: 150 }}
      >
        <ellipse cx="88" cy="72" rx="8" ry="12" fill="#D4A57A" />
        {/* Right paw */}
        <ellipse cx="88" cy="83" rx="6" ry="5" fill="#C4905A" />
      </motion.g>

      {/* Tail */}
      <motion.g
        animate={{ rotate: tailWag ? [0, 15, 0, -15, 0] : 0 }}
        style={{ transformOrigin: "75px 85px" }}
        transition={{ duration: 1.2, repeat: tailWag ? Infinity : 0, ease: "easeInOut" }}
      >
        <path
          d="M75 82 Q88 70 90 55"
          stroke="#C4905A"
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
        />
      </motion.g>

      {/* Sparkle for PR */}
      {sparkle && (
        <>
          <motion.g
            animate={{ scale: [0, 1.2, 1, 1.2, 0], opacity: [0, 1, 0.8, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <text x="15" y="25" fontSize="14">✨</text>
          </motion.g>
          <motion.g
            animate={{ scale: [0, 1.2, 1, 1.2, 0], opacity: [0, 1, 0.8, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
          >
            <text x="88" y="20" fontSize="14">✨</text>
          </motion.g>
        </>
      )}
    </g>
  );
}

// ─── State-based animation wrappers ────────────────────────

function YonoIdle() {
  return (
    <motion.g
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <YonoBase expression="neutral" tailWag />
    </motion.g>
  );
}

function YonoGreeting() {
  return (
    <motion.g
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 0.6, times: [0, 0.4, 1], ease: "easeOut" }}
    >
      <YonoBase expression="happy" tailWag earAngle={15} />
    </motion.g>
  );
}

function YonoThinking() {
  return (
    <motion.g
      animate={{ rotate: [-2, 2, -2] }}
      style={{ transformOrigin: "60px 60px" }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
    >
      <YonoBase expression="focused" eyeScale={0.8} />
      {/* Thought bubbles */}
      <motion.g
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
      >
        <circle cx="90" cy="30" r="3" fill="#D4A57A" opacity="0.6" />
        <circle cx="96" cy="22" r="4" fill="#D4A57A" opacity="0.7" />
        <circle cx="100" cy="12" r="5" fill="#D4A57A" opacity="0.8" />
      </motion.g>
    </motion.g>
  );
}

function YonoPerforming({
  family,
  exerciseId = "",
  intensity = "medium",
}: {
  family: YonoAnimationFamily;
  exerciseId?: string;
  intensity?: YonoIntensity;
}) {
  const { duration, eq } = getExerciseArchetype(exerciseId, family);
  const bounceH = intensity === "high" ? 4 : intensity === "low" ? 2 : 3;
  const tempo = Math.max(duration, 1.5);

  const eqLabel = eq === "barbell" ? "🏋️" : eq === "dumbbell" ? "💪" : eq === "cable" || eq === "machine" ? "⚙️" : "";

  const cheers = ["GO!", "1 more!", "You got this!", "Push!", "Strong!", "🔥"];

  return (
    <motion.g
      animate={{ y: [0, -bounceH, 0, -bounceH, 0] }}
      transition={{
        duration: tempo,
        repeat: Infinity,
        ease: "easeInOut",
        times: [0, 0.25, 0.5, 0.75, 1],
      }}
    >
      <YonoBase
        expression="focused"
        tailWag
        armLeft={-20}
        armRight={20}
        eyeScale={1.1}
      />

      {eqLabel && (
        <motion.text
          x="60" y="60"
          fontSize="14"
          textAnchor="middle"
          animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.05, 1] }}
          transition={{ duration: tempo, repeat: Infinity, ease: "easeInOut" }}
        >
          {eqLabel}
        </motion.text>
      )}

      <motion.g
        animate={{ opacity: [0, 1, 1, 0], y: [0, -6, -10, -14] }}
        transition={{
          duration: tempo * 0.7,
          repeat: Infinity,
          ease: "easeOut",
          times: [0, 0.3, 0.6, 1],
          delay: tempo * 0.4,
        }}
      >
        <motion.text
          x="82" y="22"
          fontSize="8"
          fill="#C4905A"
          fontWeight="bold"
          textAnchor="middle"
        >
          {cheers[Math.floor(Math.random() * cheers.length)]}
        </motion.text>
      </motion.g>
    </motion.g>
  );
}

function YonoSetComplete() {
  return (
    <motion.g
      animate={{ y: [0, -15, 0] }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <YonoBase expression="happy" tailWag earAngle={20} eyeScale={1.2} />
      <motion.g
        animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 1] }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <text x="75" y="25" fontSize="18">👍</text>
      </motion.g>
    </motion.g>
  );
}

function YonoResting() {
  return (
    <motion.g
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <YonoBase expression="neutral" tailWag eyeScale={0.7} />
      {/* Water bottle */}
      <motion.g
        animate={{ rotate: [0, 15, 0] }}
        style={{ transformOrigin: "30px 82px" }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <rect x="22" y="74" width="10" height="16" rx="3" fill="#6BB5FF" opacity="0.9" />
        <rect x="24" y="72" width="6" height="4" rx="1" fill="#6BB5FF" />
        <rect x="22" y="80" width="10" height="4" fill="#5AA0E8" opacity="0.8" />
      </motion.g>
    </motion.g>
  );
}

function YonoTired() {
  return (
    <motion.g
      animate={{ y: [0, 1, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      <YonoBase expression="tired" eyeScale={0.5} armLeft={20} armRight={-20} />
      {/* Sweat drops */}
      <motion.g
        animate={{ y: [0, 8], opacity: [0.8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
      >
        <ellipse cx="38" cy="50" rx="2" ry="3" fill="#ADE3FF" opacity="0.7" />
      </motion.g>
    </motion.g>
  );
}

function YonoWorkoutComplete() {
  return (
    <motion.g
      animate={{ y: [0, -20, 0] }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <YonoBase expression="happy" tailWag earAngle={25} eyeScale={1.3} sparkle />
      <motion.g
        animate={{ rotate: [0, 10, -10, 0] }}
        style={{ transformOrigin: "60px 60px" }}
        transition={{ duration: 1, repeat: 3, ease: "easeInOut" }}
      >
        <text x="40" y="105" fontSize="16">🎉</text>
      </motion.g>
    </motion.g>
  );
}

function YonoPersonalRecord() {
  return (
    <motion.g
      animate={{ scale: [1, 1.1, 1] }}
      style={{ transformOrigin: "60px 60px" }}
      transition={{ duration: 0.5, repeat: 3 }}
    >
      <YonoBase expression="surprised" tailWag earAngle={-25} eyeScale={1.5} sparkle />
    </motion.g>
  );
}

function YonoError() {
  return (
    <motion.g
      animate={{ x: [0, -3, 3, 0] }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      <YonoBase expression="tired" eyeScale={0.6} />
    </motion.g>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────

export function YonoAnimation({
  exerciseId,
  animationFamily = "generic_machine",
  state = "idle",
  intensity = "medium",
  reducedMotion: reducedMotionProp,
  size = 120,
  className,
}: YonoAnimationProps) {
  const prefersReducedMotion = useReducedMotion();
  const isReduced = reducedMotionProp ?? prefersReducedMotion;

  // When reduced motion: show a static Yono
  if (isReduced) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 110"
        className={className}
        aria-label={`Yono ${state}`}
        role="img"
      >
        <YonoBase expression="neutral" />
      </svg>
    );
  }

  const stateComponent: Record<YonoState, React.ReactNode> = {
    idle: <YonoIdle />,
    greeting: <YonoGreeting />,
    thinking: <YonoThinking />,
    performing: <YonoPerforming 
          family={animationFamily} 
          exerciseId={exerciseId}
          intensity={intensity} 
        />,
    set_complete: <YonoSetComplete />,
    resting: <YonoResting />,
    tired: <YonoTired />,
    encouraging: <YonoGreeting />,
    workout_complete: <YonoWorkoutComplete />,
    personal_record: <YonoPersonalRecord />,
    error: <YonoError />,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 110"
      className={cn("overflow-visible", className)}
      aria-label={`Yono ${state}`}
      role="img"
    >
      <AnimatePresence mode="wait">
        <motion.g
          key={state}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3 }}
        >
          {stateComponent[state]}
        </motion.g>
      </AnimatePresence>
    </svg>
  );
}

export default YonoAnimation;
