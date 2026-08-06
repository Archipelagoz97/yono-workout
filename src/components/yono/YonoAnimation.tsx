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

function YonoPerforming({ family }: { family: YonoAnimationFamily }) {
  const armConfig: Record<YonoAnimationFamily, { armLeft: number; armRight: number; earAngle: number }> = {
    vertical_pull: { armLeft: -110, armRight: 110, earAngle: -5 },
    horizontal_pull: { armLeft: -30, armRight: 30, earAngle: 5 },
    horizontal_push: { armLeft: 30, armRight: -30, earAngle: 5 },
    vertical_push: { armLeft: -120, armRight: 120, earAngle: -10 },
    squat: { armLeft: 25, armRight: -25, earAngle: 0 },
    leg_press: { armLeft: 10, armRight: -10, earAngle: 0 },
    hip_hinge: { armLeft: 0, armRight: 0, earAngle: 5 },
    curl: { armLeft: -40, armRight: 40, earAngle: -5 },
    tricep_extension: { armLeft: -100, armRight: 100, earAngle: -5 },
    lateral_raise: { armLeft: -80, armRight: 80, earAngle: -10 },
    rear_delt: { armLeft: -30, armRight: 30, earAngle: 0 },
    core_hold: { armLeft: 0, armRight: 0, earAngle: 0 },
    running: { armLeft: -40, armRight: 40, earAngle: 10 },
    cycling: { armLeft: 20, armRight: -20, earAngle: 0 },
    rowing_cardio: { armLeft: -40, armRight: 40, earAngle: 0 },
    stair_climbing: { armLeft: -20, armRight: 20, earAngle: 5 },
    generic_machine: { armLeft: -20, armRight: 20, earAngle: 0 },
    generic_dumbbell: { armLeft: -40, armRight: 40, earAngle: -5 },
    generic_barbell: { armLeft: -25, armRight: 25, earAngle: 5 },
  };

  const config = armConfig[family] ?? armConfig.generic_machine;

  let yAnim = [0, -4, 0, -4, 0];
  let duration = 1.5;
  let bgProps: React.ReactNode = null;
  let yonoBgProps: React.ReactNode = null;
  let yonoFgProps: React.ReactNode = null;
  let fgProps: React.ReactNode = null;

  switch (family) {
    case "squat":
      yAnim = [0, 15, 0, 15, 0];
      duration = 2.5;
      yonoBgProps = (
        <g>
          <rect x="10" y="42" width="100" height="4" fill="#94a3b8" />
          <circle cx="10" cy="44" r="6" fill="#64748b" />
          <circle cx="110" cy="44" r="6" fill="#64748b" />
        </g>
      );
      break;

    case "vertical_pull":
      yAnim = [15, 0, 15, 0, 15];
      duration = 2.5;
      bgProps = (
        <g>
          <rect x="20" y="5" width="80" height="4" fill="#475569" />
          <rect x="30" y="0" width="4" height="20" fill="#475569" />
          <rect x="86" y="0" width="4" height="20" fill="#475569" />
        </g>
      );
      break;

    case "horizontal_push":
      yAnim = [0, -2, 0, -2, 0];
      fgProps = (
        <motion.g animate={{ y: [-10, 10, -10, 10, -10] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
          <rect x="20" y="50" width="80" height="4" fill="#94a3b8" />
          <circle cx="20" cy="52" r="8" fill="#64748b" />
          <circle cx="100" cy="52" r="8" fill="#64748b" />
        </motion.g>
      );
      break;

    case "horizontal_pull":
    case "rowing_cardio":
      yAnim = [0, 3, 0, 3, 0];
      duration = 2;
      fgProps = (
        <motion.g animate={{ x: [5, -5, 5, -5, 5] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
          <rect x="40" y="65" width="40" height="4" fill="#94a3b8" />
          <path d="M60 65 L80 120" stroke="#475569" strokeWidth="2" />
        </motion.g>
      );
      break;

    case "vertical_push":
      yAnim = [0, 2, 0, 2, 0];
      fgProps = (
        <motion.g animate={{ y: [0, -30, 0, -30, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
          {/* Left Dumbbell */}
          <rect x="22" y="30" width="16" height="4" fill="#94a3b8" />
          <rect x="18" y="25" width="4" height="14" fill="#475569" />
          <rect x="38" y="25" width="4" height="14" fill="#475569" />
          {/* Right Dumbbell */}
          <rect x="82" y="30" width="16" height="4" fill="#94a3b8" />
          <rect x="78" y="25" width="4" height="14" fill="#475569" />
          <rect x="98" y="25" width="4" height="14" fill="#475569" />
        </motion.g>
      );
      break;

    case "curl":
    case "generic_dumbbell":
      yAnim = [0, 2, 0, 2, 0];
      fgProps = (
        <motion.g animate={{ y: [20, 0, 20, 0, 20] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
          <rect x="25" y="65" width="10" height="4" fill="#94a3b8" />
          <rect x="22" y="61" width="3" height="12" fill="#475569" />
          <rect x="35" y="61" width="3" height="12" fill="#475569" />
          
          <rect x="85" y="65" width="10" height="4" fill="#94a3b8" />
          <rect x="82" y="61" width="3" height="12" fill="#475569" />
          <rect x="95" y="61" width="3" height="12" fill="#475569" />
        </motion.g>
      );
      break;

    case "leg_press":
      yAnim = [0, -2, 0, -2, 0];
      bgProps = (
        <motion.g animate={{ x: [10, -10, 10, -10, 10], y: [-10, 10, -10, 10, -10] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
          <rect x="70" y="20" width="30" height="40" rx="4" fill="#94a3b8" />
          <circle cx="85" cy="40" r="8" fill="#64748b" />
        </motion.g>
      );
      break;

    case "running":
      yAnim = [0, -6, 0, -6, 0];
      duration = 0.6;
      bgProps = <rect x="20" y="100" width="80" height="4" fill="#475569" />;
      break;

    case "cycling":
      yAnim = [0, -2, 0, -2, 0];
      duration = 0.8;
      yonoFgProps = <circle cx="60" cy="85" r="20" fill="none" stroke="#94a3b8" strokeWidth="4" />;
      break;

    case "lateral_raise":
      fgProps = (
        <motion.g animate={{ y: [0, -25, 0, -25, 0], x: [0, -5, 0, -5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
          <circle cx="20" cy="70" r="5" fill="#475569" />
        </motion.g>
      );
      const fgPropsRight = (
        <motion.g animate={{ y: [0, -25, 0, -25, 0], x: [0, 5, 0, 5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
          <circle cx="100" cy="70" r="5" fill="#475569" />
        </motion.g>
      );
      fgProps = <>{fgProps}{fgPropsRight}</>;
      break;

    case "tricep_extension":
      fgProps = (
        <motion.g animate={{ y: [-10, 20, -10, 20, -10] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
          <path d="M60 0 L60 50" stroke="#94a3b8" strokeWidth="2" />
          <rect x="50" y="50" width="20" height="6" rx="3" fill="#475569" />
        </motion.g>
      );
      break;

    case "hip_hinge":
    case "generic_barbell":
      yAnim = [0, 10, 0, 10, 0];
      duration = 2.5;
      fgProps = (
        <motion.g animate={{ y: [0, 15, 0, 15, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
          <rect x="20" y="70" width="80" height="4" fill="#94a3b8" />
          <circle cx="20" cy="72" r="8" fill="#64748b" />
          <circle cx="100" cy="72" r="8" fill="#64748b" />
        </motion.g>
      );
      break;

    default:
      // core_hold, rear_delt, stair_climbing, generic_machine
      break;
  }

  return (
    <g>
      {bgProps}
      <motion.g
        animate={{ y: yAnim }}
        transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
      >
        {yonoBgProps}
        <YonoBase
          expression="focused"
          earAngle={config.earAngle}
          armLeft={config.armLeft}
          armRight={config.armRight}
        />
        {yonoFgProps}
      </motion.g>
      {fgProps}
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
