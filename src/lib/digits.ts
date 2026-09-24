// Reads handwritten numbers from Apple Pencil strokes, on the iPad, offline.
//
// 1. Split the strokes into digits (by how they overlap left-to-right).
// 2. Draw each digit into a 28×28 picture the same way the model was trained
//    (see ml/digits/train.py — render() there must match renderDigit() here).
// 3. A small neural network (784 → hidden → 10) says which digit it is.
//
// The model file (public/models/digits-v1.json, ~200 KB) is loaded once, on first use.

export type P = [number, number];
export type Strokes = P[][];

export interface DigitModel {
  hidden: number;
  W1: Int8Array; // 784 × hidden, row-major
  s1: number;
  b1: Float32Array;
  W2: Int8Array; // hidden × 10
  s2: number;
  b2: Float32Array;
  render: { size: number; box: number; halfWidth: number; sub: number };
}

interface ModelJson {
  hidden: number;
  W1: string;
  s1: number;
  b1: number[];
  W2: string;
  s2: number;
  b2: number[];
  render: DigitModel["render"];
}

function b64ToInt8(b64: string): Int8Array {
  const bin = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const out = new Int8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = (bin.charCodeAt(i) << 24) >> 24;
  return out;
}

export function parseModel(j: ModelJson): DigitModel {
  return {
    hidden: j.hidden,
    W1: b64ToInt8(j.W1),
    s1: j.s1,
    b1: Float32Array.from(j.b1),
    W2: b64ToInt8(j.W2),
    s2: j.s2,
    b2: Float32Array.from(j.b2),
    render: j.render,
  };
}

let modelPromise: Promise<DigitModel> | null = null;

/** Load the model once (browser). */
export function loadDigitModel(url = "/models/digits-v1.json"): Promise<DigitModel> {
  if (!modelPromise) {
    modelPromise = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`model ${r.status}`);
        return r.json();
      })
      .then(parseModel)
      .catch((e) => {
        modelPromise = null; // allow a retry later
        throw e;
      });
  }
  return modelPromise;
}

// ---- rendering ----------------------------------------------------------------

function resampleStroke(s: P[], step: number): P[] {
  if (s.length < 2) return s.slice();
  const out: P[] = [s[0]];
  let carry = 0;
  for (let i = 1; i < s.length; i++) {
    let a = s[i - 1];
    const b = s[i];
    let seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    while (carry + seg >= step && seg > 0) {
      const t = (step - carry) / seg;
      const p: P = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      out.push(p);
      a = p;
      seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      carry = 0;
    }
    carry += seg;
  }
  const last = s[s.length - 1];
  const prev = out[out.length - 1];
  if (last[0] !== prev[0] || last[1] !== prev[1]) out.push(last);
  return out;
}

/** Strokes (any units, y down) → 28×28 image in [0,1], framed like MNIST. */
export function renderDigit(strokes: Strokes, opts: DigitModel["render"] = { size: 28, box: 20, halfWidth: 1.25, sub: 4 }): Float32Array {
  const { size: S, box, halfWidth, sub } = opts;
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const s of strokes)
    for (const [x, y] of s) {
      if (x < minx) minx = x;
      if (y < miny) miny = y;
      if (x > maxx) maxx = x;
      if (y > maxy) maxy = y;
    }
  const w = maxx - minx;
  const h = maxy - miny;
  const scale = box / Math.max(w, h, 1e-6);
  const ox = (S - w * scale) / 2;
  const oy = (S - h * scale) / 2;

  // Segments in pixel space (pen input is dense — thin it to ~0.6 px spacing first).
  const segs: number[] = [];
  for (const s of strokes) {
    const q = resampleStroke(
      s.map(([x, y]): P => [(x - minx) * scale + ox, (y - miny) * scale + oy]),
      0.6,
    );
    if (q.length === 1) q.push(q[0]);
    for (let i = 1; i < q.length; i++) segs.push(q[i - 1][0], q[i - 1][1], q[i][0], q[i][1]);
  }

  const N = S * sub;
  const hw2 = halfWidth * halfWidth;
  const img = new Float32Array(S * S);
  const inc = 1 / (sub * sub);
  for (let r = 0; r < N; r++) {
    const py = (r + 0.5) / sub;
    for (let c = 0; c < N; c++) {
      const px = (c + 0.5) / sub;
      let hit = false;
      for (let k = 0; k < segs.length && !hit; k += 4) {
        const x1 = segs[k], y1 = segs[k + 1], x2 = segs[k + 2], y2 = segs[k + 3];
        // quick reject by bounding box
        if (px < Math.min(x1, x2) - halfWidth || px > Math.max(x1, x2) + halfWidth) continue;
        if (py < Math.min(y1, y2) - halfWidth || py > Math.max(y1, y2) + halfWidth) continue;
        const dx = x2 - x1, dy = y2 - y1;
        const L2 = dx * dx + dy * dy;
        let t = L2 < 1e-12 ? 0 : ((px - x1) * dx + (py - y1) * dy) / L2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = px - (x1 + t * dx), ey = py - (y1 + t * dy);
        if (ex * ex + ey * ey <= hw2) hit = true;
      }
      if (hit) img[Math.floor(r / sub) * S + Math.floor(c / sub)] += inc;
    }
  }
  return centerOfMass(img, S);
}

function centerOfMass(img: Float32Array, S: number): Float32Array {
  let tot = 0, cx = 0, cy = 0;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const v = img[y * S + x];
      tot += v;
      cx += v * (x + 0.5);
      cy += v * (y + 0.5);
    }
  if (tot <= 0) return img;
  const sx = Math.round(S / 2 - cx / tot);
  const sy = Math.round(S / 2 - cy / tot);
  const out = new Float32Array(S * S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const ny = y + sy, nx = x + sx;
      if (ny >= 0 && ny < S && nx >= 0 && nx < S) out[ny * S + nx] = img[y * S + x];
    }
  return out;
}

// ---- model --------------------------------------------------------------------

export function classify(m: DigitModel, x: Float32Array): Float32Array {
  const H = m.hidden;
  const h = new Float32Array(H);
  for (let i = 0; i < 784; i++) {
    const v = x[i];
    if (v === 0) continue;
    const row = i * H;
    for (let j = 0; j < H; j++) h[j] += v * m.W1[row + j];
  }
  for (let j = 0; j < H; j++) {
    const z = h[j] * m.s1 + m.b1[j];
    h[j] = z > 0 ? z : 0;
  }
  const z = new Float32Array(10);
  for (let j = 0; j < H; j++) {
    const v = h[j];
    if (v === 0) continue;
    const row = j * 10;
    for (let k = 0; k < 10; k++) z[k] += v * m.W2[row + k];
  }
  let max = -Infinity;
  for (let k = 0; k < 10; k++) {
    z[k] = z[k] * m.s2 + m.b2[k];
    if (z[k] > max) max = z[k];
  }
  let sum = 0;
  for (let k = 0; k < 10; k++) {
    z[k] = Math.exp(z[k] - max);
    sum += z[k];
  }
  for (let k = 0; k < 10; k++) z[k] /= sum;
  return z;
}

// ---- splitting a number into digits -------------------------------------------

interface Box {
  minx: number;
  maxx: number;
  miny: number;
  maxy: number;
}

function boxOf(s: P[]): Box {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const [x, y] of s) {
    minx = Math.min(minx, x);
    maxx = Math.max(maxx, x);
    miny = Math.min(miny, y);
    maxy = Math.max(maxy, y);
  }
  return { minx, maxx, miny, maxy };
}

/**
 * Group strokes into digits, left to right. Strokes whose left–right spans overlap
 * enough belong together (the two strokes of a 4, the top bar of a 5, a crossed 7).
 */
export function splitDigits(strokes: Strokes): Strokes[] {
  const items = strokes.filter((s) => s.length > 0).map((s) => ({ s, b: boxOf(s) }));
  if (!items.length) return [];
  const H = Math.max(...items.map((i) => i.b.maxy)) - Math.min(...items.map((i) => i.b.miny));
  // Ignore specks (accidental taps) smaller than 4% of the writing height.
  const real = items.filter((i) => Math.max(i.b.maxx - i.b.minx, i.b.maxy - i.b.miny) >= H * 0.04);
  real.sort((a, b) => (a.b.minx + a.b.maxx) / 2 - (b.b.minx + b.b.maxx) / 2);

  // A thin stroke (the upright of a 4, a "1") gets a minimum width around its centre,
  // so it still overlaps the rest of its digit.
  const minW = H * 0.18;
  const span = (b: Box): [number, number] => {
    const c = (b.minx + b.maxx) / 2;
    const half = Math.max(b.maxx - b.minx, minW) / 2;
    return [c - half, c + half];
  };

  const groups: { strokes: P[][]; b: Box }[] = [];
  for (const it of real) {
    const g = groups[groups.length - 1];
    if (g) {
      const [a0, a1] = span(g.b);
      const [b0, b1] = span(it.b);
      const overlap = Math.min(a1, b1) - Math.max(a0, b0);
      const narrow = Math.min(a1 - a0, b1 - b0);
      if (overlap >= narrow * 0.35) {
        g.strokes.push(it.s);
        g.b = {
          minx: Math.min(g.b.minx, it.b.minx),
          maxx: Math.max(g.b.maxx, it.b.maxx),
          miny: Math.min(g.b.miny, it.b.miny),
          maxy: Math.max(g.b.maxy, it.b.maxy),
        };
        continue;
      }
    }
    groups.push({ strokes: [it.s], b: { ...it.b } });
  }
  return groups.map((g) => g.strokes);
}

export interface Reading {
  text: string; // e.g. "56"
  confidence: number; // lowest per-digit probability
  digits: { digit: number; p: number; second: number; p2: number }[];
}

/** Read a whole number written in pen strokes. */
export function readNumber(m: DigitModel, strokes: Strokes): Reading {
  const groups = splitDigits(strokes);
  const digits = groups.map((g) => {
    const probs = classify(m, renderDigit(g, m.render));
    let best = 0, second = 1;
    for (let k = 0; k < 10; k++) if (probs[k] > probs[best]) best = k;
    if (second === best) second = 0;
    for (let k = 0; k < 10; k++) if (k !== best && probs[k] > probs[second]) second = k;
    return { digit: best, p: probs[best], second, p2: probs[second] };
  });
  return {
    text: digits.map((d) => d.digit).join(""),
    confidence: digits.length ? Math.min(...digits.map((d) => d.p)) : 0,
    digits,
  };
}
