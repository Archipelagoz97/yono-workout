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

function YonoPerforming({
  family,
  exerciseId = "",
  intensity = "medium",
}: {
  family: YonoAnimationFamily;
  exerciseId?: string;
  intensity?: YonoIntensity;
}) {
  const { start, end, duration, prop, eq } = getExerciseArchetype(exerciseId, family);

  // Helper to generate a single continuous path for 3 joints (e.g. Shoulder -> Elbow -> Wrist)
  const getPath = (j1: keyof typeof start, j2: keyof typeof start, j3: keyof typeof start, coords: typeof start, dx = 0, dy = 0) => {
    return `M ${coords[j1][0] + dx} ${coords[j1][1] + dy} L ${coords[j2][0] + dx} ${coords[j2][1] + dy} L ${coords[j3][0] + dx} ${coords[j3][1] + dy}`;
  };

  // Pause physics: start -> end -> pause -> start
  const transitionConfig = { duration, repeat: Infinity, times: [0, 0.4, 0.6, 1], ease: "easeInOut" as const };

  const animPath = (j1: keyof typeof start, j2: keyof typeof start, j3: keyof typeof start, dx = 0, dy = 0) => [
    getPath(j1, j2, j3, start, dx, dy),
    getPath(j1, j2, j3, end, dx, dy),
    getPath(j1, j2, j3, end, dx, dy),
    getPath(j1, j2, j3, start, dx, dy)
  ];

  const animCoord = (joint: keyof typeof start, axis: 0 | 1, offset = 0) => [
    start[joint][axis] + offset, 
    end[joint][axis] + offset, 
    end[joint][axis] + offset, 
    start[joint][axis] + offset
  ];

  // ─────────────────────────────────────────────────────────
  // EQUIPMENT & ENVIRONMENT VISUALS (HOLOGRAPHIC STYLE)
  // ─────────────────────────────────────────────────────────
  let eqVisual = null;
  if (eq === "barbell") {
    eqVisual = (
      <g>
        <rect x="-40" y="-1" width="80" height="2" fill="#00E5FF" opacity="0.8" />
        <rect x="-35" y="-10" width="4" height="20" rx="1" fill="#00E5FF" opacity="0.6" />
        <rect x="31" y="-10" width="4" height="20" rx="1" fill="#00E5FF" opacity="0.6" />
      </g>
    );
  } else if (eq === "dumbbell") {
    eqVisual = (
      <g>
        <rect x="-10" y="-1" width="20" height="2" fill="#00E5FF" opacity="0.8" />
        <rect x="-12" y="-6" width="4" height="12" rx="1" fill="#00E5FF" opacity="0.6" />
        <rect x="8" y="-6" width="4" height="12" rx="1" fill="#00E5FF" opacity="0.6" />
      </g>
    );
  } else if (eq === "cable" || eq === "machine") {
    eqVisual = (
      <g>
        <circle cx="0" cy="0" r="4" fill="none" stroke="#00E5FF" strokeWidth="1" />
        <circle cx="0" cy="0" r="1.5" fill="#00E5FF" />
      </g>
    );
  }

  let propVisual = null;
  const propStroke = "rgba(0, 229, 255, 0.2)";
  if (prop === "floor") {
    propVisual = <line x1="-20" y1="105" x2="140" y2="105" stroke={propStroke} strokeWidth="1" strokeDasharray="4 4" />;
  } else if (prop === "bench") {
    propVisual = (
      <g>
        <rect x="30" y="80" width="80" height="4" fill="none" stroke={propStroke} strokeWidth="1" />
        <line x1="40" y1="84" x2="40" y2="105" stroke={propStroke} strokeWidth="1" strokeDasharray="2 2" />
        <line x1="100" y1="84" x2="100" y2="105" stroke={propStroke} strokeWidth="1" strokeDasharray="2 2" />
      </g>
    );
  } else if (prop === "incline_bench") {
    propVisual = (
      <g>
        <rect x="40" y="55" width="60" height="4" fill="none" stroke={propStroke} strokeWidth="1" transform="rotate(-30 40 55)" />
        <rect x="50" y="90" width="40" height="4" fill="none" stroke={propStroke} strokeWidth="1" />
        <line x1="60" y1="94" x2="60" y2="105" stroke={propStroke} strokeWidth="1" strokeDasharray="2 2" />
      </g>
    );
  } else if (prop === "pullup_bar") {
    propVisual = <rect x="20" y="10" width="80" height="2" fill={propStroke} />;
  }

  // Holographic Data Grid Background
  const gridVisual = (
    <g opacity="0.1">
      {[20, 40, 60, 80, 100].map(y => (
        <line key={`hy-${y}`} x1="0" y1={y} x2="120" y2={y} stroke="#00E5FF" strokeWidth="0.5" />
      ))}
      {[20, 40, 60, 80, 100].map(x => (
        <line key={`hx-${x}`} x1={x} y1="0" x2={x} y2="120" stroke="#00E5FF" strokeWidth="0.5" />
      ))}
    </g>
  );

  // Background offset for 3D depth (smaller for hologram)
  const bgDx = 6;
  const bgDy = -2;

  // The main glowing color for the wireframe
  const holoColor = "#00E5FF";
  const dimColor = "#0088AA";

  return (
    <g>
      <defs>
        <filter id="hologlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="100%" stopColor="#B300FF" />
        </linearGradient>
      </defs>

      {/* Grid Background */}
      {gridVisual}
      
      {/* Environment Props */}
      {propVisual}

      {/* Background Hologram Limbs (Dimmer) */}
      <g strokeLinecap="round" strokeLinejoin="round" filter="url(#hologlow)" opacity="0.5">
        <motion.path
          animate={{ d: animPath("p", "k", "f", bgDx, bgDy) }}
          transition={transitionConfig}
          stroke={dimColor}
          strokeWidth="1.5"
          fill="none"
        />
        <motion.circle animate={{ cx: animCoord("k", 0, bgDx), cy: animCoord("k", 1, bgDy) }} transition={transitionConfig} r="2" fill={dimColor} />
        <motion.circle animate={{ cx: animCoord("f", 0, bgDx), cy: animCoord("f", 1, bgDy) }} transition={transitionConfig} r="2.5" fill={dimColor} />

        <motion.path
          animate={{ d: animPath("s", "e", "w", bgDx, bgDy) }}
          transition={transitionConfig}
          stroke={dimColor}
          strokeWidth="1.5"
          fill="none"
        />
        <motion.circle animate={{ cx: animCoord("e", 0, bgDx), cy: animCoord("e", 1, bgDy) }} transition={transitionConfig} r="2" fill={dimColor} />
        <motion.circle animate={{ cx: animCoord("w", 0, bgDx), cy: animCoord("w", 1, bgDy) }} transition={transitionConfig} r="2.5" fill={dimColor} />
      </g>

      {/* Foreground Hologram Body */}
      <g strokeLinecap="round" strokeLinejoin="round" filter="url(#hologlow)">
        {/* Wireframe Torso */}
        <motion.line
          animate={{ 
            x1: animCoord("s", 0), y1: animCoord("s", 1), 
            x2: animCoord("p", 0), y2: animCoord("p", 1) 
          }}
          transition={transitionConfig}
          stroke="url(#neonGradient)"
          strokeWidth="2"
        />
        
        {/* Core/Pelvis Node */}
        <motion.circle animate={{ cx: animCoord("p", 0), cy: animCoord("p", 1) }} transition={transitionConfig} r="3" fill="#B300FF" />
        {/* Shoulder Node */}
        <motion.circle animate={{ cx: animCoord("s", 0), cy: animCoord("s", 1) }} transition={transitionConfig} r="3" fill="#00E5FF" />

        {/* FG Leg */}
        <motion.path
          animate={{ d: animPath("p", "k", "f") }}
          transition={transitionConfig}
          stroke={holoColor}
          strokeWidth="2"
          fill="none"
        />
        <motion.circle animate={{ cx: animCoord("k", 0), cy: animCoord("k", 1) }} transition={transitionConfig} r="2" fill={holoColor} />
        <motion.circle animate={{ cx: animCoord("f", 0), cy: animCoord("f", 1) }} transition={transitionConfig} r="2.5" fill={holoColor} />
        
        {/* FG Arm */}
        <motion.path
          animate={{ d: animPath("s", "e", "w") }}
          transition={transitionConfig}
          stroke={holoColor}
          strokeWidth="2"
          fill="none"
        />
        <motion.circle animate={{ cx: animCoord("e", 0), cy: animCoord("e", 1) }} transition={transitionConfig} r="2" fill={holoColor} />
        <motion.circle animate={{ cx: animCoord("w", 0), cy: animCoord("w", 1) }} transition={transitionConfig} r="2.5" fill={holoColor} />
      </g>

      {/* Equipment attached to FG Hand (Now Holographic) */}
      <motion.g
        animate={{ x: animCoord("w", 0), y: animCoord("w", 1) }}
        transition={transitionConfig}
        filter="url(#hologlow)"
      >
        {eqVisual}
      </motion.g>

      {/* Head with Dynamic Expression & Floating AI Aura */}
      <motion.g
        animate={{ x: animCoord("h", 0), y: animCoord("h", 1) }}
        transition={transitionConfig}
      >
        {/* Holographic scanning ring around head */}
        <motion.circle 
          cx="0" cy="0" r="18" 
          fill="none" stroke="#00E5FF" strokeWidth="0.5" strokeDasharray="4 4"
          animate={{ rotate: 360, scale: [1, 1.1, 1] }} 
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />

        <motion.g animate={{ opacity: [1, 0, 0, 1] }} transition={transitionConfig}>
          <YonoHead expression="focused" earAngle={-5} />
        </motion.g>
        
        <motion.g animate={{ opacity: [0, 1, 1, 0] }} transition={transitionConfig}>
          <YonoHead expression="tired" earAngle={-20} />
          
          <motion.g animate={{ y: [0, -10, -10, 0], opacity: [0, 1, 1, 0] }} transition={transitionConfig}>
            <circle cx="-15" cy="-20" r="2" fill="#ADE3FF" />
            <circle cx="15" cy="-25" r="2.5" fill="#ADE3FF" />
          </motion.g>
        </motion.g>
      </motion.g>
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
