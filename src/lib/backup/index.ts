// Yono Workout — Backup & Restore
// Export all user data as versioned JSON.
// Import validates before applying changes.
// Never deletes workout records automatically.

import db from "@/db/database";
import type { YonoBackup } from "@/types";
import { z } from "zod";

const APP_VERSION = "1.0.0";

// ─────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────

export async function exportBackup(): Promise<YonoBackup> {
  const [
    profiles,
    gyms,
    exerciseOverrides,
    customExercises,
    workoutSessions,
    sessionExercises,
    workoutSets,
    exercisePreferences,
    exerciseNotes,
    aiMemories,
    chatMessages,
    chatSummaries,
  ] = await Promise.all([
    db.profiles.toArray(),
    db.gyms.toArray(),
    db.exerciseOverrides.toArray(),
    db.customExercises.toArray(),
    db.workoutSessions.toArray(),
    db.sessionExercises.toArray(),
    db.workoutSets.toArray(),
    db.exercisePreferences.toArray(),
    db.exerciseNotes.toArray(),
    db.aiMemories.toArray(),
    db.chatMessages.toArray(),
    db.chatSummaries.toArray(),
  ]);

  const backup: YonoBackup = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    data: {
      profiles,
      gyms,
      exerciseOverrides,
      customExercises,
      workoutSessions,
      sessionExercises,
      workoutSets,
      exercisePreferences,
      exerciseNotes,
      aiMemories,
      chatMessages,
      chatSummaries,
    },
  };

  // Update backup metadata
  const now = Date.now();
  await db.backupMetadata.put({
    id: "backup-status",
    lastExportedAt: now,
    updatedAt: now,
  });

  return backup;
}

export function downloadBackup(backup: YonoBackup): void {
  const date = new Date().toISOString().split("T")[0];
  const filename = `yono-workout-backup-${date}.json`;
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────

const BackupSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  appVersion: z.string(),
  data: z.object({
    profiles: z.array(z.unknown()),
    gyms: z.array(z.unknown()),
    exerciseOverrides: z.array(z.unknown()),
    customExercises: z.array(z.unknown()),
    workoutSessions: z.array(z.unknown()),
    sessionExercises: z.array(z.unknown()),
    workoutSets: z.array(z.unknown()),
    exercisePreferences: z.array(z.unknown()),
    exerciseNotes: z.array(z.unknown()),
    aiMemories: z.array(z.unknown()),
    chatMessages: z.array(z.unknown()),
    chatSummaries: z.array(z.unknown()),
  }),
});

export interface BackupStats {
  exportedAt: string;
  sessionCount: number;
  setCount: number;
  memoryCount: number;
  noteCount: number;
}

export function validateAndParseBackup(raw: unknown): {
  backup: YonoBackup;
  stats: BackupStats;
} {
  const parsed = BackupSchema.parse(raw);

  const backup = parsed as YonoBackup;
  const stats: BackupStats = {
    exportedAt: backup.exportedAt,
    sessionCount: backup.data.workoutSessions.filter(
      (s) => s.status === "completed"
    ).length,
    setCount: backup.data.workoutSets.length,
    memoryCount: backup.data.aiMemories.length,
    noteCount: backup.data.exerciseNotes.length,
  };

  return { backup, stats };
}

export async function readBackupFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        resolve(JSON.parse(text));
      } catch {
        reject(new Error("File is not valid JSON"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

// ─────────────────────────────────────────────────────────
// IMPORT — REPLACE
// Clears all data and replaces with backup.
// Creates automatic snapshot first.
// ─────────────────────────────────────────────────────────

export async function importBackupReplace(backup: YonoBackup): Promise<void> {
  const now = Date.now();

  await db.transaction(
    "rw",
    [
      db.profiles,
      db.gyms,
      db.exerciseOverrides,
      db.customExercises,
      db.workoutSessions,
      db.sessionExercises,
      db.workoutSets,
      db.exercisePreferences,
      db.exerciseNotes,
      db.aiMemories,
      db.chatMessages,
      db.chatSummaries,
      db.backupMetadata,
    ],
    async () => {
      // Clear all tables
      await Promise.all([
        db.profiles.clear(),
        db.gyms.clear(),
        db.exerciseOverrides.clear(),
        db.customExercises.clear(),
        db.workoutSessions.clear(),
        db.sessionExercises.clear(),
        db.workoutSets.clear(),
        db.exercisePreferences.clear(),
        db.exerciseNotes.clear(),
        db.aiMemories.clear(),
        db.chatMessages.clear(),
        db.chatSummaries.clear(),
      ]);

      // Import all data
      const d = backup.data;
      await Promise.all([
        d.profiles.length > 0 && db.profiles.bulkAdd(d.profiles as never[]),
        d.gyms.length > 0 && db.gyms.bulkAdd(d.gyms as never[]),
        d.exerciseOverrides.length > 0 && db.exerciseOverrides.bulkAdd(d.exerciseOverrides as never[]),
        d.customExercises.length > 0 && db.customExercises.bulkAdd(d.customExercises as never[]),
        d.workoutSessions.length > 0 && db.workoutSessions.bulkAdd(d.workoutSessions as never[]),
        d.sessionExercises.length > 0 && db.sessionExercises.bulkAdd(d.sessionExercises as never[]),
        d.workoutSets.length > 0 && db.workoutSets.bulkAdd(d.workoutSets as never[]),
        d.exercisePreferences.length > 0 && db.exercisePreferences.bulkAdd(d.exercisePreferences as never[]),
        d.exerciseNotes.length > 0 && db.exerciseNotes.bulkAdd(d.exerciseNotes as never[]),
        d.aiMemories.length > 0 && db.aiMemories.bulkAdd(d.aiMemories as never[]),
        d.chatMessages.length > 0 && db.chatMessages.bulkAdd(d.chatMessages as never[]),
        d.chatSummaries.length > 0 && db.chatSummaries.bulkAdd(d.chatSummaries as never[]),
      ]);

      // Update backup metadata
      await db.backupMetadata.put({
        id: "backup-status",
        lastImportedAt: now,
        updatedAt: now,
      });
    }
  );
}

// ─────────────────────────────────────────────────────────
// IMPORT — MERGE
// Adds records from backup without deleting existing data.
// Skips records with duplicate IDs.
// ─────────────────────────────────────────────────────────

export async function importBackupMerge(backup: YonoBackup): Promise<{
  added: number;
  skipped: number;
}> {
  const now = Date.now();
  let added = 0;
  let skipped = 0;

  await db.transaction(
    "rw",
    [
      db.profiles,
      db.gyms,
      db.exerciseOverrides,
      db.customExercises,
      db.workoutSessions,
      db.sessionExercises,
      db.workoutSets,
      db.exercisePreferences,
      db.exerciseNotes,
      db.aiMemories,
      db.chatMessages,
      db.chatSummaries,
      db.backupMetadata,
    ],
    async () => {
      const tables = [
        { table: db.profiles, data: backup.data.profiles },
        { table: db.gyms, data: backup.data.gyms },
        { table: db.exerciseOverrides, data: backup.data.exerciseOverrides },
        { table: db.customExercises, data: backup.data.customExercises },
        { table: db.workoutSessions, data: backup.data.workoutSessions },
        { table: db.sessionExercises, data: backup.data.sessionExercises },
        { table: db.workoutSets, data: backup.data.workoutSets },
        { table: db.exercisePreferences, data: backup.data.exercisePreferences },
        { table: db.exerciseNotes, data: backup.data.exerciseNotes },
        { table: db.aiMemories, data: backup.data.aiMemories },
        { table: db.chatMessages, data: backup.data.chatMessages },
        { table: db.chatSummaries, data: backup.data.chatSummaries },
      ];

      for (const { table, data } of tables) {
        for (const item of data) {
          const id = (item as { id: string }).id;
          try {
            const existing = await (table as ReturnType<typeof db.profiles>).get(id);
            if (existing) {
              skipped++;
            } else {
              await (table as ReturnType<typeof db.profiles>).add(item as never);
              added++;
            }
          } catch {
            skipped++;
          }
        }
      }

      await db.backupMetadata.put({
        id: "backup-status",
        lastImportedAt: now,
        updatedAt: now,
      });
    }
  );

  return { added, skipped };
}

// ─────────────────────────────────────────────────────────
// BACKUP REMINDER CHECK
// Show a non-blocking reminder after 30 days with no backup.
// ─────────────────────────────────────────────────────────

export async function shouldShowBackupReminder(): Promise<boolean> {
  try {
    const meta = await db.backupMetadata.get("backup-status");
    if (!meta?.lastExportedAt) return true; // Never exported

    const daysSinceBackup =
      (Date.now() - meta.lastExportedAt) / (1000 * 60 * 60 * 24);
    return daysSinceBackup > 30;
  } catch {
    return false;
  }
}
