"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SendIcon, BrainIcon, TrashIcon, MicIcon, StopCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { YonoAnimation, type YonoState } from "@/components/yono/YonoAnimation";
import { useSpeechRecognition, SPEECH_LANGUAGES, type SpeechLang } from "@/lib/speech";
import db from "@/db/database";
import { useLiveQuery } from "dexie-react-hooks";
import { getCopy } from "@/data/yono-copy";
import { getMuscleRecoveryRows } from "@/lib/recovery";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

export default function CoachPage() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [yonoState, setYonoState] = useState<YonoState>("idle");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Voice input
  const [speechLang, setSpeechLang] = useState<SpeechLang>("en-US");
  const { supported: speechSupported, listening, interim, start, stop } =
    useSpeechRecognition(
      (text) => {
        setInput((prev) => {
          const base = prev.trim();
          return base ? `${base} ${text}` : text;
        });
      },
      speechLang
    );

  // Load stored messages
  const storedMessages = useLiveQuery(
    () => db.chatMessages.orderBy("createdAt").toArray(),
    []
  );
  const memories = useLiveQuery(
    () => db.aiMemories.where("active").equals(1).toArray(),
    []
  );

  // Sync stored messages to local state on first load
  useEffect(() => {
    if (storedMessages && localMessages.length === 0 && storedMessages.length > 0) {
      setLocalMessages(storedMessages as Message[]);
    }
  }, [storedMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [localMessages, streamingContent]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setYonoState("thinking");
    setIsLoading(true);
    setStreamingContent("");

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };

    setLocalMessages((prev) => [...prev, userMsg]);

    // Save user message to IndexedDB
    await db.chatMessages.add({
      id: userMsg.id,
      role: "user",
      content: text,
      createdAt: userMsg.createdAt,
    });

    const assistantId = crypto.randomUUID();

    try {
      // Get recent sessions for context
      const [recentSessions, activeSession] = await Promise.all([
        db.workoutSessions
          .where("status")
          .equals("completed")
          .reverse()
          .sortBy("completedAt")
          .then((s) => s.slice(0, 8)),
        db.workoutSessions.where("status").equals("active").first(),
      ]);

      // Build a rich history payload: session + exercises + sets
      const recentSessionsContext = await Promise.all(
        recentSessions.slice(0, 5).map(async (s) => {
          const sessionExercises = await db.sessionExercises
            .where("sessionId")
            .equals(s.id)
            .toArray();
          const exercisesWithSets = await Promise.all(
            sessionExercises.map(async (ex) => {
              const sets = await db.workoutSets
                .where("sessionExerciseId")
                .equals(ex.id)
                .toArray();
              return {
                exerciseId: ex.exerciseId,
                sets: sets.map((set) => ({
                  weightKg: set.weightKg,
                  reps: set.reps,
                  rpe: set.rpe,
                })),
              };
            })
          );
          return {
            name: s.name,
            focus: s.focus,
            completedAt: s.completedAt ?? s.updatedAt,
            exercises: exercisesWithSets,
          };
        })
      );

      const chatSummaryRecord = await db.chatSummaries.get("main-coach-summary");

      // Muscle recovery so Yono knows which muscles are ready to train today.
      const allSets = await db.workoutSets.toArray();
      const muscleRecovery = getMuscleRecoveryRows(allSets, Date.now()).map(
        ({ label, pct, status }) => ({ label, pct, status })
      );

      // Recent messages for context (last 8)
      const recentMessages = localMessages
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const requestBody = {
        message: text,
        chatHistory: recentMessages,
        chatSummary: chatSummaryRecord?.summary,
        activeSession: activeSession
          ? { name: activeSession.name, exercises: [], completedSets: [] }
          : undefined,
        memories: memories ?? [],
        exerciseContext: [],
        muscleRecovery,
        recentSessions: recentSessionsContext,
      };

      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch("/api/ai/coach/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Coach error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const ev of events) {
          for (const line of ev.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();

            let json: { delta?: string; error?: string; done?: boolean };
            try {
              json = JSON.parse(payload);
            } catch {
              continue;
            }

            if (json.error) throw new Error(json.error);
            if (json.delta) {
              fullText += json.delta;
              setStreamingContent(fullText);
            }
          }
        }
      }

      if (!fullText.trim()) {
        throw new Error("Empty response");
      }

      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: fullText,
        createdAt: Date.now(),
      };

      setLocalMessages((prev) => [...prev, assistantMsg]);
      setStreamingContent(null);
      setYonoState("idle");

      // Save assistant message
      await db.chatMessages.add({
        id: assistantId,
        role: "assistant",
        content: fullText,
        createdAt: assistantMsg.createdAt,
      });

      // Prune old messages (keep last 30)
      const count = await db.chatMessages.count();
      if (count > 30) {
        const oldest = await db.chatMessages
          .orderBy("createdAt")
          .limit(count - 30)
          .toArray();
        await db.chatMessages.bulkDelete(oldest.map((m) => m.id));
      }
    } catch (err) {
      const isOffline = !navigator.onLine;
      const errorContent = isOffline
        ? getCopy("offline")
        : "Yono couldn't respond right now. Try again in a moment.";

      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: errorContent,
        createdAt: Date.now(),
      };

      setLocalMessages((prev) => [...prev, errorMsg]);
      setStreamingContent(null);
      setYonoState("error");
      setTimeout(() => setYonoState("idle"), 2000);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  const handleClearChat = async () => {
    abortRef.current?.abort();
    await db.chatMessages.clear();
    setLocalMessages([]);
    setStreamingContent(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const streaming = streamingContent !== null;

  return (
    <div className="flex flex-col h-dvh bg-background content-with-nav">
      {/* Header */}
      <div className="px-4 pt-12 pb-3 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <YonoAnimation
              state={yonoState}
              size={48}
              className="shrink-0"
            />
            <div>
              <h1 className="text-lg font-display font-bold text-foreground">Coach Yono</h1>
              <p className="text-xs text-muted-foreground">
                {isLoading ? "Thinking..." : "Ask about your training"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {memories && memories.length > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <BrainIcon className="w-3 h-3" />
                {memories.length} memories
              </Badge>
            )}
            {localMessages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                id="btn-clear-chat"
                aria-label="Clear chat"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        id="chat-messages"
      >
        {localMessages.length === 0 && !streaming && (
          <div className="text-center py-12">
            <YonoAnimation state="greeting" size={100} className="mx-auto" />
            <h2 className="text-lg font-display font-semibold text-foreground mt-4">
              {getCopy("greeting")}
            </h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">
              Ask about your workout history, technique, exercise selection, or anything fitness-related.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {[
                "What did I lift last week?",
                "Recommend a back exercise",
                "Should I increase my lat pulldown weight?",
                "What's my strongest lift?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-3 py-2 bg-card border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {localMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={msg.role === "user" ? { opacity: 0, x: 20 } : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={msg.role === "user" ? { opacity: 0, x: 20 } : { opacity: 0, x: -20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 shrink-0 mr-2 mt-1">
                  <YonoAnimation state="idle" size={28} />
                </div>
              )}
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border border-border text-foreground rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Streaming response bubble */}
        {streaming && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex justify-start"
          >
            <div className="w-7 h-7 shrink-0 mr-2 mt-1">
              <YonoAnimation state="thinking" size={28} />
            </div>
            <div className="max-w-[80%] bg-card border border-border px-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground">
              {streamingContent}
              {streamingContent && streamingContent.length === 0 && (
                <span className="inline-flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      className="w-1.5 h-1.5 bg-muted-foreground rounded-full inline-block"
                    />
                  ))}
                </span>
              )}
              {streamingContent && streamingContent.length > 0 && (
                <span className="inline-block w-1.5 h-4 bg-primary/70 animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-border bg-background/95 backdrop-blur-sm">
        {listening && (
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <span className="text-xs text-muted-foreground">
                Listening ({speechLang === "en-US" ? "English" : "Bahasa Indonesia"})…
              </span>
            </div>
            {interim && (
              <span className="text-xs italic text-muted-foreground truncate max-w-[60%]">
                {interim}
              </span>
            )}
          </div>
        )}
        <div className="flex gap-2">
          {speechSupported && (
            <>
              <Button
                id="btn-voice-coach"
                onClick={() => (listening ? stop() : start())}
                disabled={isLoading}
                size="icon"
                className={`h-11 w-11 rounded-2xl shrink-0 ${
                  listening ? "bg-red-500 hover:bg-red-600 text-white" : ""
                }`}
                aria-label={listening ? "Stop voice input" : "Start voice input"}
              >
                {listening ? (
                  <StopCircleIcon className="w-5 h-5" />
                ) : (
                  <MicIcon className="w-5 h-5" />
                )}
              </Button>
              <Button
                id="btn-voice-lang"
                onClick={() =>
                  setSpeechLang((prev) =>
                    prev === "en-US" ? "id-ID" : "en-US"
                  )
                }
                disabled={isLoading}
                size="icon"
                variant="ghost"
                className="h-11 w-11 rounded-2xl shrink-0 border border-border text-xs font-semibold"
                title="Voice language"
                aria-label="Toggle voice input language"
              >
                {speechLang === "en-US" ? "EN" : "ID"}
              </Button>
            </>
          )}
          <Input
            ref={inputRef}
            id="coach-input"
            placeholder="Ask Yono..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1 rounded-2xl h-11"
          />
          <Button
            id="btn-send-coach"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-11 w-11 rounded-2xl shrink-0"
          >
            <SendIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
