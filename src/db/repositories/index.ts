// Yono Workout — Database Repository Functions
// All queries against IndexedDB go through here.
// The AI never queries this directly — the client builds context packets.

import db from "@/db/database";
import type {
  WorkoutSession,
  SessionExercise,
  WorkoutSet,
  ExercisePreference,
  ExerciseNote,
  AiMemory,
  Profile,
  Gym,
  ChatMessage,
  CustomExercise,
} from "@/types";

// ─────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────

export async function getProfile(): Promise<Profile | undefined> {
  return db.profiles.get("main-user");
}

export async function upsertProfile(
  updates: Partial<Omit<Profile, "id" | "createdAt">>
): Promise<void> {
  const now = Date.now();
  const existing = await db.profiles.get("main-user");
  if (existing) {
    await db.profiles.update("main-user", { ...updates, updatedAt: now });
  } else {
    await db.profiles.add({
      id: "main-user",
      displayName: "Athlete",
      preferredWeightUnit: "kg",
      preferredDistanceUnit: "km",
      yonoPersonality: "balanced",
      createdAt: now,
      updatedAt: now,
      ...updates,
    });
  }
}

// ─────────────────────────────────────────────────────────
// GYMS
// ─────────────────────────────────────────────────────────

export async function getAllGyms(): Promise<Gym[]> {
  return db.gyms.toArray();
}

export async function getDefaultGym(): Promise<Gym | undefined> {
  return db.gyms.where("isDefault").equals(1).first();
}

export async function getGymById(id: string): Promise<Gym | undefined> {
  return db.gyms.get(id);
}

export async function upsertGym(gym: Gym): Promise<void> {
  await db.gyms.put(gym);
}

// ─────────────────────────────────────────────────────────
// WORKOUT SESSIONS
// ─────────────────────────────────────────────────────────

export async function createWorkoutSession(
  session: Omit<WorkoutSession, "createdAt" | "updatedAt">
): Promise<string> {
  const now = Date.now();
  const id = session.id || crypto.randomUUID();
  await db.workoutSessions.add({ ...session, id, createdAt: now, updatedAt: now });
  return id;
}

export async function getWorkoutSession(id: string): Promise<WorkoutSession | undefined> {
  return db.workoutSessions.get(id);
}

export async function updateWorkoutSession(
  id: string,
  updates: Partial<WorkoutSession>
): Promise<void> {
  await db.workoutSessions.update(id, { ...updates, updatedAt: Date.now() });
}

export async function getActiveWorkoutSession(): Promise<WorkoutSession | undefined> {
  return db.workoutSessions.where("status").equals("active").first();
}

export async function getRecentCompletedSessions(limit = 8): Promise<WorkoutSession[]> {
  return db.workoutSessions
    .where("status")
    .equals("completed")
    .reverse()
    .sortBy("completedAt")
    .then((sessions) => sessions.slice(0, limit));
}

export async function getAllCompletedSessions(): Promise<WorkoutSession[]> {
  return db.workoutSessions
    .where("status")
    .equals("completed")
    .reverse()
    .sortBy("completedAt");
}

export async function deleteWorkoutSession(id: string): Promise<void> {
  await db.transaction("rw", [db.workoutSessions, db.sessionExercises, db.workoutSets], async () => {
    const exercises = await db.sessionExercises.where("sessionId").equals(id).toArray();
    const exerciseIds = exercises.map((e) => e.id);

    if (exerciseIds.length > 0) {
      await db.workoutSets.where("sessionExerciseId").anyOf(exerciseIds).delete();
    }
    await db.sessionExercises.where("sessionId").equals(id).delete();
    await db.workoutSessions.delete(id);
  });
}

// ─────────────────────────────────────────────────────────
// SESSION EXERCISES
// ─────────────────────────────────────────────────────────

export async function addSessionExercise(
  exercise: Omit<SessionExercise, "createdAt" | "updatedAt">
): Promise<string> {
  const now = Date.now();
  const id = exercise.id || crypto.randomUUID();
  await db.sessionExercises.add({ ...exercise, id, createdAt: now, updatedAt: now });
  return id;
}

export async function getSessionExercises(sessionId: string): Promise<SessionExercise[]> {
  return db.sessionExercises
    .where("[sessionId+order]")
    .between([sessionId, Dexie.minKey], [sessionId, Dexie.maxKey])
    .toArray();
}

export async function updateSessionExercise(
  id: string,
  updates: Partial<SessionExercise>
): Promise<void> {
  await db.sessionExercises.update(id, { ...updates, updatedAt: Date.now() });
}

// ─────────────────────────────────────────────────────────
// WORKOUT SETS
// ─────────────────────────────────────────────────────────

export async function addWorkoutSet(
  set: Omit<WorkoutSet, "updatedAt">
): Promise<string> {
  const id = set.id || crypto.randomUUID();
  await db.workoutSets.add({ ...set, id, updatedAt: Date.now() });
  return id;
}

export async function getWorkoutSets(sessionExerciseId: string): Promise<WorkoutSet[]> {
  return db.workoutSets
    .where("sessionExerciseId")
    .equals(sessionExerciseId)
    .sortBy("setNumber");
}

export async function getWorkoutSetsBySession(sessionId: string): Promise<WorkoutSet[]> {
  return db.workoutSets.where("sessionId").equals(sessionId).toArray();
}

export async function updateWorkoutSet(
  id: string,
  updates: Partial<WorkoutSet>
): Promise<void> {
  await db.workoutSets.update(id, { ...updates, updatedAt: Date.now() });
}

export async function deleteWorkoutSet(id: string): Promise<void> {
  await db.workoutSets.delete(id);
}

export async function getRecentSetsForExercise(
  exerciseId: string,
  limit = 5
): Promise<WorkoutSet[]> {
  return db.workoutSets
    .where("[exerciseId+completedAt]")
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .reverse()
    .limit(limit * 5) // get more then filter by working sets
    .toArray();
}

export async function getExerciseHistory(
  exerciseId: string,
  sessionLimit = 5
): Promise<Array<{ sessionId: string; completedAt: number; sets: WorkoutSet[] }>> {
  // Get completed sessions where this exercise was performed
  const sessions = await getRecentCompletedSessions(20);

  const history: Array<{ sessionId: string; completedAt: number; sets: WorkoutSet[] }> = [];

  for (const session of sessions) {
    if (history.length >= sessionLimit) break;

    const sets = await db.workoutSets
      .where("sessionId")
      .equals(session.id)
      .filter((s) => s.exerciseId === exerciseId && s.setType !== "warmup")
      .toArray();

    if (sets.length > 0) {
      history.push({
        sessionId: session.id,
        completedAt: session.completedAt ?? session.updatedAt,
        sets,
      });
    }
  }

  return history;
}

// ─────────────────────────────────────────────────────────
// EXERCISE PREFERENCES
// ─────────────────────────────────────────────────────────

export async function getExercisePreferences(): Promise<ExercisePreference[]> {
  return db.exercisePreferences.toArray();
}

export async function getExercisePreference(
  exerciseId: string
): Promise<ExercisePreference | undefined> {
  return db.exercisePreferences.where("exerciseId").equals(exerciseId).first();
}

export async function setExercisePreference(
  exerciseId: string,
  preference: ExercisePreference["preference"],
  reason?: string
): Promise<void> {
  const now = Date.now();
  const existing = await db.exercisePreferences
    .where("exerciseId")
    .equals(exerciseId)
    .first();

  if (existing) {
    await db.exercisePreferences.update(existing.id, {
      preference,
      reason,
      updatedAt: now,
    });
  } else {
    await db.exercisePreferences.add({
      id: crypto.randomUUID(),
      exerciseId,
      preference,
      reason,
      createdAt: now,
      updatedAt: now,
    });
  }
}

// ─────────────────────────────────────────────────────────
// EXERCISE NOTES
// ─────────────────────────────────────────────────────────

export async function getExerciseNotes(exerciseId: string): Promise<ExerciseNote[]> {
  return db.exerciseNotes
    .where("exerciseId")
    .equals(exerciseId)
    .sortBy("pinned");
}

export async function addExerciseNote(
  exerciseId: string,
  note: string,
  pinned = false
): Promise<string> {
  const now = Date.now();
  const id = crypto.randomUUID();
  await db.exerciseNotes.add({
    id,
    exerciseId,
    note,
    pinned,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateExerciseNote(
  id: string,
  updates: Partial<Pick<ExerciseNote, "note" | "pinned">>
): Promise<void> {
  await db.exerciseNotes.update(id, { ...updates, updatedAt: Date.now() });
}

export async function deleteExerciseNote(id: string): Promise<void> {
  await db.exerciseNotes.delete(id);
}

// ─────────────────────────────────────────────────────────
// AI MEMORIES
// ─────────────────────────────────────────────────────────

export async function getActiveMemories(): Promise<AiMemory[]> {
  return db.aiMemories.where("active").equals(1).toArray();
}

export async function getAllMemories(): Promise<AiMemory[]> {
  return db.aiMemories.toArray();
}

export async function addMemory(
  memory: Omit<AiMemory, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = Date.now();
  const id = crypto.randomUUID();
  await db.aiMemories.add({ ...memory, id, createdAt: now, updatedAt: now });
  return id;
}

export async function updateMemory(
  id: string,
  updates: Partial<AiMemory>
): Promise<void> {
  await db.aiMemories.update(id, { ...updates, updatedAt: Date.now() });
}

export async function deleteMemory(id: string): Promise<void> {
  await db.aiMemories.delete(id);
}

// ─────────────────────────────────────────────────────────
// CHAT MESSAGES
// ─────────────────────────────────────────────────────────

const CHAT_MESSAGE_LIMIT = 30;

export async function getChatMessages(): Promise<ChatMessage[]> {
  return db.chatMessages.orderBy("createdAt").toArray();
}

export async function addChatMessage(
  message: Omit<ChatMessage, "id">
): Promise<string> {
  const id = crypto.randomUUID();
  await db.chatMessages.add({ ...message, id });
  await pruneOldChatMessages();
  return id;
}

export async function pruneOldChatMessages(): Promise<void> {
  const count = await db.chatMessages.count();
  if (count > CHAT_MESSAGE_LIMIT) {
    const oldest = await db.chatMessages
      .orderBy("createdAt")
      .limit(count - CHAT_MESSAGE_LIMIT)
      .toArray();
    const ids = oldest.map((m) => m.id);
    await db.chatMessages.bulkDelete(ids);
  }
}

export async function clearChatMessages(): Promise<void> {
  await db.chatMessages.clear();
}

// ─────────────────────────────────────────────────────────
// CUSTOM EXERCISES
// ─────────────────────────────────────────────────────────

export async function getCustomExercises(): Promise<CustomExercise[]> {
  return db.customExercises.toArray();
}

export async function addCustomExercise(
  exercise: Omit<CustomExercise, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = Date.now();
  const id = crypto.randomUUID();
  await db.customExercises.add({ ...exercise, id, createdAt: now, updatedAt: now });
  return id;
}

// ─────────────────────────────────────────────────────────
// PROGRESS / STATS HELPERS
// ─────────────────────────────────────────────────────────

export async function getTotalCompletedWorkouts(): Promise<number> {
  return db.workoutSessions.where("status").equals("completed").count();
}

export async function getTotalWorkingSets(): Promise<number> {
  return db.workoutSets.where("setType").notEqual("warmup").count();
}

export async function getPersonalRecords(): Promise<
  Map<string, { weightKg: number; reps: number; estimated1RM: number }>
> {
  const records = new Map<
    string,
    { weightKg: number; reps: number; estimated1RM: number }
  >();

  const sets = await db.workoutSets
    .where("setType")
    .equals("working")
    .toArray();

  for (const set of sets) {
    if (!set.weightKg || !set.reps) continue;

    const estimated1RM = set.weightKg * (1 + set.reps / 30);
    const existing = records.get(set.exerciseId);

    if (!existing || estimated1RM > existing.estimated1RM) {
      records.set(set.exerciseId, {
        weightKg: set.weightKg,
        reps: set.reps,
        estimated1RM,
      });
    }
  }

  return records;
}

// Need to import Dexie for minKey/maxKey
import Dexie from "dexie";
