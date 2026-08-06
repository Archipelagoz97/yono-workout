// Yono Workout — Yono Copy Bank
// Short messages shown during workout events.
// Only show these in appropriate contexts.
// NEVER show humorous copy during: pain, errors, data loss, failed backup.

export type CopyCategory =
  | "set_complete"
  | "rest"
  | "leg_day"
  | "personal_record"
  | "workout_complete"
  | "greeting"
  | "thinking"
  | "offline"
  | "generating";

const copyBank: Record<CopyCategory, string[]> = {
  set_complete: [
    "Set saved. Yono approves.",
    "One set closer.",
    "Back muscles have entered the chat.",
    "Yono saw that.",
    "That counted.",
    "Rep acquired.",
    "Noted.",
    "Solid.",
    "Logged.",
    "Nice work.",
    "Keep going.",
  ],
  rest: [
    "Resting is part of the program.",
    "Yono is temporarily unavailable.",
    "Hydration meeting in progress.",
    "Next set pending.",
    "One more set. Allegedly.",
    "Rest now. Regret later. Just kidding.",
    "Yono is plotting the next set.",
    "Brief intermission.",
    "Loading next set...",
    "Recovery protocol initiated.",
  ],
  leg_day: [
    "Leg day detected. Condolences.",
    "Yono regrets nothing.",
    "Walking tomorrow remains optional.",
    "Quads have been notified.",
    "Your future self is already annoyed.",
    "Legs: the sequel.",
  ],
  personal_record: [
    "New record. Yono is impressed.",
    "Stronger than last time.",
    "Officially heavier.",
    "Yono requests a celebration snack.",
    "Personal best. It's in the log now.",
    "New PR. This is real. It happened.",
    "Record broken. Yono witnessed it.",
  ],
  workout_complete: [
    "Workout complete.",
    "Yono has left the gym emotionally.",
    "Logged, saved, survived.",
    "Yono requires snacks.",
    "That's a wrap.",
    "Done. All sets counted.",
    "Yono clocked out.",
    "Mission accomplished.",
  ],
  greeting: [
    "What are we training today?",
    "Ready when you are.",
    "Yono is awake and caffeinated.",
    "Let's see what we've got today.",
    "Good to see you. What's the plan?",
  ],
  thinking: [
    "Yono is thinking...",
    "Consulting the training algorithm...",
    "Building your workout...",
    "Checking your history...",
    "One moment...",
  ],
  offline: [
    "Yono can't reach the AI right now.",
    "Working offline. AI is unavailable.",
    "Offline mode active. Logging still works.",
    "No internet? No problem for logging.",
  ],
  generating: [
    "Generating a workout for you...",
    "Yono is designing today's session...",
    "Building your program...",
    "One moment while Yono prepares...",
  ],
};

/**
 * Get a random message for a given category.
 * Returns undefined occasionally to avoid overuse.
 */
export function getRandomCopy(
  category: CopyCategory,
  alwaysReturn = false
): string | undefined {
  // Don't show copy 40% of the time (unless forced)
  if (!alwaysReturn && Math.random() < 0.4) return undefined;

  const messages = copyBank[category];
  if (!messages || messages.length === 0) return undefined;

  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Always return a message from the given category.
 */
export function getCopy(category: CopyCategory): string {
  const messages = copyBank[category];
  return messages[Math.floor(Math.random() * messages.length)];
}

export { copyBank };
