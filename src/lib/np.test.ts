import { describe, expect, it } from "vitest";
import {
  defaultNPStart,
  generateNPSet,
  getNPLevel,
  nextNPLevel,
  NP_LEVELS,
  NPQuestion,
  prevNPLevel,
} from "./np";

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

// ---- independent expected-answer computation (from the key, not the text) ----

const ROMAN: [number, string][] = [
  [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
  [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];
function toRoman(n: number): string {
  let out = "";
  for (const [v, s] of ROMAN) while (n >= v) { out += s; n -= v; }
  return out;
}
function fromRoman(s: string): number {
  let n = 0;
  let i = 0;
  while (i < s.length) {
    for (const [v, r] of ROMAN) {
      if (s.startsWith(r, i)) { n += v; i += r.length; break; }
    }
  }
  return n;
}
function roundHalfUp(n: number, step: number): number {
  return Math.floor((n + step / 2) / step) * step;
}

function expected(q: NPQuestion): number | string {
  const parts = q.key.split(":");
  const shape = parts[0];
  const rest = parts.slice(1).map(Number);
  const ml = shape.match(/^([ml])(\d+)$/);
  if (ml) return (ml[1] === "m" ? 1 : -1) * Number(ml[2]) + rest[0];
  switch (shape) {
    case "cmp": return rest[0] < rest[1] ? "<" : rest[0] > rest[1] ? ">" : "=";
    case "after": return rest[0] + 1;
    case "before": return rest[0] - 1;
    case "write":
    case "between": return rest[0];
    case "to": return 10 * rest[0] + rest[1];
    case "hto": return 100 * rest[0] + 10 * rest[1] + rest[2];
    case "tho": return 1000 * rest[0] + 100 * rest[1] + 10 * rest[2] + rest[3];
    case "digit": {
      const [d, n] = rest;
      const pos = String(n).indexOf(String(d));
      return d * 10 ** (String(n).length - 1 - pos);
    }
    case "r10": return roundHalfUp(rest[0], 10);
    case "r100": return roundHalfUp(rest[0], 100);
    case "r1000": return roundHalfUp(rest[0], 1000);
    case "neg": return rest[1] - rest[0];
    case "roman": return fromRoman(parts[1]);
    case "toroman": return toRoman(rest[0]);
    default: {
      // counting sequences: key like "2s:4:1" (step, start index, blank slot)
      const step = Number(shape.replace(/s$/, ""));
      return (rest[0] + rest[1]) * step;
    }
  }
}

const shapeOf = (q: NPQuestion) => q.key.split(":")[0];
const isSeq = (q: NPQuestion) => /^\d+s$/.test(shapeOf(q));
const isCmp = (q: NPQuestion) => shapeOf(q) === "cmp";

function allSets(id: string, n = 220) {
  const level = getNPLevel(id)!;
  return Array.from({ length: n }, (_, i) => generateNPSet(level, {}, seeded(i + 1)));
}

function keypadAnswer(q: NPQuestion): boolean {
  return typeof q.answer === "number" && Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 10000;
}

describe("NP levels", () => {
  it("has 9 levels in order with years, sizes and time targets", () => {
    expect(NP_LEVELS).toHaveLength(9);
    NP_LEVELS.forEach((l, i) => expect(l.order).toBe(i + 1));
    expect(NP_LEVELS.map((l) => l.id)).toEqual([
      "NP-01", "NP-02", "NP-03", "NP-04", "NP-05", "NP-06", "NP-07", "NP-08", "NP-09",
    ]);
    expect(NP_LEVELS.map((l) => l.year)).toEqual([1, 1, 1, 2, 3, 3, 4, 4, 4]);
    expect(NP_LEVELS.map((l) => l.setSize)).toEqual(Array(9).fill(15));
    expect(NP_LEVELS.map((l) => l.secondsPerQuestion)).toEqual([8, 8, 10, 10, 10, 12, 12, 12, 15]);
  });

  it("links next/prev and picks the right default start", () => {
    expect(nextNPLevel("NP-01")!.id).toBe("NP-02");
    expect(nextNPLevel("NP-09")).toBeUndefined();
    expect(prevNPLevel("NP-06")!.id).toBe("NP-05");
    expect(prevNPLevel("NP-01")).toBeUndefined();
    expect(getNPLevel("nope")).toBeUndefined();
    expect(defaultNPStart(1)).toBe("NP-01");
    expect(defaultNPStart(2)).toBe("NP-02");
    expect(defaultNPStart(3)).toBe("NP-04");
    expect(defaultNPStart(4)).toBe("NP-06");
  });
});

describe("NP sets", () => {
  it("every set has the right size, unique keys, ≥3 shapes, correct answers, options rule", () => {
    for (const level of NP_LEVELS) {
      for (const set of allSets(level.id)) {
        expect(set, level.id).toHaveLength(level.setSize);
        expect(new Set(set.map((q) => q.key)).size, `${level.id}: no repeated keys`).toBe(set.length);
        expect(new Set(set.map(shapeOf)).size, `${level.id}: ≥3 shapes`).toBeGreaterThanOrEqual(3);
        for (const q of set) {
          expect(q.answer, `${level.id}: ${q.key}`).toBe(expected(q));
          // Roman numeral questions always carry options, even when the
          // answer itself would be keypad-able (e.g. "XIV = ?" → 14).
          const romanShape = shapeOf(q) === "roman" || shapeOf(q) === "toroman";
          const needsOptions = !keypadAnswer(q) || romanShape;
          expect(q.options !== undefined, `${level.id}: ${q.key} options rule`).toBe(needsOptions);
          if (q.options) {
            expect(q.options.length, q.key).toBeGreaterThanOrEqual(3);
            expect(q.options.length, q.key).toBeLessThanOrEqual(4);
            expect(new Set(q.options).size, q.key).toBe(q.options.length);
            expect(q.options, q.key).toContain(String(q.answer));
          } else {
            expect(keypadAnswer(q), q.key).toBe(true);
          }
          expect(String(q.answer).includes(","), q.key).toBe(false);
          // numbers ≥ 1,000 shown in text must carry a comma
          for (const tok of q.text.match(/\d[\d,]*/g) ?? []) {
            if (!tok.includes(",")) expect(Number(tok), `${q.key}: ${tok} needs a comma`).toBeLessThan(1000);
          }
        }
      }
    }
  });

  it("keeps comparisons on [<, >, =] with = about 1 in 6", () => {
    for (const id of ["NP-04", "NP-06", "NP-07"]) {
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
      expect(eq / total, id).toBeLessThan(0.35);
    }
  });

  it("puts the blank anywhere in counting sequences and does not always start at 0", () => {
    for (const id of ["NP-03", "NP-05"]) {
      const blanks = new Set<number>();
      let startZero = 0;
      let startElse = 0;
      for (const set of allSets(id)) {
        for (const q of set) {
          if (!isSeq(q)) continue;
          const [, idx, blank] = q.key.split(":").map(Number);
          blanks.add(blank);
          if (idx === 0) startZero++; else startElse++;
        }
      }
      expect(blanks, `${id}: blank in every position`).toEqual(new Set([0, 1, 2, 3]));
      expect(startElse, `${id}: not always starting at 0`).toBeGreaterThan(startZero);
    }
  });

  it("NP-02 crosses the tens boundary every set (39 → 40, 70 → 69)", () => {
    for (const set of allSets("NP-02")) {
      const cross = set.some((q) => {
        if (q.key.startsWith("m1:")) return Number(q.key.slice(3)) % 10 === 9;
        if (q.key.startsWith("l1:")) return Number(q.key.slice(3)) % 10 === 0;
        return false;
      });
      expect(cross).toBe(true);
    }
  });

  it("NP-06 crosses boundaries with 10 and 100 every set (395 + 10 = 405, 950 + 100 = 1050)", () => {
    for (const set of allSets("NP-06")) {
      const cross10 = set.some((q) => q.key.startsWith("m10:") && Number(q.key.slice(4)) % 10 !== 0);
      const cross100 = set.some((q) => q.key.startsWith("m100:") && Number(q.key.slice(5)) % 100 !== 0);
      expect(cross10).toBe(true);
      expect(cross100).toBe(true);
    }
  });

  it("NP-07 includes 1,000 more/less and digit-value questions, answers ≤ 10,000", () => {
    let less = 0;
    for (const set of allSets("NP-07")) {
      expect(set.some((q) => q.key.startsWith("m1000:"))).toBe(true);
      expect(set.some((q) => q.key.startsWith("digit:"))).toBe(true);
      if (set.some((q) => q.key.startsWith("l1000:"))) less++;
      for (const q of set) {
        if (typeof q.answer === "number") expect(q.answer).toBeLessThanOrEqual(10000);
      }
    }
    expect(less).toBeGreaterThan(100);
  });

  it("NP-08 includes halfway cases every set, rounding up (345 → 350, 250 → 300)", () => {
    for (const set of allSets("NP-08")) {
      expect(set.some((q) => q.key.startsWith("r10:") && Number(q.key.slice(4)) % 10 === 5)).toBe(true);
      expect(set.some((q) => q.key.startsWith("r100:") && Number(q.key.slice(5)) % 100 === 50)).toBe(true);
      expect(set.some((q) => q.key.startsWith("r1000:") && Number(q.key.slice(6)) % 1000 === 500)).toBe(true);
    }
  });

  it("NP-09: negatives −20..−1 with believable options; Roman numerals valid and round-trip", () => {
    for (let n = 1; n <= 100; n++) expect(fromRoman(toRoman(n))).toBe(n);
    for (const set of allSets("NP-09")) {
      expect(set.some((q) => shapeOf(q) === "roman")).toBe(true);
      expect(set.some((q) => shapeOf(q) === "toroman")).toBe(true);
      const negs = set.filter((q) => shapeOf(q) === "neg");
      expect(negs.length).toBeGreaterThanOrEqual(1);
      for (const q of negs) {
        const a = q.answer as number;
        expect(a).toBeLessThanOrEqual(-1);
        expect(a).toBeGreaterThanOrEqual(-20);
        expect(q.options).toHaveLength(3);
        expect(q.options).toContain(String(a));
        expect(q.options).toContain(String(-a)); // the classic sign slip
        expect(q.options).toContain(String(a - 2)); // off by two
      }
      for (const q of set) {
        if (shapeOf(q) === "roman") {
          expect(q.key.slice(6)).toMatch(/^[IVXLC]+$/);
          expect(typeof q.answer).toBe("number");
          expect(q.answer as number).toBeGreaterThanOrEqual(1);
          expect(q.answer as number).toBeLessThanOrEqual(100);
          // options are the believable numbers: "14" → 16, 12
          for (const o of q.options ?? []) expect(o).toMatch(/^\d+$/);
        }
        if (shapeOf(q) === "toroman") {
          expect(typeof q.answer).toBe("string");
          expect(q.answer as string).toMatch(/^[IVXLC]+$/);
        }
      }
    }
  });

  it("stays inside each level's number range", () => {
    for (const id of ["NP-01", "NP-02", "NP-03"]) {
      for (const set of allSets(id)) {
        for (const q of set) {
          if (typeof q.answer === "number") expect(q.answer, `${id}: ${q.key}`).toBeLessThanOrEqual(100);
        }
      }
    }
    for (const set of allSets("NP-04")) {
      for (const q of set) {
        if (typeof q.answer === "number") expect(q.answer, `NP-04: ${q.key}`).toBeLessThanOrEqual(100);
      }
    }
  });

  it("weights tricky keys up", () => {
    const level = getNPLevel("NP-06")!;
    const tricky = { "hto:5:0:8": 3 };
    let hits = 0;
    for (let s = 1; s <= 200; s++) {
      if (generateNPSet(level, tricky, seeded(s)).some((q) => q.key === "hto:5:0:8")) hits++;
    }
    let base = 0;
    for (let s = 1; s <= 200; s++) {
      if (generateNPSet(level, {}, seeded(s)).some((q) => q.key === "hto:5:0:8")) base++;
    }
    expect(hits).toBeGreaterThan(base);
  });
});
