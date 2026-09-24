// Handwriting (HW strand): lowercase letter formation for Year 1.
//
// Each letter is one or more strokes, each stroke a polyline in "letter units":
//   x: 0 = left edge of the letter (widths are ~1)
//   y: -1 = top of tall letters (ascender), 0 = top of small letters (x-height),
//       1 = baseline, 1.7 = bottom of tails (descender)
// Strokes are listed in the order and direction a Year 1 child is taught to form them
// (plain print, no lead-in strokes). Letters are grouped into the usual families.

export type Pt = [number, number];
export type Stroke = Pt[];

export interface Letter {
  char: string;
  family: FamilyId;
  width: number;
  strokes: Stroke[];
}

export type FamilyId = "ladder" | "caterpillar" | "robot" | "zigzag";

export const FAMILIES: { id: FamilyId; levelId: string; name: string; hint: string; letters: string }[] = [
  { id: "ladder", levelId: "HW-01", name: "Long ladder letters", hint: "Straight down, then flick", letters: "litujy" },
  { id: "caterpillar", levelId: "HW-02", name: "Curly caterpillar letters", hint: "Start at the top, go round like a c", letters: "cadoqgesf" },
  { id: "robot", levelId: "HW-03", name: "One-armed robot letters", hint: "Down, back up, and over", letters: "rnmhbpk" },
  { id: "zigzag", levelId: "HW-04", name: "Zig-zag letters", hint: "Sharp straight lines", letters: "vwxz" },
];

// ---- stroke builders --------------------------------------------------------

function line(...pts: Pt[]): Stroke {
  return pts;
}

/** Elliptical arc from angle a0 to a1 (degrees; 0 = right, 90 = down, so increasing = clockwise on screen). */
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number): Stroke {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 10));
  const out: Stroke = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return out;
}

/** Join pieces into one continuous stroke (the pen doesn't lift). */
function join(...parts: Stroke[]): Stroke {
  const out: Stroke = [];
  for (const p of parts) for (const pt of p) out.push(pt);
  return out;
}

const dot = (x: number, y: number): Stroke => [
  [x, y - 0.04],
  [x, y + 0.04],
];

// Shared "c" bowl used by a, d, g, q: starts at about 1 o'clock and goes anticlockwise all the way round.
const bowl = () => arc(0.45, 0.5, 0.38, 0.5, -30, -345);

const DEFS: Record<string, { width: number; strokes: Stroke[] }> = {
  // long ladder
  l: { width: 0.6, strokes: [line([0.3, -1], [0.3, 1])] },
  i: { width: 0.6, strokes: [line([0.3, 0], [0.3, 1]), dot(0.3, -0.5)] },
  t: {
    width: 0.8,
    strokes: [join(line([0.35, -0.7], [0.35, 0.8]), arc(0.55, 0.8, 0.2, 0.2, 180, 90), line([0.55, 1], [0.75, 0.85])), line([0.05, 0], [0.7, 0])],
  },
  u: { width: 0.9, strokes: [join(line([0.15, 0], [0.15, 0.6]), arc(0.45, 0.6, 0.3, 0.4, 180, 0), line([0.75, 0.6], [0.75, 0], [0.75, 1]))] },
  j: { width: 0.7, strokes: [join(line([0.5, 0], [0.5, 1.4]), arc(0.25, 1.4, 0.25, 0.3, 0, 160)), dot(0.5, -0.5)] },
  y: {
    width: 0.9,
    strokes: [join(line([0.15, 0], [0.15, 0.6]), arc(0.45, 0.6, 0.3, 0.4, 180, 0), line([0.75, 0.6], [0.75, 0], [0.75, 1.4]), arc(0.5, 1.4, 0.25, 0.3, 0, 160))],
  },
  // curly caterpillar
  c: { width: 0.9, strokes: [arc(0.5, 0.5, 0.4, 0.5, -40, -320)] },
  a: { width: 0.95, strokes: [join(bowl(), line([0.82, 0], [0.82, 1]))] },
  d: { width: 0.95, strokes: [join(bowl(), line([0.82, -1], [0.82, 1]))] },
  o: { width: 0.9, strokes: [arc(0.45, 0.5, 0.4, 0.5, -60, -420)] },
  q: { width: 0.95, strokes: [join(bowl(), line([0.82, 0], [0.82, 1.7]))] },
  g: { width: 0.95, strokes: [join(bowl(), line([0.82, 0], [0.82, 1.4]), arc(0.52, 1.4, 0.3, 0.3, 0, 160))] },
  e: { width: 0.9, strokes: [join(line([0.08, 0.5], [0.85, 0.5]), arc(0.46, 0.5, 0.39, 0.5, 0, -320))] },
  s: { width: 0.8, strokes: [join(arc(0.42, 0.25, 0.32, 0.25, -30, -270), arc(0.42, 0.75, 0.32, 0.25, -90, 150))] },
  f: { width: 0.95, strokes: [join(arc(0.6, -0.65, 0.3, 0.35, -20, -180), line([0.3, -0.65], [0.3, 1])), line([0.05, 0], [0.65, 0])] },
  // one-armed robot
  r: { width: 0.75, strokes: [join(line([0.15, 0], [0.15, 1], [0.15, 0.35]), arc(0.45, 0.35, 0.3, 0.3, 180, 315))] },
  n: { width: 0.9, strokes: [join(line([0.15, 0], [0.15, 1], [0.15, 0.35]), arc(0.45, 0.35, 0.3, 0.35, 180, 360), line([0.75, 0.35], [0.75, 1]))] },
  m: {
    width: 1.2,
    strokes: [
      join(
        line([0.1, 0], [0.1, 1], [0.1, 0.3]),
        arc(0.35, 0.3, 0.25, 0.3, 180, 360),
        line([0.6, 0.3], [0.6, 1], [0.6, 0.3]),
        arc(0.85, 0.3, 0.25, 0.3, 180, 360),
        line([1.1, 0.3], [1.1, 1]),
      ),
    ],
  },
  h: { width: 0.9, strokes: [join(line([0.15, -1], [0.15, 1], [0.15, 0.35]), arc(0.45, 0.35, 0.3, 0.35, 180, 360), line([0.75, 0.35], [0.75, 1]))] },
  b: { width: 0.9, strokes: [join(line([0.15, -1], [0.15, 1], [0.15, 0.5]), arc(0.47, 0.5, 0.32, 0.5, 180, 540))] },
  p: { width: 0.9, strokes: [join(line([0.15, 0], [0.15, 1.7], [0.15, 0.5]), arc(0.47, 0.5, 0.32, 0.5, 180, 540))] },
  k: { width: 0.85, strokes: [line([0.15, -1], [0.15, 1]), line([0.7, 0], [0.18, 0.6], [0.75, 1])] },
  // zig-zag
  v: { width: 1, strokes: [line([0.05, 0], [0.5, 1], [0.95, 0])] },
  w: { width: 1.25, strokes: [line([0.02, 0], [0.32, 1], [0.62, 0.2], [0.92, 1], [1.22, 0])] },
  x: { width: 0.9, strokes: [line([0.1, 0], [0.8, 1]), line([0.8, 0], [0.1, 1])] },
  z: { width: 0.9, strokes: [line([0.1, 0], [0.8, 0], [0.1, 1], [0.8, 1])] },
};

export const LETTERS: Letter[] = FAMILIES.flatMap((f) =>
  [...f.letters].map((ch) => ({ char: ch, family: f.id, width: DEFS[ch].width, strokes: DEFS[ch].strokes })),
);

export function getLetter(ch: string): Letter | undefined {
  return LETTERS.find((l) => l.char === ch);
}

export const LETTER_ORDER = LETTERS.map((l) => l.char);

// ---- geometry ---------------------------------------------------------------

function dist(a: Pt, b: Pt) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function strokeLength(s: Stroke) {
  let n = 0;
  for (let i = 1; i < s.length; i++) n += dist(s[i - 1], s[i]);
  return n;
}

/** Evenly spaced points along a polyline, `step` apart (keeps first and last point). */
export function resample(s: Stroke, step: number): Stroke {
  if (s.length < 2) return s.slice();
  const out: Stroke = [s[0]];
  let carry = 0;
  for (let i = 1; i < s.length; i++) {
    let a = s[i - 1];
    const b = s[i];
    let seg = dist(a, b);
    while (carry + seg >= step) {
      const t = (step - carry) / seg;
      const p: Pt = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      out.push(p);
      a = p;
      seg = dist(a, b);
      carry = 0;
    }
    carry += seg;
  }
  const last = s[s.length - 1];
  if (dist(out[out.length - 1], last) > step * 0.25) out.push(last);
  return out;
}

// ---- checking a child's attempt --------------------------------------------

export type Problem = "strokes" | "start" | "path" | "unfinished";

export interface CheckResult {
  ok: boolean;
  problem?: Problem;
  strokeIndex?: number;
}

export interface Tolerance {
  path: number; // average distance from the correct path (letter units)
  start: number; // how close the start and end must be
}

export const TOLERANCE: Record<1 | 2 | 3, Tolerance> = {
  1: { path: 0.22, start: 0.35 }, // tracing over a clear guide
  2: { path: 0.24, start: 0.38 }, // tracing over a faint guide
  3: { path: 0.3, start: 0.45 }, // writing without a guide
};

const STEP = 0.05;
const MIN_STROKE = 0.08; // ignore tiny accidental marks

/**
 * Check strokes (already converted to letter units) against a letter.
 * Follows the path in order, so a stroke done backwards, started in the wrong place,
 * or left unfinished is caught — not just the final shape.
 */
export function checkLetter(letter: Letter, attempt: Stroke[], tol: Tolerance): CheckResult {
  // Ignore accidental tiny marks — unless the letter has a dot (i, j), where a tap is the dot.
  const hasDot = letter.strokes.some((s) => strokeLength(s) < 0.3);
  const kids = attempt.filter((s) => s.length > 0 && (hasDot || strokeLength(s) >= MIN_STROKE));
  if (kids.length !== letter.strokes.length) return { ok: false, problem: "strokes" };

  for (let i = 0; i < letter.strokes.length; i++) {
    const r = checkStroke(letter.strokes[i], kids[i], tol);
    if (r !== true) return { ok: false, problem: r, strokeIndex: i };
  }
  return { ok: true };
}

function checkStroke(tmpl: Stroke, kid: Stroke, tol: Tolerance): true | Problem {
  // A dot (i, j): just needs to be a small mark in the right place.
  if (strokeLength(tmpl) < 0.3) {
    const c = centroid(kid);
    const size = strokeLength(kid);
    return dist(c, centroid(tmpl)) <= tol.start && size < 0.5 ? true : "start";
  }

  const T = resample(tmpl, STEP);
  const K = resample(kid, STEP);
  const N = T.length;

  if (dist(K[0], T[0]) > tol.start) return "start";

  // Walk along the correct path as the child's pen moves, only ever moving forward
  // (with a small allowance back). This copes with letters that go back over themselves (h, n, m…).
  const window = Math.max(4, Math.round(N / 5));
  let cur = 0;
  let sum = 0;
  let worst = 0;
  for (const p of K) {
    let best = cur;
    let bestD = Infinity;
    for (let j = Math.max(0, cur - 2); j <= Math.min(N - 1, cur + window); j++) {
      const d = dist(p, T[j]);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    cur = Math.max(cur, best);
    sum += bestD;
    worst = Math.max(worst, bestD);
  }
  const mean = sum / K.length;

  if (mean > tol.path || worst > tol.path * 2.6) return "path";
  if (cur < N - 3 || dist(K[K.length - 1], T[N - 1]) > tol.start) return "unfinished";
  return true;
}

function centroid(s: Stroke): Pt {
  const n = s.length || 1;
  return [s.reduce((a, p) => a + p[0], 0) / n, s.reduce((a, p) => a + p[1], 0) / n];
}

// ---- screen layout ----------------------------------------------------------

export const Y_TOP = -1.25;
export const Y_BOTTOM = 1.95;

/** Where a letter sits in a pad of w×h CSS pixels: scale (px per unit) and origin offset. */
export function layout(letter: Letter, w: number, h: number) {
  const scale = Math.min(h / (Y_BOTTOM - Y_TOP), (w * 0.6) / Math.max(letter.width, 1));
  const ox = (w - letter.width * scale) / 2;
  const oy = -Y_TOP * scale;
  return {
    scale,
    toPx: ([x, y]: Pt): Pt => [ox + x * scale, oy + y * scale],
    toUnits: (px: number, py: number): Pt => [(px - ox) / scale, (py - oy) / scale],
  };
}
