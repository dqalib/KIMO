// Speaking to the child. If a professional recording of the exact text was
// pre-made (public/audio/<key>.mp3, listed in src/content/audio-manifest.json —
// see scripts/make-audio.ts) it is played; otherwise the device's own voice
// reads it via the Web Speech API (speechSynthesis).
// Works offline on iPad Safari. Safe to import on the server: nothing here
// touches `window` at module top level.

import manifest from "../content/audio-manifest.json";
import { audioKey } from "./audio-key";

const RECORDED = new Set<string>((manifest as { keys: string[] }).keys);

/** Is there a pre-made recording of this text? */
export function hasRecording(text: string): boolean {
  return RECORDED.has(audioKey(text));
}

// One <audio> element reused for every clip: on iPad, once it has played after
// a tap, later plays on the same element are allowed without another tap.
let player: HTMLAudioElement | null = null;
let stopPlayer: (() => void) | null = null;

function playRecording(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof Audio === "undefined") return resolve(false);
    player ??= new Audio();
    stopPlayer?.();
    const a = player;
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      a.onended = a.onerror = a.onpause = null;
      stopPlayer = null;
      resolve(ok);
    };
    stopPlayer = () => {
      a.pause();
      done(true);
    };
    a.onended = () => done(true);
    a.onerror = () => done(false);
    a.src = `/audio/${audioKey(text)}.mp3`;
    a.currentTime = 0;
    a.play().catch(() => done(false));
  });
}

let cachedVoice: SpeechSynthesisVoice | null = null;
let primed = false;
// Hold a reference to the utterance being spoken: Chrome can garbage-collect
// an unreferenced utterance mid-speech and then never fire `onend`.
let current: SpeechSynthesisUtterance | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (!canUseDeviceVoice()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  // Prefer en-GB (on iPad usually "Daniel" / "Kate" / "Serena"), then any en-*,
  // then whatever exists.
  const norm = (v: SpeechSynthesisVoice) => v.lang.replace("_", "-").toLowerCase();
  return (
    voices.find((v) => norm(v).startsWith("en-gb")) ??
    voices.find((v) => norm(v).startsWith("en")) ??
    voices[0]
  );
}

function canUseDeviceVoice(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function canSpeak(): boolean {
  return canUseDeviceVoice() || (typeof window !== "undefined" && typeof Audio !== "undefined" && RECORDED.size > 0);
}

/**
 * Prime the voice cache. Safari loads voices asynchronously and fires
 * `voiceschanged` when they arrive, so call this once from a client
 * component mount before the first speak().
 */
export function primeVoices(): void {
  if (!canUseDeviceVoice() || primed) return;
  primed = true;
  cachedVoice = pickVoice();
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    cachedVoice = pickVoice();
  });
}

/**
 * Speak `text` and resolve when finished (also resolves on error / no support).
 * Cancels anything currently speaking first. Default rate 0.85 — slower, for
 * young children.
 */
export async function speak(text: string, opts?: { rate?: number }): Promise<void> {
  if (hasRecording(text)) {
    if (canUseDeviceVoice()) window.speechSynthesis.cancel();
    // Fall back to the device voice if the file can't be played (e.g. offline).
    if (await playRecording(text)) return;
  }
  return speakWithDevice(text, opts);
}

function speakWithDevice(text: string, opts?: { rate?: number }): Promise<void> {
  return new Promise((resolve) => {
    if (!canUseDeviceVoice()) {
      resolve();
      return;
    }
    stopPlayer?.();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-GB";
    u.rate = opts?.rate ?? 0.85;
    const voice = cachedVoice ?? pickVoice();
    if (voice) u.voice = voice;
    // iOS Safari sometimes never fires `onend`; a watchdog (generous estimate of
    // the speaking time) makes sure the promise always settles, so buttons
    // don't stay stuck in their "speaking" state.
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(watchdog);
      if (current === u) current = null;
      resolve();
    };
    const watchdog = setTimeout(finish, 2000 + (text.length * 120) / u.rate);
    u.onend = finish;
    u.onerror = finish;
    current = u;
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking(): void {
  stopPlayer?.();
  if (canUseDeviceVoice()) window.speechSynthesis.cancel();
}
