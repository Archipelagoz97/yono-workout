"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

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
      <ellipse cx="60" cy="45" rx="26" ry="24" fill="#E8C49A" />

      {/* Ears */}
      <motion.g
        animate={{ rotate: earAngle }}
        style={{ transformOrigin: "45px 32px" }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        <ellipse cx="41" cy="30" rx="10" ry="15" fill="#C4905A" />
        <ellipse cx="41" cy="30" rx="6" ry="10" fill="#E8C49A" />
      </motion.g>
      <motion.g
        animate={{ rotate: -earAngle }}
        style={{ transformOrigin: "79px 32px" }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        <ellipse cx="79" cy="30" rx="10" ry="15" fill="#C4905A" />
        <ellipse cx="79" cy="30" rx="6" ry="10" fill="#E8C49A" />
      </motion.g>

      {/* Eyes */}
      <motion.g animate={{ scaleY: eyeScale }} style={{ transformOrigin: "52px 44px" }}>
        <ellipse cx="52" cy="44" rx="5" ry={expression === "tired" ? 3 : 5} fill="#3D2B1F" />
        <ellipse cx="50" cy="42" rx="1.5" ry="1.5" fill="white" opacity="0.8" />
      </motion.g>
      <motion.g animate={{ scaleY: eyeScale }} style={{ transformOrigin: "68px 44px" }}>
        <ellipse cx="68" cy="44" rx="5" ry={expression === "tired" ? 3 : 5} fill="#3D2B1F" />
        <ellipse cx="66" cy="42" rx="1.5" ry="1.5" fill="white" opacity="0.8" />
      </motion.g>

      {/* Eyebrows */}
      {expression === "focused" && (
        <>
          <path d="M48 37 Q52 34 56 37" stroke="#3D2B1F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M64 37 Q68 34 72 37" stroke="#3D2B1F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </>
      )}
      {expression === "surprised" && (
        <>
          <path d="M48 36 Q52 32 56 36" stroke="#3D2B1F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M64 36 Q68 32 72 36" stroke="#3D2B1F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* Nose */}
      <ellipse cx="60" cy="53" rx="5" ry="3.5" fill="#3D2B1F" />
      <ellipse cx="59" cy="52" rx="1.5" ry="1" fill="white" opacity="0.5" />

      {/* Mouth */}
      {expression === "happy" ? (
        <path d="M55 58 Q60 63 65 58" stroke="#3D2B1F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      ) : expression === "tired" ? (
        <path d="M55 59 Q60 57 65 59" stroke="#3D2B1F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M55 58 Q60 61 65 58" stroke="#3D2B1F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      )}

      {/* Sweatband */}
      <rect x="36" y="34" width="48" height="6" rx="3" fill="#F4845F" opacity="0.9" />
      <rect x="54" y="32" width="12" height="4" rx="2" fill="#E8643F" />

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
        animate={{ rotate: tailWag ? [0, 20, -20, 20, -20, 0] : 0 }}
        style={{ transformOrigin: "75px 85px" }}
        transition={{ duration: 0.8, repeat: tailWag ? Infinity : 0, ease: "easeInOut" }}
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
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
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

type JointCoords = { h: [number,number]; s: [number,number]; p: [number,number]; k: [number,number]; f: [number,number]; e: [number,number]; w: [number,number] };

function YonoPerforming({ family }: { family: YonoAnimationFamily }) {
  const getCoords = (): { start: JointCoords; end: JointCoords; duration: number } => {
    switch (family) {
      case "vertical_pull":
        return {
          start: { h: [60,25], s: [60,40], p: [60,80], k: [80,80], f: [80,110], e: [45,20], w: [60,10] },
          end: { h: [60,25], s: [60,40], p: [60,80], k: [80,80], f: [80,110], e: [50,60], w: [60,40] },
          duration: 2.5
        };
      case "horizontal_pull":
      case "rear_delt":
      case "rowing_cardio":
        return {
          start: { h: [50,25], s: [50,40], p: [50,80], k: [80,80], f: [80,110], e: [70,50], w: [90,50] },
          end: { h: [45,25], s: [45,40], p: [50,80], k: [80,80], f: [80,110], e: [30,50], w: [50,55] },
          duration: 2
        };
      case "horizontal_push":
      case "generic_machine":
        return {
          start: { h: [30,75], s: [50,75], p: [90,75], k: [110,95], f: [110,110], e: [50,50], w: [50,30] },
          end: { h: [30,75], s: [50,75], p: [90,75], k: [110,95], f: [110,110], e: [50,90], w: [50,70] },
          duration: 2
        };
      case "vertical_push":
        return {
          start: { h: [60,25], s: [60,40], p: [60,80], k: [80,80], f: [80,110], e: [50,50], w: [60,40] },
          end: { h: [60,25], s: [60,40], p: [60,80], k: [80,80], f: [80,110], e: [50,20], w: [60,10] },
          duration: 2
        };
      case "squat":
      case "generic_barbell":
        return {
          start: { h: [60,20], s: [60,35], p: [60,65], k: [65,85], f: [65,110], e: [70,45], w: [60,35] },
          end: { h: [50,50], s: [50,65], p: [40,90], k: [75,90], f: [65,110], e: [60,75], w: [50,65] },
          duration: 2.5
        };
      case "leg_press":
        return {
          start: { h: [30,80], s: [45,75], p: [80,95], k: [60,60], f: [85,40], e: [60,80], w: [75,90] },
          end: { h: [30,80], s: [45,75], p: [80,95], k: [100,70], f: [115,50], e: [60,80], w: [75,90] },
          duration: 2.5
        };
      case "hip_hinge":
        return {
          start: { h: [60,20], s: [60,35], p: [60,65], k: [65,85], f: [65,110], e: [60,50], w: [60,65] },
          end: { h: [90,45], s: [85,55], p: [40,65], k: [55,85], f: [65,110], e: [85,75], w: [85,95] },
          duration: 2.5
        };
      case "curl":
      case "generic_dumbbell":
        return {
          start: { h: [60,20], s: [60,35], p: [60,70], k: [65,90], f: [65,110], e: [60,55], w: [60,75] },
          end: { h: [60,20], s: [60,35], p: [60,70], k: [65,90], f: [65,110], e: [55,55], w: [75,40] },
          duration: 2
        };
      case "tricep_extension":
        return {
          start: { h: [60,20], s: [60,35], p: [60,70], k: [65,90], f: [65,110], e: [55,20], w: [40,30] },
          end: { h: [60,20], s: [60,35], p: [60,70], k: [65,90], f: [65,110], e: [55,20], w: [55,5] },
          duration: 2
        };
      case "lateral_raise":
        return {
          start: { h: [60,20], s: [60,35], p: [60,70], k: [65,90], f: [65,110], e: [60,55], w: [60,75] },
          end: { h: [60,20], s: [60,35], p: [60,70], k: [65,90], f: [65,110], e: [40,45], w: [20,45] },
          duration: 2
        };
      case "running":
      case "stair_climbing":
        return {
          start: { h: [60,20], s: [60,35], p: [60,65], k: [80,75], f: [80,105], e: [40,45], w: [50,30] },
          end: { h: [60,22], s: [60,37], p: [60,67], k: [50,85], f: [40,95], e: [70,45], w: [60,60] },
          duration: 0.8
        };
      case "cycling":
        return {
          start: { h: [50,30], s: [40,45], p: [75,70], k: [85,55], f: [65,85], e: [35,65], w: [20,70] },
          end: { h: [50,32], s: [40,47], p: [75,72], k: [65,90], f: [80,105], e: [35,67], w: [20,72] },
          duration: 1
        };
      case "core_hold":
      default:
        return {
          start: { h: [20,80], s: [35,80], p: [75,80], k: [100,85], f: [110,95], e: [35,100], w: [50,100] },
          end: { h: [20,82], s: [35,82], p: [75,82], k: [100,87], f: [110,97], e: [35,102], w: [50,102] },
          duration: 2
        };
    }
  };

  const { start, end, duration } = getCoords();

  const anim = (joint: keyof JointCoords, axis: 0 | 1) => [start[joint][axis], end[joint][axis], start[joint][axis]];

  return (
    <g>
      <defs>
        <linearGradient id="neonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Equipment (Simple Dumbbell/Barbell visual based on wrist pos) */}
      <motion.circle
        animate={{ cx: anim("w", 0), cy: anim("w", 1) }}
        transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
        r="6"
        fill="#94a3b8"
      />

      {/* Articulated Body Lines */}
      <g stroke="url(#neonGlow)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)">
        {/* Torso */}
        <motion.line
          animate={{ x1: anim("s", 0), y1: anim("s", 1), x2: anim("p", 0), y2: anim("p", 1) }}
          transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Upper Leg */}
        <motion.line
          animate={{ x1: anim("p", 0), y1: anim("p", 1), x2: anim("k", 0), y2: anim("k", 1) }}
          transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Lower Leg */}
        <motion.line
          animate={{ x1: anim("k", 0), y1: anim("k", 1), x2: anim("f", 0), y2: anim("f", 1) }}
          transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Upper Arm */}
        <motion.line
          animate={{ x1: anim("s", 0), y1: anim("s", 1), x2: anim("e", 0), y2: anim("e", 1) }}
          transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Lower Arm */}
        <motion.line
          animate={{ x1: anim("e", 0), y1: anim("e", 1), x2: anim("w", 0), y2: anim("w", 1) }}
          transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
        />
      </g>

      {/* Head */}
      <motion.circle
        animate={{ cx: anim("h", 0), cy: anim("h", 1) }}
        transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
        r="9"
        fill="#e2e8f0"
        filter="url(#glow)"
      />
    </g>
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
      animate={{ y: [0, -2, 0] }}
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
    performing: <YonoPerforming family={animationFamily} />,
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
