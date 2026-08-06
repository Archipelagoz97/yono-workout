"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const SPEECH_LANGUAGES = [
  { code: "en-US", label: "English" },
  { code: "id-ID", label: "Bahasa Indonesia" },
] as const;

export type SpeechLang = (typeof SPEECH_LANGUAGES)[number]["code"];

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const ctor = (w.SpeechRecognition ??
    w.webkitSpeechRecognition ??
    w.msSpeechRecognition) as SpeechRecognitionCtor | undefined;
  return ctor ?? null;
}

export function useSpeechRecognition(
  onFinal: (text: string) => void,
  lang: SpeechLang = "en-US"
) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => getSpeechRecognition() !== null);
  const [interim, setInterim] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(onFinal);

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    const ctor = getSpeechRecognition();
    if (!ctor) return;
    const rec = new ctor();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.results.length - 1; i >= 0; i--) {
        const result = e.results[i];
        const transcript = result[0]?.transcript ?? "";
        // @ts-expect-error result.isFinal is not in the minimal type
        if (result.isFinal) {
          onFinalRef.current(transcript.trim());
          setInterim("");
          return;
        }
        interimText += transcript;
      }
      setInterim(interimText);
    };

    rec.onend = () => {
      setListening(false);
      setInterim("");
    };

    rec.onerror = () => {
      setListening(false);
      setInterim("");
    };

    recRef.current = rec;
    return () => {
      rec.abort();
      recRef.current = null;
    };
  }, [lang]);

  const start = useCallback(() => {
    const rec = recRef.current;
    if (!rec || listening) return;
    setListening(true);
    setInterim("");
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }, [listening]);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  return { supported, listening, interim, start, stop };
}
