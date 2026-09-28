import { describe, expect, it } from "vitest";
import {
  defaultFRStart,
  FR_LEVELS,
  FRQuestion,
  generateFRSet,
  getFRLevel,
  nextFRLevel,
  prevFRLevel,
} from "./fr";

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** Independent expected answer, recomputed from the key only. */
function expected(q: FRQuestion): number | string {
  const parts = q.key.split(":");
  const rest = parts.slice(1);
  const num = rest.map((v) => (v === "x" ? NaN : Number(v)));
  switch (parts[0]) {
    case "of": return (num[2] * num[0]) / num[1];
    case "inv": return (num[2] * num[1]) / num[0];
    case "howmany": return num[0];
    case "eq": {
      const [n, d, rn, rd] = num;
      return Number.isNaN(rn) ? (n * rd) / d : (rn * d) / n; // blank numerator or denominator
    }
    case "cmp": {
      const left = num[0] * num[3];
      const right = num[2] * num[1];
      return left < right ? "<" : left > right ? ">" : "=";
    }
    case "add": return num[0] + num[1];
    case "sub": return num[0] - num[1];
    case "big": {
      const [a, b, c, d] = num;
      return a * d > c * b ? `${a}/${b}` : `${c}/${d}`;
    }
    case "dec": return num[0];
    case "hund": return (100 * num[0]) / num[1];
    case "todec": return decString(num[0], num[1]);
    case "same": return `${num[0] * num[2]}/${num[1] * num[2]}`;
    // FR-01 (Year 1): keys carry the shape name, so work from the raw parts
    case "shade": return `1/${rest[1]}`;
    case "halves":
    case "quarters": return rest[1] === "e" ? "Yes" : "No";
    case "pick": return `[[${rest[1]}:${rest[0]}:1]]`;
    case "half": return num[0] / 2;
    case "quarter": return num[0] / 4;
    default: throw new Error(`unknown key ${q.key}`);
  }
}

/** Exact decimal string for n/d, like the generator produces. */
function decString(n: number, d: number): string {
  return String(parseFloat((n / d).toFixed(2)));
}

const shapeOf = (q: FRQuestion) => q.key.split(":")[0];
const isCmp = (q: FRQuestion) => shapeOf(q) === "cmp";
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
/** Lowest-term form of "n/d". */
const reduced = (s: string) => {
  const [n, d] = s.split("/").map(Number);
  const g = gcd(n, d);
  return `${n / g}/${d / g}`;
};

function allSets(id: string, n = 220) {
  const level = getFRLevel(id)!;
  return Array.from({ length: n }, (_, i) => generateFRSet(level, {}, seeded(i + 1)));
}

function keypadAnswer(q: FRQuestion): boolean {
  return typeof q.answer === "number" && Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 1000;
}

describe("FR levels", () => {
  it("has 6 levels in order with years, sizes and time targets", () => {
    expect(FR_LEVELS).toHaveLength(6);
    expect(FR_LEVELS.map((l) => l.order)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(FR_LEVELS.map((l) => l.year)).toEqual([1, 2, 3, 3, 3, 4]);
    expect(FR_LEVELS.map((l) => l.setSize)).toEqual([10, 15, 15, 15, 15, 15]);
    expect(FR_LEVELS.map((l) => l.secondsPerQuestion)).toEqual([0, 10, 12, 12, 12, 15]);
  });

  it("links next/prev and picks the right default start", () => {
    expect(nextFRLevel("FR-02")!.id).toBe("FR-03");
    expect(nextFRLevel("FR-06")).toBeUndefined();
    expect(prevFRLevel("FR-05")!.id).toBe("FR-04");
    expect(prevFRLevel("FR-02")!.id).toBe("FR-01");
    expect(prevFRLevel("FR-01")).toBeUndefined();
    expect(getFRLevel("nope")).toBeUndefined();
    expect(defaultFRStart(1)).toBe("FR-01");
    expect(defaultFRStart(2)).toBe("FR-02");
    expect(defaultFRStart(3)).toBe("FR-03");
    expect(defaultFRStart(4)).toBe("FR-04");
  });
});

describe("FR sets", () => {
  it("every set has the right size, unique keys, ≥3 shapes, correct answers, options rule", () => {
    for (const level of FR_LEVELS) {
      for (const set of allSets(level.id)) {
        expect(set, level.id).toHaveLength(level.setSize);
        expect(new Set(set.map((q) => q.key)).size, `${level.id}: no repeated keys`).toBe(set.length);
        expect(new Set(set.map(shapeOf)).size, `${level.id}: ≥3 shapes`).toBeGreaterThanOrEqual(3);
        for (const q of set) {
          expect(q.answer, `${level.id}: ${q.key}`).toBe(expected(q));
          if (typeof q.answer === "number") expect(Number.isInteger(q.answer), q.key).toBe(true);
          const needsOptions = !keypadAnswer(q);
          expect(q.options !== undefined, `${level.id}: ${q.key} options rule`).toBe(needsOptions);
          if (q.options) {
            // "which is bigger" offers exactly the two fractions; Year 1 picks from ½/¼ or Yes/No
            const min = ["big", "shade", "halves", "quarters"].includes(shapeOf(q)) ? 2 : 3;
            expect(q.options.length, q.key).toBeGreaterThanOrEqual(min);
            expect(q.options.length, q.key).toBeLessThanOrEqual(4);
            expect(new Set(q.options).size, q.key).toBe(q.options.length);
            expect(q.options, q.key).toContain(String(q.answer));
            if (shapeOf(q) === "big") {
              const [, a, b, c, d] = q.key.split(":");
              expect([...q.options].sort(), q.key).toEqual([`${a}/${b}`, `${c}/${d}`].sort());
            }
          }
        }
      }
    }
  });

  it("divides exactly with amounts ≤ 100, and only curriculum denominators per year", () => {
    for (const set of allSets("FR-02")) {
      for (const q of set) {
        if (q.key.startsWith("of:") || q.key.startsWith("inv:")) {
          const [, n, d, a] = q.key.split(":").map(Number);
          expect([2, 3, 4], q.key).toContain(d);
          expect(n === 1 || (d === 4 && n === 3), q.key).toBe(true);
          if (q.key.startsWith("of:")) expect(a, q.key).toBeLessThanOrEqual(100);
        }
        if (q.key.startsWith("howmany:")) expect(Number(q.key.split(":")[1])).toBeLessThanOrEqual(4);
      }
    }
    // which key fields are denominators, per shape
    const DENOM_POS: Record<string, number[]> = {
      of: [1], inv: [1], howmany: [0], eq: [1, 3], cmp: [1, 3],
      add: [2], sub: [2], big: [1, 3], dec: [1], hund: [1], todec: [1], same: [1],
    };
    for (const id of ["FR-03", "FR-04", "FR-05"]) {
      for (const set of allSets(id)) {
        for (const q of set) {
          for (const i of DENOM_POS[shapeOf(q)] ?? []) {
            const v = q.key.split(":")[1 + i];
            if (v === "x") continue; // blank field in eq keys like eq:1:4:2:x
            const d = Number(v);
            expect(d, `${id}: ${q.key} denominator ≤ 10`).toBeLessThanOrEqual(10);
          }
        }
      }
    }
    for (const set of allSets("FR-06")) {
      for (const q of set) {
        if (q.key.startsWith("todec:") || q.key.startsWith("hund:")) {
          const d = Number(q.key.split(":")[2]);
          expect([2, 4, 5, 10, 20, 25, 50, 100], q.key).toContain(d);
        }
        if (q.key.startsWith("dec:")) expect([10, 100], q.key).toContain(Number(q.key.split(":")[2]));
      }
    }
  });

  it("FR-02: ¾ of an amount appears in every set", () => {
    for (const set of allSets("FR-02")) {
      expect(set.some((q) => q.key.startsWith("of:3:4:"))).toBe(true);
    }
  });

  it("FR-04: named equivalents are truly equivalent, confusions are not", () => {
    for (const set of allSets("FR-04")) {
      for (const q of set) {
        if (shapeOf(q) !== "same") continue;
        const [, n, d] = q.key.split(":").map(Number);
        expect(reduced(q.answer as string)).toBe(reduced(`${n}/${d}`));
        for (const o of q.options ?? []) {
          if (o === q.answer) continue; // the correct option IS equivalent
          expect(reduced(o), `${q.key}: ${o} not equivalent`).not.toBe(reduced(`${n}/${d}`));
        }
      }
    }
  });

  it("comparisons use [<, >, =] with = about 1 in 6", () => {
    for (const id of ["FR-04", "FR-05", "FR-06"]) {
      let eq = 0;
      let total = 0;
      for (const set of allSets(id)) {
        for (const q of set) {
          if (!isCmp(q)) continue;
          total++;
          expect(q.options).toEqual(["<", ">", "="]);
          if (q.answer === "=") eq++;
        }
      }
      expect(eq / total, id).toBeGreaterThan(0.05);
      expect(eq / total, id).toBeLessThan(0.45); // FR-05 also has a forced = starter
    }
  });

  it("FR-05: add and subtract stay within one whole, answers positive", () => {
    for (const set of allSets("FR-05")) {
      for (const q of set) {
        if (q.key.startsWith("add:")) {
          const [a, b, d] = q.key.split(":").slice(1).map(Number);
          expect(a + b, q.key).toBeLessThanOrEqual(d);
        }
        if (q.key.startsWith("sub:")) {
          const [a, b] = q.key.split(":").slice(1).map(Number);
          expect(a, q.key).toBeGreaterThan(b);
          expect(q.answer as number).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it("FR-06: decimals are exact to at most 2 dp with believable slips", () => {
    for (const set of allSets("FR-06")) {
      for (const q of set) {
        if (shapeOf(q) !== "todec") continue;
        const dp = (q.answer as string).split(".")[1] ?? "";
        expect(dp.length, q.key).toBeLessThanOrEqual(2);
        expect([3, 4], q.key).toContain(q.options?.length);
      }
    }
  });

  it("weights tricky keys up", () => {
    const level = getFRLevel("FR-05")!;
    const tricky = { "add:2:3:7": 3 };
    let hits = 0;
    for (let s = 1; s <= 200; s++) {
      if (generateFRSet(level, tricky, seeded(s)).some((q) => q.key === "add:2:3:7")) hits++;
    }
    let base = 0;
    for (let s = 1; s <= 200; s++) {
      if (generateFRSet(level, {}, seeded(s)).some((q) => q.key === "add:2:3:7")) base++;
    }
    expect(hits).toBeGreaterThan(base);
  });
});

describe("comparisons are ones the curriculum teaches (review of 008)", () => {
  it("Year 3: same denominator, unit fractions, or an equivalent pair; Year 4: tenths/hundredths", () => {
    for (const id of ["FR-04", "FR-05", "FR-06"]) {
      for (let seed = 1; seed <= 200; seed++) {
        const level = getFRLevel(id)!;
        for (const q of generateFRSet(level, {}, seeded(seed))) {
          const [shape, ...rest] = q.key.split(":");
          if (shape !== "cmp" && shape !== "big") continue;
          const [a, b, c, d] = rest.map(Number);
          const equivalent = a * d === c * b;
          if (id === "FR-06") {
            // a known equivalent against hundredths (1/4 ? 25/100), or tenths/hundredths
            expect(b === 100 || d === 100, q.key).toBe(true);
            if (!equivalent) {
              expect([10, 100], q.key).toContain(b);
              expect([10, 100], q.key).toContain(d);
            }
          } else {
            const ok = b === d || (a === 1 && c === 1) || (equivalent && Math.max(b, d) <= 10);
            expect(ok, q.key).toBe(true);
          }
        }
      }
    }
  });
});

describe("FR-01 halves and quarters of shapes (Year 1)", () => {
  it("cut questions draw the parts equal exactly when the answer is Yes", () => {
    for (const set of allSets("FR-01")) {
      for (const q of set) {
        if (q.key.startsWith("halves:") || q.key.startsWith("quarters:")) {
          const unequal = q.text.includes(":u]]");
          expect(q.answer, q.key).toBe(unequal ? "No" : "Yes");
          expect(q.text, q.key).toContain(q.key.startsWith("halves:") ? ":2:0" : ":4:0");
        }
        if (q.key.startsWith("pick:")) {
          // one right picture, one with the other fraction, one cut unequally
          expect(q.options!.filter((o) => o.includes(":u]]")), q.key).toHaveLength(1);
        }
        if (q.key.startsWith("half:") || q.key.startsWith("quarter:")) {
          expect(q.answer as number, q.key).toBeLessThanOrEqual(10);
          expect(q.answer as number, q.key).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });
});
