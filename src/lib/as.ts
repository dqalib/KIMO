// Addition & subtraction (AS) strand — levels and question generator.
// Source of truth: docs/skill-map.md section 3.
// Mirrors the style and API shape of tt.ts.

export interface ASLevel {
  id: string;
  order: number;
  year: number;
  title: string;
  setSize: number;
  secondsPerQuestion: number;
}

export interface ASQuestion {
  key: string; // stable fact key, e.g. "3+7", "17-9", "?+8=15"
  text: string; // what the child sees, e.g. "? + 8 = 15" — uses − (U+2212) and ? for the blank
  answer: number; // whole number 0–100
}

export const AS_LEVELS: ASLevel[] = [
  { id: "AS-01", order: 1, year: 1, title: "Number bonds to 10", setSize: 15, secondsPerQuestion: 6 },
  { id: "AS-02", order: 2, year: 1, title: "Add and subtract within 20", setSize: 20, secondsPerQuestion: 7 },
  { id: "AS-03", order: 3, year: 1, title: "Missing numbers within 20", setSize: 15, secondsPerQuestion: 10 },
  { id: "AS-04", order: 4, year: 2, title: "2-digit add and subtract", setSize: 20, secondsPerQuestion: 10 },
  { id: "AS-05", order: 5, year: 2, title: "Two 2-digit numbers; bonds to 100", setSize: 15, secondsPerQuestion: 15 },
];

export function getASLevel(id: string): ASLevel | undefined {
  return AS_LEVELS.find((l) => l.id === id);
}

export function nextASLevel(id: string): ASLevel | undefined {
  const l = getASLevel(id);
  return l ? AS_LEVELS.find((x) => x.order === l.order + 1) : undefined;
}

export function prevASLevel(id: string): ASLevel | undefined {
  const l = getASLevel(id);
  return l ? AS_LEVELS.find((x) => x.order === l.order - 1) : undefined;
}

export function defaultASStart(schoolYear: number): string {
  if (schoolYear >= 3) return "AS-04";
  if (schoolYear === 2) return "AS-02";
  return "AS-01";
}

type Rng = () => number;

/** Inclusive integer in [lo, hi]. */
function ri(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function q(key: string, text: string, answer: number): ASQuestion {
  return { key, text, answer };
}

// ---- question builders -------------------------------------------------
// All numbers shown and all answers are whole numbers 0–100, no negatives.

/** a + b, key order matters: 3+7 and 7+3 are different keys. */
function addFact(a: number, b: number): ASQuestion {
  return q(`${a}+${b}`, `${a} + ${b}`, a + b);
}

/** a − b. */
function subFact(a: number, b: number): ASQuestion {
  return q(`${a}-${b}`, `${a} − ${b}`, a - b);
}

/** ? + b = c. */
function blankFirstAdd(b: number, c: number): ASQuestion {
  return q(`?+${b}=${c}`, `? + ${b} = ${c}`, c - b);
}

/** ? − b = c. */
function blankFirstSub(b: number, c: number): ASQuestion {
  return q(`?-${b}=${c}`, `? − ${b} = ${c}`, c + b);
}

/** a + ? = c. */
function blankSecondAdd(a: number, c: number): ASQuestion {
  return q(`${a}+?=${c}`, `${a} + ? = ${c}`, c - a);
}

/** a − ? = b. */
function blankSecondSub(a: number, b: number): ASQuestion {
  return q(`${a}-?=${b}`, `${a} − ? = ${b}`, a - b);
}

/** c = a + ? (result on the left). */
function leftAdd(a: number, c: number): ASQuestion {
  return q(`${c}=${a}+?`, `${c} = ${a} + ?`, c - a);
}

/** c = ? − b (result on the left). */
function leftSub(b: number, c: number): ASQuestion {
  return q(`${c}=?-${b}`, `${c} = ? − ${b}`, c + b);
}

/** a + ? = 100 (bonds to 100, a a multiple of 5). */
function bond100(a: number): ASQuestion {
  return q(`${a}+?=100`, `${a} + ? = 100`, 100 - a);
}

// ---- per-level slot machines --------------------------------------------
// Each builder returns one question of a known shape; slots are weighted so
// + and − come out roughly half and half and the level rules hold on average.

type Slot = (rng: Rng) => ASQuestion | undefined;

/** AS-01: bonds to 10, both orders. */
function as01Add(rng: Rng): ASQuestion {
  const a = ri(rng, 0, 10);
  return addFact(a, 10 - a);
}
function as01Sub(rng: Rng): ASQuestion {
  return subFact(10, ri(rng, 1, 9));
}
function as01MissAdd(rng: Rng): ASQuestion {
  const b = ri(rng, 1, 10);
  return q(`?+${b}=10`, `? + ${b} = 10`, 10 - b);
}
function as01MissSub(rng: Rng): ASQuestion {
  const b = ri(rng, 1, 9);
  return blankSecondSub(10, b);
}

/** AS-02: addition within 20 that crosses 10 (8 + 5), or not (13 + 5). */
function as02Add(rng: Rng, cross: boolean): ASQuestion {
  for (let tries = 0; tries < 100; tries++) {
    const a = ri(rng, 2, 19);
    const b = ri(rng, 2, 10);
    if (a + b > 20) continue;
    if ((a % 10) + b > 10 === cross) return addFact(a, b);
  }
  return cross ? addFact(8, 5) : addFact(13, 5);
}

/** AS-02: subtraction within 20 that crosses 10 (15 − 7), or not (18 − 3). */
function as02Sub(rng: Rng, cross: boolean): ASQuestion {
  for (let tries = 0; tries < 100; tries++) {
    const a = ri(rng, 11, 20);
    const b = ri(rng, 2, 9);
    if ((a % 10) < b === cross) return subFact(a, b);
  }
  return cross ? subFact(15, 7) : subFact(18, 3);
}

/** AS-04: 2-digit + 1-digit crossing a tens boundary (47 + 6), or not. */
function as04Add1(rng: Rng, cross: boolean): ASQuestion {
  for (let tries = 0; tries < 100; tries++) {
    const a = ri(rng, 13, 99);
    const b = ri(rng, 3, 9);
    if (a + b > 100) continue;
    if ((a % 10) + b >= 10 === cross) return addFact(a, b);
  }
  return cross ? addFact(47, 6) : addFact(42, 6);
}

/** AS-04: 2-digit − 1-digit crossing a tens boundary (83 − 5), or not. */
function as04Sub1(rng: Rng, cross: boolean): ASQuestion {
  for (let tries = 0; tries < 100; tries++) {
    const a = ri(rng, 21, 99);
    const b = ri(rng, 3, 9);
    if (a % 10 === 0 || a - b < 11) continue;
    if ((a % 10) < b === cross) return subFact(a, b);
  }
  return cross ? subFact(83, 5) : subFact(86, 3);
}

/** AS-04: 2-digit ± tens (36 + 40, 70 − 20) — never regroups. */
function as04Tens(rng: Rng, op: "+" | "−"): ASQuestion {
  for (let tries = 0; tries < 100; tries++) {
    const a = ri(rng, 11, 99);
    const t = ri(rng, 1, 8);
    if (op === "+") {
      if (a + 10 * t <= 100) return addFact(a, 10 * t);
    } else if (a - 10 * t >= 11) {
      return subFact(a, 10 * t);
    }
  }
  return op === "+" ? addFact(36, 40) : subFact(70, 20);
}

/** AS-05: two 2-digit numbers added, sum ≤ 100. */
function as05Add2(rng: Rng): ASQuestion {
  for (let tries = 0; tries < 100; tries++) {
    const a = ri(rng, 21, 78);
    const b = ri(rng, 21, 100 - a);
    if (b >= 21) return addFact(a, b);
  }
  return addFact(34, 25);
}

/** AS-05: two 2-digit numbers subtracted; exchanging (62 − 27) half the time. */
function as05Sub2(rng: Rng, exchange: boolean): ASQuestion {
  for (let tries = 0; tries < 100; tries++) {
    const a = ri(rng, 43, 99);
    const b = ri(rng, 12, a - 11);
    if ((a % 10) < b % 10 === exchange) return subFact(a, b);
  }
  return exchange ? subFact(62, 27) : subFact(65, 24);
}

/**
 * Build one practice set.
 * Facts the child has got wrong before (tricky) are 3× as likely, like tt.ts.
 * No repeated key within a set; + and − roughly half and half on every level.
 */
export function generateASSet(
  level: ASLevel,
  tricky: Record<string, number> = {},
  rng: Rng = Math.random,
): ASQuestion[] {
  const weight = (key: string) => 1 + 2 * Math.min(tricky[key] ?? 0, 3);

  const used = new Set<string>();
  const out: ASQuestion[] = [];
  const push = (qq: ASQuestion | undefined) => {
    if (!qq || used.has(qq.key)) return false;
    used.add(qq.key);
    out.push(qq);
    return true;
  };

  // Candidate pools per shape, topped up on demand and pruned of used keys,
  // so tricky facts can be weighted up like in tt.ts without repeats.
  const pools = new Map<string, ASQuestion[]>();
  const take = (shape: string, build: () => ASQuestion): ASQuestion | undefined => {
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
    const weighted: { q: ASQuestion; w: number }[] = pool.map((p) => ({ q: p, w: weight(p.key) }));
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

  // Opening slots are fixed shapes so every set covers the level's rules.
  let starters: Slot[] = [];
  if (level.id === "AS-01") starters = [as01Add, as01Sub, as01Add, as01Sub];
  if (level.id === "AS-02") starters = [() => as02Add(rng, true), () => as02Sub(rng, true), () => as02Add(rng, false), () => as02Sub(rng, false)];
  if (level.id === "AS-03") starters = [
    () => take("bf+", () => { const b = ri(rng, 2, 10); return blankFirstAdd(b, b + ri(rng, 2, 20 - b)); }),
    () => take("bs+", () => { const a = ri(rng, 2, 10); return blankSecondAdd(a, a + ri(rng, 2, 20 - a)); }),
    () => take("left−", () => { const b = ri(rng, 2, 9); return leftSub(b, ri(rng, b + 1, 20 - b)); }),
  ];
  if (level.id === "AS-04") starters = [() => as04Add1(rng, true), () => as04Sub1(rng, true), () => as04Tens(rng, "+"), () => as04Tens(rng, "−")];
  if (level.id === "AS-05") starters = [as05Add2, () => as05Sub2(rng, true), () => as05Sub2(rng, false), () => take("b100", () => bond100(5 * ri(rng, 1, 19)))];

  for (const slot of starters) {
    for (let tries = 0; tries < 20 && out.length < starters.length && out.length < level.setSize; tries++) {
      if (push(slot(rng))) break;
    }
  }

  while (out.length < level.setSize) {
    const before = out.length;
    const r = rng();
    switch (level.id) {
      case "AS-01": {
        if (r < 0.25) push(take("a+", () => as01Add(rng)));
        else if (r < 0.5) push(take("a−", () => as01Sub(rng)));
        else if (r < 0.75) push(take("a?+", () => as01MissAdd(rng)));
        else push(take("a−?", () => as01MissSub(rng)));
        break;
      }
      case "AS-02": {
        if (r < 0.2) push(take("b+cross", () => as02Add(rng, true)));
        else if (r < 0.35) push(take("b+plain", () => as02Add(rng, false)));
        else if (r < 0.55) push(take("b−cross", () => as02Sub(rng, true)));
        else if (r < 0.7) push(take("b−plain", () => as02Sub(rng, false)));
        else if (r < 0.85) push(take("b20+", () => blankFirstAdd(ri(rng, 11, 19), 20)));
        else push(take("b20−", () => subFact(20, ri(rng, 3, 17))));
        break;
      }
      case "AS-03": {
        if (r < 0.2) push(take("bf+", () => { const b = ri(rng, 2, 10); return blankFirstAdd(b, b + ri(rng, 2, 20 - b)); }));
        else if (r < 0.3) push(take("bf−", () => blankFirstSub(ri(rng, 2, 9), ri(rng, 1, 11))));
        else if (r < 0.5) push(take("bs+", () => { const a = ri(rng, 2, 10); return blankSecondAdd(a, a + ri(rng, 2, 20 - a)); }));
        else if (r < 0.62) push(take("bs−", () => { const a = ri(rng, 3, 20); return blankSecondSub(a, ri(rng, 1, a - 1)); }));
        else if (r < 0.81) push(take("left+", () => { const a = ri(rng, 2, 10); return leftAdd(a, a + ri(rng, 2, 20 - a)); }));
        else push(take("left−", () => { const b = ri(rng, 2, 9); return leftSub(b, ri(rng, b + 1, 20 - b)); }));
        break;
      }
      case "AS-04": {
        if (r < 0.35) push(take("d+cross", () => as04Add1(rng, true)));
        else if (r < 0.7) push(take("d−cross", () => as04Sub1(rng, true)));
        else if (r < 0.85) push(take("d+t", () => as04Tens(rng, "+")));
        else push(take("d−t", () => as04Tens(rng, "−")));
        break;
      }
      case "AS-05": {
        if (r < 0.28) push(take("e+2", () => as05Add2(rng)));
        else if (r < 0.72) push(take("e−2", () => as05Sub2(rng, rng() < 0.5)));
        else push(take("b100", () => bond100(5 * ri(rng, 1, 19))));
        break;
      }
    }
    if (out.length === before) {
      // every shape ran dry (shouldn't happen with these pools) — retry the
      // opening shapes, then give up rather than loop forever
      for (const slot of starters) {
        if (push(slot(rng))) break;
      }
    }
    if (out.length === before) break;
  }

  // AS-01 rule: 0 + 10 and 10 + 0 at most once per set (different keys).
  if (level.id === "AS-01") {
    const zeroTen = out.filter((qq) => qq.key === "0+10" || qq.key === "10+0");
    if (zeroTen.length > 1) {
      const dropIdx = out.findIndex((qq) => qq.key === zeroTen[1].key);
      out.splice(dropIdx, 1);
      for (let tries = 0; tries < 20 && !push(as01Sub(rng)); tries++);
    }
  }

  return out;
}
