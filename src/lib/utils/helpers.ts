// Yono Workout — General utilities
// Complements shadcn's lib/utils.ts

/**
 * Format a duration in seconds to a human-readable string.
 * E.g., 90 → "1:30", 3600 → "1h 0m"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

/**
 * Format a weight for display.
 */
export function formatWeight(
  kg: number | null | undefined,
  unit: "kg" = "kg",
  includeUnit = true
): string {
  if (kg == null) return includeUnit ? "BW" : "0";
  const formatted = kg % 1 === 0 ? kg.toString() : kg.toFixed(1);
  return includeUnit ? `${formatted} kg` : formatted;
}

/**
 * Get relative time string.
 * E.g., "today", "yesterday", "3 days ago"
 */
export function getRelativeTime(timestamp: number): string {
  const dayMs = 1000 * 60 * 60 * 24;
  const diff = Date.now() - timestamp;
  const days = Math.floor(diff / dayMs);

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

/**
 * Truncate text to a maximum length.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

/**
 * Generate a short readable session ID for display (not crypto).
 */
export function shortId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Round to the nearest plate increment (0.25, 1.25, 2.5, 5).
 */
export function roundToPlate(kg: number, increment: 0.25 | 1.25 | 2.5 | 5 = 1.25): number {
  return Math.round(kg / increment) * increment;
}
