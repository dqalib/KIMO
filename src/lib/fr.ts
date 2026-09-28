// Fractions (FR) strand, Years 1-4 — levels and question generator.
// Source of truth: docs/skill-map.md. FR-01 (halves and quarters of shapes,
// Year 1) puts shape pictures in the text as [[shape:parts:shaded]] tokens,
// drawn by src/components/FractionText.tsx.
// Mirrors the style and API shape of np.ts.

export interface FRLevel {
  id: string;
  order: number;
  year: number;
  title: string;
  setSize: number;
  secondsPerQuestion: number;
}

export interface FRQuestion {
  key: string; // stable ASCII, e.g. "of:3:4:8" (3/4 of 8), "eq:1:2:x:4", "add:2:3:7", "cmp:3:5:4:5"
  text: string; // shown to the child; "?" marks the blank; fractions written with "/"
  answer: number | string;
  options?: string[]; // required unless the answer is a whole number 0–1000 for the keypad
}

export const FR_LEVELS: FRLevel[] = [
  { id: "FR-01", order: 1, year: 1, title: "Halves and quarters", setSize: 10, secondsPerQuestion: 0 },
  { id: "FR-02", order: 2, year: 2, title: "Fractions of amounts", setSize: 15, secondsPerQuestion: 10 },
  { id: "FR-03", order: 3, year: 3, title: "Tenths and fractions of amounts", setSize: 15, secondsPerQuestion: 12 },
  { id: "FR-04", order: 4, year: 3, title: "Equivalent fractions", setSize: 15, secondsPerQuestion: 12 },
  { id: "FR-05", order: 5, year: 3, title: "Adding and comparing fractions", setSize: 15, secondsPerQuestion: 12 },
  { id: "FR-06", order: 6, year: 4, title: "Hundredths and decimals", setSize: 15, secondsPerQuestion: 15 },
];

export function getFRLevel(id: string): FRLevel | undefined {
  return FR_LEVELS.find((l) => l.id === id);
}

export function nextFRLevel(id: string): FRLevel | undefined {
  const l = getFRLevel(id);
  return l ? FR_LEVELS.find((x) => x.order === l.order + 1) : undefined;
}

export function prevFRLevel(id: string): FRLevel | undefined {
  const l = getFRLevel(id);
  return l ? FR_LEVELS.find((x) => x.order === l.order - 1) : undefined;
}

export function defaultFRStart(schoolYear: number): string {
  if (schoolYear <= 1) return "FR-01";
  if (schoolYear === 2) return "FR-02";
  if (schoolYear === 3) return "FR-03";
  return "FR-04";
}

type Rng = () => number;

/** Inclusive integer in [lo, hi]. */
function ri(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function q(key: string, text: string, answer: number | string, options?: string[]): FRQuestion {
  return options ? { key, text, answer, options } : { key, text, answer };
}

function shuffle(rng: Rng, arr: string[]): string[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Fraction text like "3/4". */
const fr = (n: number, d: number) => `${n}/${d}`;

const DENOM_WORDS: Record<number, string> = {
  2: "halves", 3: "thirds", 4: "quarters", 5: "fifths", 6: "sixths",
  7: "sevenths", 8: "eighths", 9: "ninths", 10: "tenths", 100: "hundredths",
};

/** Exact decimal string for n/d (denominators divide a power of 10 here). */
function decString(n: number, d: number): string {
  const v = n / d;
  return String(parseFloat(v.toFixed(2)));
}

// ---- question builders ----------------------------------------------------

/** n/d of amount = ? — amount is a multiple of d, so it divides exactly. */
function ofQ(rng: Rng, numerators: (d: number) => number[], dLo: number, dHi: number): FRQuestion {
  const d = ri(rng, dLo, dHi);
  const ns = numerators(d);
  const n = ns[ri(rng, 0, ns.length - 1)];
  const amount = d * ri(rng, 1, Math.floor(100 / d));
  return q(`of:${n}:${d}:${amount}`, `${fr(n, d)} of ${amount} = ?`, (amount * n) / d);
}

/** n/d of ? = result — inverse of ofQ. */
function invQ(rng: Rng, numerators: (d: number) => number[], dLo: number, dHi: number): FRQuestion {
  const d = ri(rng, dLo, dHi);
  const ns = numerators(d);
  const n = ns[ri(rng, 0, ns.length - 1)];
  const k = ri(rng, 1, Math.floor(100 / d)); // amount = k*d, result = k*n
  return q(`inv:${n}:${d}:${k * n}`, `${fr(n, d)} of ? = ${k * n}`, k * d);
}

/** How many d-ths make 1 whole? → d. */
function howManyQ(rng: Rng, dLo: number, dHi: number): FRQuestion {
  const d = ri(rng, dLo, dHi);
  return q(`howmany:${d}`, `How many ${DENOM_WORDS[d]} make 1 whole?`, d);
}

/** a/b = ?/d — blank numerator. */
function eqNumQ(n: number, d: number, rd: number): FRQuestion {
  return q(`eq:${n}:${d}:x:${rd}`, `${fr(n, d)} = ?/${rd}`, (n * rd) / d);
}

/** n/d = r/? — blank denominator. */
function eqDenQ(n: number, d: number, rn: number): FRQuestion {
  return q(`eq:${n}:${d}:${rn}:x`, `${fr(n, d)} = ${rn}/?`, (rn * d) / n);
}

/** Which is the same as n/d? — correct is an equivalent, wrongs are classic confusions. */
function sameQ(rng: Rng): FRQuestion {
  const base: [number, number][] = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [1, 5], [3, 5], [4, 5]];
  const [n, d] = base[ri(rng, 0, base.length - 1)];
  const k = ri(rng, 2, Math.floor(10 / d)); // stay within Y3 "up to tenths"
  const correct = fr(n * k, d * k);
  const wrongs = [fr(n, d * k), fr(n + 1, d + 1)];
  const options = shuffle(rng, [correct, ...wrongs]);
  return q(`same:${n}:${d}:${k}`, `Which is the same as ${fr(n, d)}?`, correct, options);
}

/**
 * a/b ? c/d with options ["<", ">", "="]; "=" about 1 in 6.
 * Only comparisons the curriculum teaches (DQ review of 008):
 *  - Year 3 ("y3"): same denominator (3/7 ? 5/7), unit fractions (1/3 ? 1/5),
 *    or an equivalent pair within tenths (2/4 ? 1/2).
 *  - Year 4 ("y4"): tenths against hundredths (3/10 ? 29/100), hundredths against
 *    hundredths, or a known equivalent (1/4 ? 25/100).
 */
function cmpQ(rng: Rng, year: "y3" | "y4", eqChance = 1 / 6): FRQuestion {
  let [a, b, c, d] = [1, 2, 1, 2];
  if (rng() < eqChance) {
    if (year === "y3") {
      const base: [number, number][] = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5]];
      const [n, m] = base[ri(rng, 0, base.length - 1)];
      const k = ri(rng, 2, Math.max(2, Math.floor(10 / m)));
      [a, b, c, d] = [n, m, n * k, m * k];
      if (m * k > 10) [a, b, c, d] = [1, 2, 2, 4];
    } else {
      const known: [number, number][] = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10]];
      const [n, m] = known[ri(rng, 0, known.length - 1)];
      [a, b, c, d] = [n, m, (n * 100) / m, 100];
    }
    if (rng() < 0.5) [a, b, c, d] = [c, d, a, b];
  } else if (year === "y3") {
    if (rng() < 0.6) {
      d = b = ri(rng, 3, 10);
      a = ri(rng, 1, b - 1);
      do c = ri(rng, 1, d - 1); while (c === a);
    } else {
      a = c = 1;
      b = ri(rng, 2, 10);
      do d = ri(rng, 2, 10); while (d === b);
    }
  } else {
    if (rng() < 0.6) {
      [a, b] = [ri(rng, 1, 9), 10];
      [c, d] = [ri(rng, 1, 99), 100];
      if (c === a * 10) c += rng() < 0.5 ? 1 : -1;
    } else {
      [a, b] = [ri(rng, 1, 99), 100];
      do c = ri(rng, 1, 99); while (c === a);
      d = 100;
    }
    if (rng() < 0.5) [a, b, c, d] = [c, d, a, b];
  }
  const left = a * d;
  const right = c * b;
  const answer = left < right ? "<" : left > right ? ">" : "=";
  return q(`cmp:${a}:${b}:${c}:${d}`, `${fr(a, b)} ? ${fr(c, d)}`, answer, ["<", ">", "="]);
}

/** a/d + b/d = ?/d, sum stays within 1 whole. */
function addQ(rng: Rng, dLo: number, dHi: number): FRQuestion {
  const d = ri(rng, dLo, dHi);
  const a = ri(rng, 1, d - 1);
  const b = ri(rng, 1, d - a);
  return q(`add:${a}:${b}:${d}`, `${fr(a, d)} + ${fr(b, d)} = ?/${d}`, a + b);
}

/** a/d − b/d = ?/d, a > b. */
function subQ(rng: Rng, dLo: number, dHi: number): FRQuestion {
  const d = ri(rng, dLo, dHi);
  const a = ri(rng, 2, d);
  const b = ri(rng, 1, a - 1);
  return q(`sub:${a}:${b}:${d}`, `${fr(a, d)} − ${fr(b, d)} = ?/${d}`, a - b);
}

/** Which is bigger: a/b or c/d? — Year 3: same denominator or two unit fractions (options are the two fractions). */
function bigQ(rng: Rng): FRQuestion {
  let a: number, b: number, c: number, d: number;
  if (rng() < 0.5) {
    b = d = ri(rng, 3, 10);
    a = ri(rng, 1, b - 1);
    do c = ri(rng, 1, d - 1); while (c === a);
  } else {
    a = c = 1;
    b = ri(rng, 2, 10);
    do d = ri(rng, 2, 10); while (d === b);
  }
  const first = fr(a, b);
  const second = fr(c, d);
  const answer = a * d > c * b ? first : second;
  return q(`big:${a}:${b}:${c}:${d}`, `Which is bigger: ${first} or ${second}?`, answer, shuffle(rng, [first, second]));
}

/** n/d = 0.? for d ∈ {10, 100} — keypad answer is the digits after the point. */
function decQ(rng: Rng): FRQuestion {
  const d = rng() < 0.5 ? 10 : 100;
  const n = ri(rng, 1, d - 1);
  return q(`dec:${n}:${d}`, `${fr(n, d)} = 0.?`, n);
}

/** Write 0.v as hundredths: ?/100 — answer v. */
function hundQ(rng: Rng): FRQuestion {
  const ds = [2, 4, 5, 10, 20, 25, 50, 100];
  const d = ds[ri(rng, 0, ds.length - 1)];
  const n = ri(rng, 1, d - 1);
  const v = (100 * n) / d;
  const shown = v < 10 ? `0.0${v}` : `0.${v}`;
  return q(`hund:${n}:${d}`, `Write ${shown} as hundredths: ?/100`, v);
}

/** n/d as a decimal — answer string, believable slips like 0.03 → 0.3, 3.0. */
function toDecQ(rng: Rng): FRQuestion {
  const ds = [2, 4, 5, 10, 20, 25, 50, 100];
  const d = ds[ri(rng, 0, ds.length - 1)];
  const n = ri(rng, 1, d);
  const s = decString(n, d);
  const x = n / d;
  const slips: string[] = [];
  const add = (v: string) => {
    if (v !== s && !slips.includes(v)) slips.push(v);
  };
  const dot = s.indexOf(".");
  const intPart = dot >= 0 ? s.slice(0, dot) : s;
  const dpPart = dot >= 0 ? s.slice(dot + 1) : "";
  // digit swap: "0.25" → "0.52"; one dp: "0.7" → "7.0"
  if (dpPart.length >= 2) add(`${intPart}.${dpPart[1]}${dpPart[0]}${dpPart.slice(2)}`);
  else if (dpPart.length === 1) add(intPart === "0" ? `${dpPart}.0` : `${dpPart}.${intPart}`);
  // off-by-one in the last digit: "0.99" → "0.98", "0.90"
  if (dpPart.length >= 1) {
    const last = Number(dpPart[dpPart.length - 1]);
    add(`${intPart}.${dpPart.slice(0, -1)}${(last + 9) % 10}`);
    add(`${intPart}.${dpPart.slice(0, -1)}${(last + 1) % 10}`);
  }
  // ×10 slip: "0.03" → "0.3", "0.25" → "2.5", "0.7" → "9"
  add(String(parseFloat((x * 10).toFixed(2))));
  // ÷10 slip when it stays exact: "0.9" → "0.09"
  if (Number.isInteger((x / 10) * 100) && x / 10 > 0) add(String(parseFloat((x / 10).toFixed(2))));
  // ×100 slip for hundredths under 0.1: "0.03" → "3.0"
  if (x < 0.1) add(`${Math.round(x * 100)}.0`);
  const options = [s, ...slips].slice(0, 4);
  return q(`todec:${n}:${d}`, `${fr(n, d)} as a decimal`, s, shuffle(rng, options));
}

// ---- per-level numerators --------------------------------------------------
// Year 2: halves, thirds, quarters (¾ included). Year 3: up to tenths.

const y2Numerators = (d: number) => (d === 4 ? [1, 3] : [1]);
const y3Numerators = (d: number) => {
  const ns = [1];
  for (let n = 2; n < d; n++) ns.push(n);
  return ns;
};

// ---- set generation --------------------------------------------------------

type Slot = (rng: Rng) => FRQuestion | undefined;

/**
 * Build one practice set.
 * Keys the child has got wrong before (tricky) are 3× as likely, like np.ts.
 * No repeated key within a set; opening slots guarantee the level's rules.
 */
// ---- FR-01: halves and quarters of shapes and amounts (Year 1) ------------------

export type ShapeKind = "circle" | "square" | "rect";
const SHAPES: ShapeKind[] = ["circle", "square", "rect"];
const SHAPE_WORD: Record<ShapeKind, string> = { circle: "circle", square: "square", rect: "rectangle" };

/** Picture token: [[circle:4:1]] = circle cut into 4 equal parts, 1 shaded; add ":u" for unequal parts. */
export function shapeToken(shape: ShapeKind, parts: number, shaded: number, unequal = false): string {
  return `[[${shape}:${parts}:${shaded}${unequal ? ":u" : ""}]]`;
}

function fr01Question(rng: Rng, kind: string): FRQuestion {
  const shape = SHAPES[ri(rng, 0, SHAPES.length - 1)];
  const n = rng() < 0.5 ? 2 : 4;
  const word = n === 2 ? "half" : "quarter";
  switch (kind) {
    case "shade":
      return q(`shade:${shape}:${n}`, `What fraction is shaded? ${shapeToken(shape, n, 1)}`, `1/${n}`, ["1/2", "1/4"]);
    case "cut": {
      const equal = rng() < 0.5;
      const k = n === 2 ? "halves" : "quarters";
      return q(`${k}:${shape}:${equal ? "e" : "u"}`, `Is this ${SHAPE_WORD[shape]} cut into ${k}? ${shapeToken(shape, n, 0, !equal)}`, equal ? "Yes" : "No", ["Yes", "No"]);
    }
    case "pick": {
      const right = shapeToken(shape, n, 1);
      const other = shapeToken(shape, n === 2 ? 4 : 2, 1);
      const trap = shapeToken(shape, n, 1, true);
      return q(`pick:${n}:${shape}`, `Which shows ${n === 2 ? "a half" : "a quarter"}?`, right, shuffle(rng, [right, other, trap]));
    }
    default: {
      // "amount": half of an even number, or a quarter of a multiple of 4 (answers 1–10)
      const a = n * ri(rng, 1, n === 2 ? 10 : 5);
      return q(`${word}:${a}`, `${n === 2 ? "Half" : "A quarter"} of ${a} = ?`, a / n);
    }
  }
}

function generateFR01Set(level: FRLevel, tricky: Record<string, number>, rng: Rng): FRQuestion[] {
  const kinds = ["shade", "cut", "pick", "amount"];
  const weight = (key: string) => 1 + 2 * Math.min(tricky[key] ?? 0, 3);
  const out: FRQuestion[] = [];
  const used = new Set<string>();
  for (let i = 0; out.length < level.setSize && i < 2000; i++) {
    // one of each kind first, then a mix; tricky keys are kept more often
    const kind = out.length < kinds.length ? kinds[out.length] : kinds[ri(rng, 0, kinds.length - 1)];
    const cand = fr01Question(rng, kind);
    if (used.has(cand.key)) continue;
    if (rng() * 7 > weight(cand.key) * (7 / 3)) continue; // unseen keys kept 3/7 of the time, tricky ones always
    used.add(cand.key);
    out.push(cand);
  }
  return out;
}

export function generateFRSet(
  level: FRLevel,
  tricky: Record<string, number> = {},
  rng: Rng = Math.random,
): FRQuestion[] {
  if (level.id === "FR-01") return generateFR01Set(level, tricky, rng);
  const weight = (key: string) => 1 + 2 * Math.min(tricky[key] ?? 0, 3);

  const used = new Set<string>();
  const out: FRQuestion[] = [];
  const push = (qq: FRQuestion | undefined) => {
    if (!qq || used.has(qq.key)) return false;
    used.add(qq.key);
    out.push(qq);
    return true;
  };

  // Candidate pools per shape, topped up on demand and pruned of used keys,
  // so tricky keys can be weighted up without repeats.
  const pools = new Map<string, FRQuestion[]>();
  const take = (shape: string, build: () => FRQuestion): FRQuestion | undefined => {
    let pool = pools.get(shape);
    if (!pool) {
      pool = [];
      pools.set(shape, pool);
    }
    for (let i = pool.length - 1; i >= 0; i--) {
      if (used.has(pool[i].key)) pool.splice(i, 1);
    }
    const seen = new Set(pool.map((p) => p.key));
    for (let i = 0; i < 60 && pool.length < 60; i++) {
      const cand = build();
      if (!seen.has(cand.key) && !used.has(cand.key)) {
        seen.add(cand.key);
        pool.push(cand);
      }
    }
    if (pool.length === 0) return undefined;
    const weighted: { q: FRQuestion; w: number }[] = pool.map((p) => ({ q: p, w: weight(p.key) }));
    const total = weighted.reduce((s, p) => s + p.w, 0);
    let r = rng() * total;
    let idx = 0;
    for (; idx < weighted.length - 1; idx++) {
      r -= weighted[idx].w;
      if (r < 0) break;
    }
    const [picked] = pool.splice(idx, 1);
    return picked;
  };

  // Opening slots are fixed shapes so every set covers the level's headline
  // skills (e.g. ¾ of an amount at FR-02, an = compare at FR-05).
  let starters: Slot[] = [];
  if (level.id === "FR-02") starters = [
    () => take("of34", () => { // ¾ of an amount
      const amount = 4 * ri(rng, 1, 25);
      return q(`of:3:4:${amount}`, `3/4 of ${amount} = ?`, (amount * 3) / 4);
    }),
    () => take("inv", () => invQ(rng, y2Numerators, 2, 4)),
    () => take("howmany", () => howManyQ(rng, 2, 4)),
  ];
  if (level.id === "FR-03") starters = [
    () => take("of10", () => { // 1/10 or n/10 of a round amount
      const n = ri(rng, 1, 9);
      const amount = 10 * ri(rng, 1, 10);
      return q(`of:${n}:10:${amount}`, `${fr(n, 10)} of ${amount} = ?`, (amount * n) / 10);
    }),
    () => take("tenths", () => howManyQ(rng, 10, 10)),
    () => take("inv", () => invQ(rng, y3Numerators, 2, 10)),
  ];
  if (level.id === "FR-04") starters = [
    () => take("eqn", () => { const [n, d] = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [4, 5]][ri(rng, 0, 7)]; return eqNumQ(n, d, d * 2); }),
    () => take("eqd", () => { const [n, d] = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [4, 5]][ri(rng, 0, 7)]; return eqDenQ(n, d, n * 2); }),
    () => take("same", () => sameQ(rng)),
    () => take("cmp", () => cmpQ(rng, "y3")), // guarantees ≥3 shapes per set
  ];
  if (level.id === "FR-05") starters = [
    () => take("add", () => addQ(rng, 2, 10)),
    () => take("sub", () => subQ(rng, 2, 10)),
    () => take("cmpe", () => cmpQ(rng, "y3", 1)), // an = compare
  ];
  if (level.id === "FR-06") starters = [
    () => take("dec", () => decQ(rng)),
    () => take("hund", () => hundQ(rng)),
    () => take("todec", () => toDecQ(rng)),
  ];

  for (const slot of starters) {
    for (let tries = 0; tries < 20 && out.length < starters.length && out.length < level.setSize; tries++) {
      if (push(slot(rng))) break;
    }
  }

  while (out.length < level.setSize) {
    const before = out.length;
    const r = rng();
    switch (level.id) {
      case "FR-02": {
        if (r < 0.5) push(take("of", () => ofQ(rng, y2Numerators, 2, 4)));
        else if (r < 0.75) push(take("inv", () => invQ(rng, y2Numerators, 2, 4)));
        else push(take("howmany", () => howManyQ(rng, 2, 4)));
        break;
      }
      case "FR-03": {
        if (r < 0.55) push(take("of", () => ofQ(rng, y3Numerators, 2, 10)));
        else if (r < 0.8) push(take("inv", () => invQ(rng, y3Numerators, 2, 10)));
        else push(take("howmany", () => howManyQ(rng, 2, 10)));
        break;
      }
      case "FR-04": {
        if (r < 0.4) push(take("eq", () => {
          const base: [number, number][] = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [4, 5]];
          const [n, d] = base[ri(rng, 0, base.length - 1)];
          const k = ri(rng, 2, Math.floor(10 / d)); // denominators stay ≤ 10 for Y3
          return rng() < 0.5 ? eqNumQ(n, d, d * k) : eqDenQ(n * k, d * k, n);
        }));
        else if (r < 0.75) push(take("same", () => sameQ(rng)));
        else push(take("cmp", () => cmpQ(rng, "y3")));
        break;
      }
      case "FR-05": {
        if (r < 0.3) push(take("add", () => addQ(rng, 2, 10)));
        else if (r < 0.55) push(take("sub", () => subQ(rng, 2, 10)));
        else if (r < 0.8) push(take("cmp", () => cmpQ(rng, "y3")));
        else push(take("big", () => bigQ(rng)));
        break;
      }
      case "FR-06": {
        if (r < 0.3) push(take("dec", () => decQ(rng)));
        else if (r < 0.55) push(take("hund", () => hundQ(rng)));
        else if (r < 0.8) push(take("todec", () => toDecQ(rng)));
        else push(take("cmp", () => cmpQ(rng, "y4")));
        break;
      }
    }
    if (out.length === before) {
      // every shape ran dry — retry the opening shapes, then give up
      for (const slot of starters) {
        if (push(slot(rng))) break;
      }
    }
    if (out.length === before) break;
  }

  return out;
}
