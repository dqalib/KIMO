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

// ---- choosing the device's British voice ---------------------------------------
// Used only for things without a pre-made recording. Never an American voice:
// if the device has no British voice we leave the choice to the device with
// lang "en-GB" rather than pick a US one.

/** iPad / Mac novelty voices that are labelled en-GB but aren't suitable. */
const NOVELTY =
  /^(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|kathy|ralph|eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley)\b/i;
/** Natural British voices, best first (iPad, Chrome, Windows). */
const PREFERRED = ["serena", "kate", "stephanie", "martha", "daniel", "arthur", "oliver", "google uk english female", "google uk english male", "microsoft sonia", "microsoft libby", "microsoft ryan", "microsoft hazel", "microsoft george", "microsoft susan"];

const VOICE_PREF_KEY = "kimo:voice";

export function isBritishVoice(v: Pick<SpeechSynthesisVoice, "lang" | "name">): boolean {
  const lang = v.lang.replace("_", "-").toLowerCase();
  return lang.startsWith("en-gb") || /\b(uk|british|united kingdom)\b/i.test(v.name);
}

/** Higher = better. Exported for tests. */
export function voiceScore(v: Pick<SpeechSynthesisVoice, "lang" | "name">): number {
  if (!isBritishVoice(v)) return -1;
  const name = v.name.toLowerCase();
  let score = 1000;
  if (NOVELTY.test(v.name)) score -= 900;
  if (/enhanced|premium|natural|neural/.test(name)) score += 200;
  const i = PREFERRED.findIndex((p) => name.startsWith(p));
  if (i >= 0) score += 100 - i;
  return score;
}

/** British voices on this device, best first (for the grown-ups' voice picker). */
export function britishVoices(): SpeechSynthesisVoice[] {
  if (!canUseDeviceVoice()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter(isBritishVoice)
    .sort((a, b) => voiceScore(b) - voiceScore(a));
}

export function preferredVoiceName(): string | null {
  try {
    return window.localStorage.getItem(VOICE_PREF_KEY);
  } catch {
    return null;
  }
}

/** Remember a voice for this device (null = choose automatically). */
export function setPreferredVoice(name: string | null): void {
  try {
    if (name) window.localStorage.setItem(VOICE_PREF_KEY, name);
    else window.localStorage.removeItem(VOICE_PREF_KEY);
  } catch {
    // storage blocked — automatic choice still works
  }
  cachedVoice = pickVoice();
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!canUseDeviceVoice()) return null;
  const voices = britishVoices();
  if (voices.length === 0) return null;
  const chosen = preferredVoiceName();
  // A grown-up's choice always wins; otherwise the best natural British voice (never a novelty one).
  return voices.find((v) => v.name === chosen) ?? (voiceScore(voices[0]) >= 1000 ? voices[0] : null);
}

/** The voice the device will use when there's no recording (null = device default for en-GB). */
export function currentDeviceVoice(): SpeechSynthesisVoice | null {
  return cachedVoice ?? pickVoice();
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

/** Always use the device voice (the grown-ups' "test voice" button). */
export function speakWithDevice(text: string, opts?: { rate?: number }): Promise<void> {
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
    // Voices can arrive late on iPad — look again if none was found yet.
    const voice = cachedVoice ?? (cachedVoice = pickVoice());
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    }
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

/** Say maths symbols as words, so the voice reads "6 × 3" as "6 times 3". */
export function spokenMaths(prompt: string): string {
  return prompt
    .replace(/×/g, " times ")
    .replace(/÷/g, " divided by ")
    .replace(/\s[−-]\s/g, " take away ")
    .replace(/\+/g, " add ")
    .replace(/=/g, " equals ")
    .replace(/(\d+)\/(\d+)/g, "$1 over $2")
    .replace(/\s+/g, " ")
    .trim();
}
