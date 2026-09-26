// Every sentence the app speaks gets a stable file name, so pre-made audio
// (public/audio/<key>.mp3, made by scripts/make-audio.ts) can be looked up
// from the text alone. Works the same in the browser and in Node.

/** Tidy text so tiny spacing differences don't make a different file. */
export function normaliseSpeech(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** 64-bit FNV-1a hash of the tidied text, as 16 hex characters. */
export function audioKey(text: string): string {
  const s = normaliseSpeech(text);
  // Two independent 32-bit FNV-1a passes (different offsets) → 64 bits.
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ 0x9e3779b9;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x01000193) >>> 0;
    h2 = (h2 ^ (h2 >>> 13)) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}
