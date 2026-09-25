// Text-to-speech via the browser's Web Speech API (speechSynthesis).
// Works offline on iPad Safari. Safe to import on the server: nothing here
// touches `window` at module top level.

let cachedVoice: SpeechSynthesisVoice | null = null;
let primed = false;
// Hold a reference to the utterance being spoken: Chrome can garbage-collect
// an unreferenced utterance mid-speech and then never fire `onend`.
let current: SpeechSynthesisUtterance | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (!canSpeak()) return null;
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

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Prime the voice cache. Safari loads voices asynchronously and fires
 * `voiceschanged` when they arrive, so call this once from a client
 * component mount before the first speak().
 */
export function primeVoices(): void {
  if (!canSpeak() || primed) return;
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
export function speak(text: string, opts?: { rate?: number }): Promise<void> {
  return new Promise((resolve) => {
    if (!canSpeak()) {
      resolve();
      return;
    }
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
  if (canSpeak()) window.speechSynthesis.cancel();
}
