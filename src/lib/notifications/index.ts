// Yono Workout — Local Notification Utilities
// Vibration + sound alerts for in-gym feedback. No external files needed.

let audioContext: AudioContext | null = null;

/**
 * Unlock the Web Audio context. Must be called from a user gesture
 * (tap/click) for iOS Safari to allow audio playback later.
 */
export function unlockAudio(): void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    if (!audioContext) audioContext = new Ctx();
    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }
  } catch {
    // Audio unavailable — ignore
  }
}

/**
 * Play a short dual-tone chime using the Web Audio API.
 */
export function playChime(): void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    if (!audioContext) audioContext = new Ctx();
    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    const ctx = audioContext;
    const now = ctx.currentTime;

    const notes = [
      { freq: 880, at: 0, dur: 0.18 },
      { freq: 1320, at: 0.2, dur: 0.28 },
    ];

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = note.freq;
      gain.gain.setValueAtTime(0.0001, now + note.at);
      gain.gain.exponentialRampToValueAtTime(0.4, now + note.at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.at + note.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + note.at);
      osc.stop(now + note.at + note.dur + 0.05);
    }
  } catch {
    // Audio playback failed — ignore
  }
}

/**
 * Vibrate the device if supported (pattern = 3 pulses).
 */
export function vibrate(): void {
  try {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }
  } catch {
    // Vibration unavailable — ignore
  }
}

/**
 * Full rest-timer-complete alert: sound + vibration.
 */
export function notifyRestComplete(): void {
  playChime();
  vibrate();
}

const WORKOUT_REMINDER_KEY = "yono:last-workout-reminder-day";

/**
 * Ask for permission, then fire the once-a-day workout reminder.
 * The permission prompt is only shown on the first request.
 * Call from a user gesture (button tap) so browsers allow the prompt.
 */
export async function requestWorkoutDayReminder(focusLabels: string[]): Promise<void> {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (window.Notification.permission === "default") {
      const result = await window.Notification.requestPermission();
      if (result !== "granted") return;
    }
    notifyWorkoutDay(focusLabels);
  } catch {
    // Notifications unavailable — ignore
  }
}
  /**
 * Show a one-per-day system notification when it's a planned training day.
 * No-ops when notification permission is not granted.
 */
export function notifyWorkoutDay(focusLabels: string[]): void {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (window.Notification.permission !== "granted") return;

    const today = new Date().toDateString();
    if (localStorage.getItem(WORKOUT_REMINDER_KEY) === today) return;
    localStorage.setItem(WORKOUT_REMINDER_KEY, today);

    const focus = focusLabels.length
      ? ` Today: ${focusLabels.join(" + ")}.`
      : "";
    const n = new window.Notification("Yono — training day 🏋️", {
      body: `Time to hit the gym.${focus}`,
      tag: "yono-workout-day",
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // Notifications unavailable — ignore
  }
}
