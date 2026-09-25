"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { canSpeak, primeVoices, speak, stopSpeaking } from "@/lib/speech";

interface Props {
  text: string;
  label?: string;
  /**
   * Speak as soon as the button mounts. NOTE: iOS only allows speech after a
   * user gesture, so autoPlay must only be used once the child has already
   * tapped something on that page (e.g. right after they tapped "next").
   */
  autoPlay?: boolean;
  size?: "md" | "lg";
}

// Speech support is only known in the browser. Reading it this way keeps the
// server render and the first browser render identical (no hydration error).
const noop = () => () => {};
function useCanSpeak() {
  return useSyncExternalStore(noop, canSpeak, () => false);
}

export default function SpeakButton({ text, label = "Hear it", autoPlay, size = "md" }: Props) {
  const [speaking, setSpeaking] = useState(false);
  const supported = useCanSpeak();
  const mounted = useRef(true);

  useEffect(() => {
    primeVoices();
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (!autoPlay) return;
    const t = setTimeout(() => setSpeaking(true), 0);
    speak(text).then(() => {
      if (mounted.current) setSpeaking(false);
    });
    return () => clearTimeout(t);
  }, [autoPlay, text]);

  // No speech support (older browser / SSR) — render nothing.
  if (!supported) return null;

  const dims = size === "lg" ? "h-20 w-20 text-4xl" : "h-14 w-14 text-2xl";

  async function onTap() {
    setSpeaking(true);
    await speak(text);
    if (mounted.current) setSpeaking(false);
  }

  return (
    <span className="inline-flex items-center gap-3">
      <button
        type="button"
        aria-label={`${label}: ${text}`}
        onClick={onTap}
        className={`${dims} rounded-full bg-brand text-white shadow-[0_4px_0_#1d4ed8] active:translate-y-1 active:shadow-none transition-all ${
          speaking ? "animate-pulse" : ""
        }`}
      >
        🔊
      </button>
      <span className="text-muted font-semibold">{label}</span>
    </span>
  );
}
