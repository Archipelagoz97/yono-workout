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
