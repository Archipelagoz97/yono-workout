// Shared message-building for the coach endpoint (JSON + streaming variants).
import { z } from "zod";
import { CoachRequestSchema } from "@/lib/ai/schemas";

type CoachRequest = z.infer<typeof CoachRequestSchema>;

export interface CoachMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function buildCoachMessages(
  data: CoachRequest,
  systemPrompt: string
): CoachMessage[] {
  const messages: CoachMessage[] = [
    { role: "system", content: systemPrompt },
  ];

  if (data.chatSummary) {
    messages.push({
      role: "system",
      content: "Conversation summary so far: " + data.chatSummary,
    });
  }

  if (data.activeSession) {
    messages.push({
      role: "system",
      content: "Active workout: " + data.activeSession.name,
    });
  }

  if (data.exerciseContext && data.exerciseContext.length > 0) {
    messages.push({
      role: "system",
      content: "Relevant exercise history: " + JSON.stringify(data.exerciseContext),
    });
  }

  if (data.recentSessions && data.recentSessions.length > 0) {
    const historyStr = data.recentSessions
      .map((s) => {
        const date = new Date(s.completedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        const exStr = s.exercises
          .map((e) => {
            if (!e.sets.length) return `  - ${e.exerciseId}: no sets logged`;
            const setsStr = e.sets
              .slice(0, 3)
              .map(
                (st) =>
                  `${st.weightKg ?? "BW"}kg x ${st.reps ?? "?"}${
                    st.rpe != null ? ` (RPE ${st.rpe})` : ""
                  }`
              )
              .join(", ");
            const total = e.sets.length;
            return `  - ${e.exerciseId}: ${setsStr}${total > 3 ? ` +${total - 3} more` : ""}`;
          })
          .join("\n");
        return `- ${s.name} (${date}, focus: ${s.focus.join(", ") || "general"}):\n${exStr}`;
      })
      .join("\n");
    messages.push({
      role: "system",
      content: `Recent workout history (last ${data.recentSessions.length} completed sessions):\n${historyStr}`,
    });
  }

  if (data.muscleRecovery && data.muscleRecovery.length > 0) {
    const recoveryStr = data.muscleRecovery
      .map((r) => `- ${r.label}: ${r.pct}% recovered (${r.status})`)
      .join("\n");
    messages.push({
      role: "system",
      content: `Current muscle recovery (percent recovered):\n${recoveryStr}\n\nWhen suggesting a workout or answering about what to train today, prefer muscle groups at 100% recovery and avoid groups below 60%.`,
    });
  }

  if (data.memories.length > 0) {
    const memoriesStr = data.memories
      .map((m: unknown) => (m as { content: string }).content)
      .join("; ");
    messages.push({
      role: "system",
      content: "What Yono remembers: " + memoriesStr,
    });
  }

  const recentHistory = data.chatHistory.slice(-10);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  messages.push({ role: "user", content: data.message });

  return messages;
}
