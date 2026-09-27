// Number & place value (NP) strand — levels and question generator.
// Source of truth: docs/skill-map.md.
// Mirrors the style and API shape of as.ts.

export interface NPLevel {
  id: string;
  order: number;
  year: number;
  title: string;
  setSize: number;
  secondsPerQuestion: number;
}

export interface NPQuestion {
  key: string; // stable, ASCII, e.g. "after:13", "cmp:63:36", "round10:347"
  text: string; // what the child sees; "?" marks the blank; ≥ 1,000 shown with a comma
  answer: number | string;
  options?: string[]; // required unless the answer is a whole number 0–10,000 for the keypad
}

export const NP_LEVELS: NPLevel[] = [
  { id: "NP-01", order: 1, year: 1, title: "Numbers to 20", setSize: 15, secondsPerQuestion: 8 },
  { id: "NP-02", order: 2, year: 1, title: "One more, one less to 100", setSize: 15, secondsPerQuestion: 8 },
  { id: "NP-03", order: 3, year: 1, title: "Counting in 2s, 5s and 10s", setSize: 15, secondsPerQuestion: 10 },
  { id: "NP-04", order: 4, year: 2, title: "Tens and ones to 100", setSize: 15, secondsPerQuestion: 10 },
  { id: "NP-05", order: 5, year: 3, title: "Counting in 3s, 4s, 8s, 50s and 100s", setSize: 15, secondsPerQuestion: 10 },
  { id: "NP-06", order: 6, year: 3, title: "Hundreds, tens and ones to 1,000", setSize: 15, secondsPerQuestion: 12 },
  { id: "NP-07", order: 7, year: 4, title: "Thousands to 10,000", setSize: 15, secondsPerQuestion: 12 },
  { id: "NP-08", order: 8, year: 4, title: "Rounding to 10, 100 and 1,000", setSize: 15, secondsPerQuestion: 12 },
  { id: "NP-09", order: 9, year: 4, title: "Negative numbers; Roman numerals", setSize: 15, secondsPerQuestion: 15 },
];

export function getNPLevel(id: string): NPLevel | undefined {
  return NP_LEVELS.find((l) => l.id === id);
}

export function nextNPLevel(id: string): NPLevel | undefined {
  const l = getNPLevel(id);
  return l ? NP_LEVELS.find((x) => x.order === l.order + 1) : undefined;
}

export function prevNPLevel(id: string): NPLevel | undefined {
  const l = getNPLevel(id);
  return l ? NP_LEVELS.find((x) => x.order === l.order - 1) : undefined;
}

export function defaultNPStart(schoolYear: number): string {
  if (schoolYear <= 1) return "NP-01";
  if (schoolYear === 2) return "NP-02";
  if (schoolYear === 3) return "NP-04";
  return "NP-06";
}

type Rng = () => number;

/** Inclusive integer in [lo, hi]. */
function ri(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/** "4,350" style grouping for numbers shown in text (answers never get commas). */
function fmt(n: number): string {
  const s = String(n);
  const neg = s.startsWith("-");
  const grouped = (neg ? s.slice(1) : s).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return neg ? `-${grouped}` : grouped;
}

function q(key: string, text: string, answer: number | string, options?: string[]): NPQuestion {
  return options ? { key, text, answer, options } : { key, text, answer };
}

// ---- Roman numerals (I–C only) ------------------------------------------

const ROMAN_PAIRS: [number, string][] = [
  [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
  [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

/** Standard subtractive form: 14 → XIV, 29 → XXIX, 90 → XC. */
function toRoman(n: number): string {
  let out = "";
  let rest = n;
  for (const [v, s] of ROMAN_PAIRS) {
    while (rest >= v) {
      out += s;
      rest -= v;
    }
  }
  return out;
}

/** Believable wrong form a child might write: 14 → XIIII, 9 → VIIII. */
function toRomanAdditive(n: number): string {
  let out = "";
  let rest = n;
  for (const [v, s] of ROMAN_PAIRS) {
    if (v === 90 || v === 40 || v === 9 || v === 4) continue;
    while (rest >= v) {
      out += s;
      rest -= v;
    }
  }
  return out || "I";
}

function shuffle(rng: Rng, arr: string[]): string[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Number options for Roman→number questions: correct plus close neighbours. */
function numOptions(rng: Rng, n: number): string[] {
  const opts: string[] = [String(n)];
  for (const c of [n + 1, n - 1, n + 2, n - 2]) {
    if (opts.length === 3) break;
    if (c >= 1 && c <= 100 && !opts.includes(String(c))) opts.push(String(c));
  }
  return shuffle(rng, opts);
}

/** Roman numeral options for number→Roman questions: correct + believable near-misses. */
function romanOptions(rng: Rng, n: number, correct: string): string[] {
  const opts: string[] = [correct];
  for (const c of [n + 1, n - 1, n + 2, n - 3, n + 3, n - 2]) {
    if (opts.length === 4) break;
    const v = Math.min(100, Math.max(1, c));
    if (v === n) continue;
    const r = toRoman(v);
    if (!opts.includes(r)) opts.push(r);
  }
  // top up with the additive (no subtractive) form, e.g. 14 → XIIII
  if (opts.length < 3) {
    const a = toRomanAdditive(n);
    if (!opts.includes(a)) opts.push(a);
  }
  return shuffle(rng, opts);
}

// ---- question builders ---------------------------------------------------

const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
];

/** a ? b with options ["<", ">", "="]; = is the answer about 1 in 6 times. */
function cmpQ(rng: Rng, lo: number, hi: number, forceEq = false): NPQuestion {
  const a = ri(rng, lo, hi);
  const b = forceEq || rng() < 1 / 6 ? a : ri(rng, lo, hi);
  const answer = a < b ? "<" : a > b ? ">" : "=";
  return q(`cmp:${a}:${b}`, `${fmt(a)} ? ${fmt(b)}`, answer, ["<", ">", "="]);
}

/**
 * Counting sequence with one blank in any of 4 positions.
 * Key prefix is the step ("2s", "100s", …), then start index and blank slot.
 */
function seqQ(rng: Rng, step: number, iLo: number, iHi: number): NPQuestion {
  const idx = ri(rng, iLo, iHi);
  const blank = ri(rng, 0, 3);
  const terms = [0, 1, 2, 3].map((k) => (idx + k) * step);
  const shown = terms.map((t, i) => (i === blank ? "?" : fmt(t)));
  return q(`${step}s:${idx}:${blank}`, shown.join(", "), terms[blank]);
}

/** 10/100/1,000 more or less than n. */
function moreLess(step: number, op: "+" | "−", n: number): NPQuestion {
  const answer = op === "+" ? n + step : n - step;
  const label = step >= 1000 ? fmt(step) : String(step);
  return q(`${op === "+" ? "m" : "l"}${step}:${n}`, `${label} ${op === "+" ? "more" : "less"} than ${fmt(n)}`, answer);
}

/** UK rounding: halfway rounds up. */
function roundHalfUp(n: number, step: number): number {
  return Math.floor((n + step / 2) / step) * step;
}

function roundQ(step: number, n: number): NPQuestion {
  const names: Record<number, string> = { 10: "10", 100: "100", 1000: "1,000" };
  return q(`r${step}:${n}`, `Round ${fmt(n)} to the nearest ${names[step]}`, roundHalfUp(n, step));
}

/** Negative-number question; options are believable: −2 → "-2", "2", "-4". */
function negQ(rng: Rng): NPQuestion {
  const b = ri(rng, 0, 15); // start number
  const a = ri(rng, b + 1, b + 20); // drop, so b − a lands in −20..−1
  const answer = b - a;
  const story = rng() < 0.5;
  const text = story
    ? `It is ${b}°C. It gets ${a} degrees colder. What is the temperature now?`
    : `What is ${a} less than ${b}?`;
  const opts = shuffle(rng, [String(answer), String(-answer), String(answer - 2)]);
  return q(`neg:${a}:${b}`, text, answer, opts);
}

/** Pluralise a count: pl(1, "ten", "tens") → "1 ten". */
function pl(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** e.g. "1 ten and 6 ones" → 16. */
function tenOneQ(rng: Rng, tLo: number, tHi: number): NPQuestion {
  const t = ri(rng, tLo, tHi);
  const o = t === tHi ? 0 : ri(rng, 0, 9);
  const text = `${pl(t, "ten", "tens")} and ${pl(o, "one", "ones")}`;
  return q(`to:${t}:${o}`, `${text} — write the number`, 10 * t + o);
}

/** e.g. "5 hundreds, 0 tens and 8 ones" → 508. */
function htoQ(rng: Rng): NPQuestion {
  const h = ri(rng, 1, 9);
  const t = ri(rng, 0, 9);
  const o = ri(rng, 0, 9);
  const text = `${pl(h, "hundred", "hundreds")}, ${pl(t, "ten", "tens")} and ${pl(o, "one", "ones")} — write the number`;
  return q(`hto:${h}:${t}:${o}`, text, 100 * h + 10 * t + o);
}

/** e.g. "3 thousands, 4 hundreds, 5 tens and 2 ones" → 3,452. */
function thouQ(rng: Rng): NPQuestion {
  const th = ri(rng, 1, 9);
  const h = ri(rng, 0, 9);
  const t = ri(rng, 0, 9);
  const o = ri(rng, 0, 9);
  const text = `${pl(th, "thousand", "thousands")}, ${pl(h, "hundred", "hundreds")}, ${pl(t, "ten", "tens")} and ${pl(o, "one", "ones")} — write the number`;
  return q(`tho:${th}:${h}:${t}:${o}`, text, 1000 * th + 100 * h + 10 * t + o);
}

/** "What is the 7 worth in 7,204?" → 7000. The digit must appear once only. */
function digitQ(rng: Rng): NPQuestion {
  for (let tries = 0; tries < 100; tries++) {
    const n = ri(rng, 1000, 9999);
    const digits = String(n).split("").map(Number);
    const places = [1000, 100, 10, 1];
    const pos = ri(rng, 0, 3);
    const d = digits[pos];
    if (d === 0) continue;
    if (digits.some((x, i) => x === d && i !== pos)) continue; // ambiguous digit
    return q(`digit:${d}:${n}`, `What is the ${d} worth in ${fmt(n)}?`, d * places[pos]);
  }
  return q("digit:7:7204", "What is the 7 worth in 7,204?", 7000);
}

// ---- per-level helpers with constraints -----------------------------------

/** n for more/less with a units part, so the answer crosses a boundary (395 + 10 = 405). */
function boundaryN(rng: Rng, step: number, lo: number, hi: number): number {
  for (let tries = 0; tries < 100; tries++) {
    const n = ri(rng, lo, hi);
    if (n % step !== 0) return n;
  }
  return step === 10 ? 395 : step === 100 ? 950 : 4350;
}

// ---- set generation --------------------------------------------------------

type Slot = (rng: Rng) => NPQuestion | undefined;

/**
 * Build one practice set.
 * Keys the child has got wrong before (tricky) are 3× as likely, like as.ts.
 * No repeated key within a set; opening slots guarantee the level's rules.
 */
export function generateNPSet(
  level: NPLevel,
  tricky: Record<string, number> = {},
  rng: Rng = Math.random,
): NPQuestion[] {
  const weight = (key: string) => 1 + 2 * Math.min(tricky[key] ?? 0, 3);

  const used = new Set<string>();
  const out: NPQuestion[] = [];
  const push = (qq: NPQuestion | undefined) => {
    if (!qq || used.has(qq.key)) return false;
    used.add(qq.key);
    out.push(qq);
    return true;
  };

  // Candidate pools per shape, topped up on demand and pruned of used keys,
  // so tricky keys can be weighted up like in tt.ts without repeats.
  const pools = new Map<string, NPQuestion[]>();
  const take = (shape: string, build: () => NPQuestion): NPQuestion | undefined => {
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
    const weighted: { q: NPQuestion; w: number }[] = pool.map((p) => ({ q: p, w: weight(p.key) }));
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

  // Opening slots are fixed shapes so every set covers the level's rules
  // (boundary crossing, halfway rounding, "=" compares, Roman numerals, …).
  let starters: Slot[] = [];
  if (level.id === "NP-01") starters = [
    () => take("after", () => { const n = ri(rng, 2, 19); return q(`after:${n}`, `What comes after ${n}?`, n + 1); }),
    () => take("before", () => { const n = ri(rng, 2, 20); return q(`before:${n}`, `What comes before ${n}?`, n - 1); }),
    () => take("write", () => { const n = ri(rng, 0, 20); return q(`write:${n}`, `Write the number: ${NUMBER_WORDS[n]}`, n); }),
  ];
  if (level.id === "NP-02") starters = [
    () => take("m1x", () => { const n = 10 * ri(rng, 0, 9) + 9; return moreLess(1, "+", n); }), // 39 → 40
    () => take("l1x", () => { const n = 10 * ri(rng, 1, 10); return moreLess(1, "−", n); }), // 70 → 69
    () => take("between", () => { const n = ri(rng, 2, 98); return q(`between:${n}`, `What number is between ${n - 1} and ${n + 1}?`, n); }),
  ];
  if (level.id === "NP-03") starters = [
    () => take("2s", () => seqQ(rng, 2, 0, 8)),
    () => take("5s", () => seqQ(rng, 5, 0, 7)),
    () => take("10s", () => seqQ(rng, 10, 0, 7)),
  ];
  if (level.id === "NP-04") starters = [
    () => take("to", () => tenOneQ(rng, 1, 9)),
    () => take("cmpe", () => cmpQ(rng, 1, 99, true)), // an "=" compare
    () => take("m10", () => moreLess(10, "+", ri(rng, 11, 89))),
  ];
  if (level.id === "NP-05") starters = [
    () => take("3s", () => seqQ(rng, 3, 1, 9)),
    () => take("50s", () => seqQ(rng, 50, 2, 6)),
    () => take("100s", () => seqQ(rng, 100, 1, 9)),
  ];
  if (level.id === "NP-06") starters = [
    () => take("hto", () => htoQ(rng)),
    () => take("m10x", () => moreLess(10, "+", boundaryN(rng, 10, 101, 989))), // 395 + 10 = 405
    () => take("m100x", () => moreLess(100, "+", boundaryN(rng, 100, 105, 899))), // 950 + 100 = 1050
  ];
  if (level.id === "NP-07") starters = [
    () => take("tho", () => thouQ(rng)),
    () => take("m1000x", () => moreLess(1000, "+", 1000 * ri(rng, 1, 8) + ri(rng, 1, 999))), // thousands digit changes
    () => take("digit", () => digitQ(rng)),
  ];
  if (level.id === "NP-08") starters = [
    () => take("r10h", () => roundQ(10, 10 * ri(rng, 2, 99) + 5)), // 345 → 350
    () => take("r100h", () => roundQ(100, 100 * ri(rng, 1, 99) + 50)), // 250 → 300
    () => take("r1000h", () => roundQ(1000, 1000 * ri(rng, 1, 9) + 500)), // 4,500 → 5,000
  ];
  if (level.id === "NP-09") starters = [
    () => take("neg", () => negQ(rng)),
    () => take("roman", () => { const n = ri(rng, 1, 100); return q(`roman:${toRoman(n)}`, `${toRoman(n)} = ?`, n, numOptions(rng, n)); }),
    () => take("toroman", () => { const n = ri(rng, 1, 100); return q(`toroman:${n}`, `${n} in Roman numerals`, toRoman(n), romanOptions(rng, n, toRoman(n))); }),
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
      case "NP-01": {
        if (r < 0.3) push(take("after", () => { const n = ri(rng, 2, 19); return q(`after:${n}`, `What comes after ${n}?`, n + 1); }));
        else if (r < 0.6) push(take("before", () => { const n = ri(rng, 2, 20); return q(`before:${n}`, `What comes before ${n}?`, n - 1); }));
        else if (r < 0.8) push(take("write", () => { const n = ri(rng, 0, 20); return q(`write:${n}`, `Write the number: ${NUMBER_WORDS[n]}`, n); }));
        else push(take("to", () => tenOneQ(rng, 1, 2)));
        break;
      }
      case "NP-02": {
        if (r < 0.35) push(take("m1", () => moreLess(1, "+", ri(rng, 1, 99))));
        else if (r < 0.7) push(take("l1", () => moreLess(1, "−", ri(rng, 2, 100))));
        else push(take("between", () => { const n = ri(rng, 2, 98); return q(`between:${n}`, `What number is between ${n - 1} and ${n + 1}?`, n); }));
        break;
      }
      case "NP-03": {
        if (r < 0.3) push(take("2s", () => seqQ(rng, 2, 0, 8)));
        else if (r < 0.6) push(take("5s", () => seqQ(rng, 5, 0, 7)));
        else push(take("10s", () => seqQ(rng, 10, 0, 7)));
        break;
      }
      case "NP-04": {
        if (r < 0.3) push(take("to", () => tenOneQ(rng, 1, 9)));
        else if (r < 0.6) push(take("cmp", () => cmpQ(rng, 1, 99)));
        else if (r < 0.8) push(take("m10", () => moreLess(10, "+", ri(rng, 11, 89))));
        else push(take("l10", () => moreLess(10, "−", ri(rng, 21, 99))));
        break;
      }
      case "NP-05": {
        if (r < 0.2) push(take("3s", () => seqQ(rng, 3, 1, 9)));
        else if (r < 0.4) push(take("4s", () => seqQ(rng, 4, 1, 9)));
        else if (r < 0.6) push(take("8s", () => seqQ(rng, 8, 1, 7)));
        else if (r < 0.8) push(take("50s", () => seqQ(rng, 50, 2, 6)));
        else push(take("100s", () => seqQ(rng, 100, 1, 9)));
        break;
      }
      case "NP-06": {
        if (r < 0.25) push(take("hto", () => htoQ(rng)));
        else if (r < 0.45) push(take("m10", () => moreLess(10, "+", ri(rng, 11, 989))));
        else if (r < 0.55) push(take("l10", () => moreLess(10, "−", ri(rng, 21, 999))));
        else if (r < 0.75) push(take("m100", () => moreLess(100, "+", ri(rng, 105, 899))));
        else if (r < 0.85) push(take("l100", () => moreLess(100, "−", ri(rng, 205, 999))));
        else push(take("cmp", () => cmpQ(rng, 100, 999)));
        break;
      }
      case "NP-07": {
        if (r < 0.3) push(take("tho", () => thouQ(rng)));
        else if (r < 0.5) push(take("m1000", () => moreLess(1000, "+", ri(rng, 1000, 8999))));
        else if (r < 0.65) push(take("l1000", () => moreLess(1000, "−", ri(rng, 1001, 9999))));
        else if (r < 0.85) push(take("digit", () => digitQ(rng)));
        else push(take("cmp", () => cmpQ(rng, 1000, 9999)));
        break;
      }
      case "NP-08": {
        if (r < 0.4) push(take("r10", () => roundQ(10, ri(rng, 21, 9999))));
        else if (r < 0.75) push(take("r100", () => roundQ(100, ri(rng, 105, 9999))));
        else push(take("r1000", () => roundQ(1000, ri(rng, 1050, 9999))));
        break;
      }
      case "NP-09": {
        if (r < 0.4) push(take("neg", () => negQ(rng)));
        else if (r < 0.7) push(take("roman", () => { const n = ri(rng, 1, 100); return q(`roman:${toRoman(n)}`, `${toRoman(n)} = ?`, n, numOptions(rng, n)); }));
        else push(take("toroman", () => { const n = ri(rng, 1, 100); return q(`toroman:${n}`, `${n} in Roman numerals`, toRoman(n), romanOptions(rng, n, toRoman(n))); }));
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
