// Text-to-speech via the browser's Web Speech API (speechSynthesis).
// Works offline on iPad Safari. Safe to import on the server: nothing here
// touches `window` at module top level.

let cachedVoice: SpeechSynthesisVoice | null = null;
let primed = false;

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
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}
