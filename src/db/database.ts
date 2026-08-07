import Dexie, { type EntityTable } from "dexie";
import type {
  Profile,
  Gym,
  ExerciseOverride,
  CustomExercise,
  WorkoutSession,
  SessionExercise,
  WorkoutSet,
  ExercisePreference,
  ExerciseNote,
  AiMemory,
  ChatMessage,
  ChatSummary,
  BackupMetadata,
  AchievementUnlock,
  RecoveryNote,
} from "@/types";
// ─────────────────────────────────────────────────────────
// YonoWorkoutDB — Local-first IndexedDB via Dexie
// All permanent workout data lives here.
// The server/AI is a stateless proxy and never stores workouts.
// ─────────────────────────────────────────────────────────

export const db = new Dexie("YonoWorkoutDB") as Dexie & {
  profiles: EntityTable<Profile, "id">;
  gyms: EntityTable<Gym, "id">;
  exerciseOverrides: EntityTable<ExerciseOverride, "id">;
  customExercises: EntityTable<CustomExercise, "id">;
  workoutSessions: EntityTable<WorkoutSession, "id">;
  sessionExercises: EntityTable<SessionExercise, "id">;
  workoutSets: EntityTable<WorkoutSet, "id">;
  exercisePreferences: EntityTable<ExercisePreference, "id">;
  exerciseNotes: EntityTable<ExerciseNote, "id">;
  aiMemories: EntityTable<AiMemory, "id">;
  chatMessages: EntityTable<ChatMessage, "id">;
  chatSummaries: EntityTable<ChatSummary, "id">;
  backupMetadata: EntityTable<BackupMetadata, "id">;
  achievementUnlocks: EntityTable<AchievementUnlock, "code">;
  recoveryNotes: EntityTable<RecoveryNote, "id">;
};

db.version(1).stores({
  profiles: "id",
  gyms: "id, isDefault, isPreset, updatedAt",
  exerciseOverrides: "id, exerciseId, *availableGymIds, updatedAt",
  customExercises: "id, name, movementPattern, *equipmentCodes, updatedAt",
  workoutSessions: "id, status, gymId, startedAt, completedAt, updatedAt",
  sessionExercises:
    "id, sessionId, exerciseId, [sessionId+order], status",
  workoutSets:
    "id, sessionId, sessionExerciseId, exerciseId, completedAt, [exerciseId+completedAt]",
  exercisePreferences: "id, exerciseId, preference, updatedAt",
  exerciseNotes: "id, exerciseId, pinned, updatedAt",
  aiMemories: "id, category, active, confirmed, updatedAt",
  chatMessages: "id, createdAt",
  chatSummaries: "id, updatedAt",
  backupMetadata: "id, updatedAt",
  achievementUnlocks: "code, earnedAt",
});

db.version(2).stores({
  achievementUnlocks: "code, earnedAt",
});

db.version(3).stores({
  recoveryNotes: "id, updatedAt",
});

// ─────────────────────────────────────────────────────────
// Seeding: FTL preset gym inserted on first open
// ─────────────────────────────────────────────────────────
export async function seedInitialData() {
  const now = Date.now();

  // Only seed if no gyms exist
  const gymCount = await db.gyms.count();
  if (gymCount === 0) {
    await db.gyms.add({
      id: "ftl",
      name: "FTL — Full Gym",
      description:
        "Editable commercial gym preset. Exact inventory is not verified. Add or remove equipment as needed.",
      equipmentCodes: [
        "lat_pulldown_machine",
        "cable_station",
        "functional_trainer",
        "cable_crossover",
        "seated_row_machine",
        "plate_loaded_row",
        "chest_press_machine",
        "incline_chest_press_machine",
        "shoulder_press_machine",
        "pec_deck",
        "reverse_pec_deck",
        "assisted_pull_up_machine",
        "leg_press",
        "hack_squat",
        "pendulum_squat",
        "leg_extension",
        "seated_leg_curl",
        "lying_leg_curl",
        "standing_leg_curl",
        "hip_abductor",
        "hip_adductor",
        "calf_raise_machine",
        "smith_machine",
        "squat_rack",
        "power_rack",
        "barbell",
        "ez_curl_bar",
        "weight_plates",
        "dumbbells",
        "kettlebells",
        "flat_bench",
        "adjustable_bench",
        "preacher_bench",
        "back_extension_bench",
        "pull_up_bar",
        "dip_station",
        "mat",
        "resistance_bands",
        "treadmill",
        "stationary_bike",
        "recumbent_bike",
        "elliptical",
        "stair_climber",
        "rowing_machine",
        "battle_rope",
        "sled",
      ],
      unavailableEquipmentCodes: [],
      isDefault: true,
      isPreset: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Seed default profile if none exists
  const profileCount = await db.profiles.count();
  if (profileCount === 0) {
    await db.profiles.add({
      id: "main-user",
      displayName: "Athlete",
      preferredWeightUnit: "kg",
      preferredDistanceUnit: "km",
      yonoPersonality: "balanced",
      createdAt: now,
      updatedAt: now,
    });
  }

  // Seed backup metadata
  const backupCount = await db.backupMetadata.count();
  if (backupCount === 0) {
    await db.backupMetadata.add({
      id: "backup-status",
      updatedAt: now,
    });
  }
}

export default db;
