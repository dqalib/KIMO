// Tiny right / wrong sounds, made in the browser (no audio files).
// iPad only lets a page make sound after a tap, so the sound engine is
// switched on at the first touch anywhere on the page.

let ctx: AudioContext | null = null;
let armed = false;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Call once from a client component; unlocks sound on the first tap. */
export function armSfx() {
  if (armed || typeof window === "undefined") return;
  armed = true;
  const unlock = () => {
    const c = context();
    if (c) {
      // A silent blip inside the tap is what iOS needs to allow later sounds.
      const o = c.createOscillator();
      const g = c.createGain();
      g.gain.value = 0;
      o.connect(g).connect(c.destination);
      o.start();
      o.stop(c.currentTime + 0.01);
    }
  };
  window.addEventListener("pointerdown", unlock, { once: true, capture: true });
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, vol: number) {
  const c = context();
  if (!c) return;
  const t = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** Bright two-note "ding-ding". */
export function playRight() {
  try {
    tone(784, 0, 0.18, "sine", 0.25); // G5
    tone(1175, 0.11, 0.3, "sine", 0.25); // D6
  } catch {
    // sound is a nice-to-have
  }
}

/** Soft low "bonk" — clear but not scary. */
export function playWrong() {
  try {
    tone(220, 0, 0.22, "triangle", 0.3);
    tone(165, 0.12, 0.3, "triangle", 0.3);
  } catch {
    // sound is a nice-to-have
  }
}
