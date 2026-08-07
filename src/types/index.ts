// Yono Workout — Core Types
// These interfaces define the IndexedDB schema.
// All permanent workout data lives here — never in AI chat history.

export interface Profile {
  id: "main-user";
  displayName: string;
  goal?: string;
  experienceLevel?: "beginner" | "intermediate" | "advanced";
  preferredWeightUnit: "kg" | "lb";
  preferredDistanceUnit: "km" | "mi";
  yonoPersonality: "quiet" | "balanced" | "playful";
  createdAt: number;
  updatedAt: number;
}

export interface AchievementUnlock {
  code: string;
  earnedAt: number;
}

export interface Gym {
  id: string;
  name: string;
  description?: string;
  equipmentCodes: string[];
  unavailableEquipmentCodes?: string[];
  isDefault: boolean;
  isPreset: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ExerciseOverride {
  id: string;
  exerciseId: string;
  customName?: string;
  customNotes?: string;
  hidden?: boolean;
  availableGymIds?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface CustomExercise {
  id: string;
  name: string;
  aliases?: string[];
  movementPattern: string;
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  equipmentCodes: string[];
  measurementType:
    | "weight_reps"
    | "bodyweight_reps"
    | "duration"
    | "distance_duration"
    | "assisted_weight_reps"
    | "weighted_bodyweight_reps"
    | "calories_duration";
  animationFamily: string;
  defaultRepMin?: number;
  defaultRepMax?: number;
  defaultRestSeconds?: number;
  createdAt: number;
  updatedAt: number;
}

export interface WorkoutSession {
  id: string;
  name: string;
  gymId?: string;
  status: "draft" | "active" | "paused" | "completed" | "cancelled";
  source: "ai" | "manual" | "duplicate" | "fallback" | "template";
  focus: string[];
  energy?: "low" | "okay" | "strong";
  discomfortAreas?: string[];
  estimatedMinutes?: number;
  startedAt?: number;
  completedAt?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SessionExercise {
  id: string;
  sessionId: string;
  exerciseId: string;
  order: number;
  status: "pending" | "active" | "completed" | "skipped" | "replaced";
  targetSets?: number;
  repMin?: number;
  repMax?: number;
  suggestedWeightKg?: number;
  restSeconds?: number;
  notes?: string;
  supersetGroup?: string;
  replacedByExerciseId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WorkoutSet {
  id: string;
  sessionId: string;
  sessionExerciseId: string;
  exerciseId: string;
  setNumber: number;
  setType: "warmup" | "working" | "drop" | "backoff" | "failure" | "cardio";
  weightKg?: number;
  reps?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  assistanceWeightKg?: number;
  rpe?: number;
  notes?: string;
  completedAt: number;
  updatedAt: number;
}

export interface ExercisePreference {
  id: string;
  exerciseId: string;
  preference: "favorite" | "liked" | "neutral" | "disliked" | "avoid";
  reason?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ExerciseNote {
  id: string;
  exerciseId: string;
  note: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AiMemory {
  id: string;
  category:
    | "goal"
    | "gym_preference"
    | "equipment_preference"
    | "exercise_preference"
    | "exercise_note"
    | "schedule_preference"
    | "communication_preference"
    | "general";
  content: string;
  confidence?: number;
  confirmed: boolean;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  structuredAction?: unknown;
  createdAt: number;
}

export interface ChatSummary {
  id: "main-coach-summary";
  summary: string;
  summarizedUntil?: number;
  updatedAt: number;
}

export interface BackupMetadata {
  id: "backup-status";
  lastExportedAt?: number;
  lastImportedAt?: number;
  updatedAt: number;
}

export interface WeeklyPlan {
  id: "main-weekly-plan";
  trainingDays: Array<{
    dayIndex: number; // 0..6 (0 = Monday)
    focus: string[];
    presentAt?: number[][]; // weekly times [hour, minute]
  }>;
  createdAt: number;
  updatedAt: number;
}

export interface BodyStat {
  id: number;
  date: number; // day timestamp (start of day)
  bodyWeightKg?: number;
  waistCm?: number;
  chestCm?: number;
  shouldersCm?: number;
  armsCm?: number;
  thighsCm?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// Backup file format
export interface YonoBackup {
  schemaVersion: 1;
  exportedAt: string;
  appVersion: string;
  data: {
    profiles: Profile[];
    gyms: Gym[];
    exerciseOverrides: ExerciseOverride[];
    customExercises: CustomExercise[];
    workoutSessions: WorkoutSession[];
    sessionExercises: SessionExercise[];
    workoutSets: WorkoutSet[];
    exercisePreferences: ExercisePreference[];
    exerciseNotes: ExerciseNote[];
    aiMemories: AiMemory[];
    chatMessages: ChatMessage[];
    chatSummaries: ChatSummary[];
    weeklyPlans?: WeeklyPlan[];
    bodyStats?: BodyStat[];
  };
}

// Active workout context for state management
export interface ActiveWorkoutState {
  sessionId: string;
  currentExerciseIndex: number;
  currentSetNumber: number;
  restTimerStartedAt?: number;
  restTimerTargetAt?: number;
  restTimerPaused?: boolean;
}

// AI context types (sent to server-side API routes)
export interface WorkoutPlanningContext {
  profile: {
    goal?: string;
    experienceLevel?: string;
  };
  request: {
    focus: string[];
    availableMinutes?: number;
    energy?: string;
    equipmentMode?: string;
    discomfortAreas?: string[];
  };
  gym: {
    id: string;
    name: string;
    availableEquipmentCodes: string[];
  };
  recentSessions: Array<{
    name: string;
    focus: string[];
    completedAt: number;
    exercises: Array<{
      exerciseId: string;
      sets: Array<{
        weightKg?: number;
        reps?: number;
        rpe?: number;
      }>;
    }>;
  }>;
  relevantExerciseHistory: Array<{
    exerciseId: string;
    recentPerformances: Array<{
      completedAt: number;
      sets: Array<{
        weightKg?: number;
        reps?: number;
      }>;
    }>;
  }>;
  preferences: ExercisePreference[];
  notes: ExerciseNote[];
  memories: AiMemory[];
}
