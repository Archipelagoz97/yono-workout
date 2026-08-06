// Yono Workout — Storage Utilities
// PWA storage persistence, monitoring, and status reporting.

export interface StorageStatus {
  supported: boolean;
  persisted: boolean;
  usage: number;
  quota: number;
  ratio: number;
  level: "healthy" | "review" | "warning";
  usageFormatted: string;
  quotaFormatted: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export async function getStorageStatus(): Promise<StorageStatus> {
  if (!navigator.storage?.estimate) {
    return {
      supported: false,
      persisted: false,
      usage: 0,
      quota: 0,
      ratio: 0,
      level: "healthy",
      usageFormatted: "Unknown",
      quotaFormatted: "Unknown",
    };
  }

  const [estimate, persisted] = await Promise.all([
    navigator.storage.estimate(),
    navigator.storage.persisted?.() ?? Promise.resolve(false),
  ]);

  const usage = estimate.usage ?? 0;
  const quota = estimate.quota ?? 0;
  const ratio = quota > 0 ? usage / quota : 0;

  let level: StorageStatus["level"] = "healthy";
  if (ratio > 0.8) level = "warning";
  else if (ratio > 0.6) level = "review";

  return {
    supported: true,
    persisted,
    usage,
    quota,
    ratio,
    level,
    usageFormatted: formatBytes(usage),
    quotaFormatted: formatBytes(quota),
  };
}

export async function requestStoragePersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

// Active workout state — persisted in localStorage only (tiny, non-critical)
const ACTIVE_WORKOUT_KEY = "yono_active_workout";
const THEME_KEY = "yono_theme";
const GYM_KEY = "yono_selected_gym";

export interface ActiveWorkoutState {
  sessionId: string;
  currentExerciseIndex: number;
  currentSetNumber: number;
  restTimerStartedAt?: number;
  restTimerTargetAt?: number;
  restTimerPaused?: boolean;
}

export function saveActiveWorkoutState(state: ActiveWorkoutState): void {
  try {
    localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable — non-critical
  }
}

export function getActiveWorkoutState(): ActiveWorkoutState | null {
  try {
    const raw = localStorage.getItem(ACTIVE_WORKOUT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveWorkoutState;
  } catch {
    return null;
  }
}

export function clearActiveWorkoutState(): void {
  try {
    localStorage.removeItem(ACTIVE_WORKOUT_KEY);
  } catch {
    // Non-critical
  }
}

export function getSelectedGymId(): string {
  try {
    return localStorage.getItem(GYM_KEY) ?? "ftl";
  } catch {
    return "ftl";
  }
}

export function setSelectedGymId(id: string): void {
  try {
    localStorage.setItem(GYM_KEY, id);
  } catch {
    // Non-critical
  }
}

export function getTheme(): "light" | "dark" | "system" {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === "light" || t === "dark" || t === "system") return t;
    return "system";
  } catch {
    return "system";
  }
}

export function setTheme(theme: "light" | "dark" | "system"): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Non-critical
  }
}
