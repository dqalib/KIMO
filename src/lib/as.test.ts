import { describe, expect, it } from "vitest";
import {
  AS_LEVELS,
  ASQuestion,
  defaultASStart,
  generateASSet,
  getASLevel,
  nextASLevel,
  prevASLevel,
} from "./as";

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** Fill the blank (if any) with the answer and check both sides of any "=" agree. */
function isCorrect(q: ASQuestion): boolean {
  const blanks = q.text.match(/\?/g) ?? [];
  expect(blanks.length, q.text).toBeLessThanOrEqual(1);
  const filled = blanks.length ? q.text.replace("?", String(q.answer)) : q.text;
  const sides = filled.split(" = ").map((side) => {
    const t = side.trim().split(/\s+/);
    if (t.length === 1) return Number(t[0]);
    const [a, op, b] = t;
    return op === "+" ? Number(a) + Number(b) : Number(a) - Number(b);
  });
  return sides.every((s) => s === sides[0]) && (sides.length === 2 || sides[0] === q.answer);
}

/** The two numbers around the operator (blank filled with the answer). */
function operands(q: ASQuestion): { a: number; op: "+" | "−"; b: number } {
  const filled = q.text.replace("?", String(q.answer));
  const m = filled.match(/(\d+) ([+−]) (\d+)/)!;
  return { a: Number(m[1]), op: m[2] as "+" | "−", b: Number(m[3]) };
}

/** AS-02 "crosses 10": 8 + 5 or 15 − 7. */
function crosses10(q: ASQuestion): boolean {
  const { a, op, b } = operands(q);
  return op === "+" ? a % 10 + b > 10 : a % 10 < b;
}

/** AS-04 "crosses a tens boundary": 47 + 6 or 83 − 5 (tens jumps never do). */
function crossesTens(q: ASQuestion): boolean {
  const { a, op, b } = operands(q);
  if (op === "+") return b % 10 !== 0 && a % 10 + b >= 10;
  return a % 10 < b;
}

function isBond100(q: ASQuestion): boolean {
  return q.text.endsWith("= 100");
}

/** Blank position: first number, second number, or result-on-the-left. */
function blankPosition(q: ASQuestion): "first" | "second" | "left" {
  if (/^\? /.test(q.text)) return "first";
  if (/ \? = /.test(q.text)) return "second";
  return "left";
}

function allSets(id: string, n = 200) {
  const level = getASLevel(id)!;
  return Array.from({ length: n }, (_, i) => generateASSet(level, {}, seeded(i + 1)));
}

describe("AS levels", () => {
  it("has 5 levels in order with years, sizes and time targets", () => {
    expect(AS_LEVELS).toHaveLength(5);
    AS_LEVELS.forEach((l, i) => expect(l.order).toBe(i + 1));
    expect(AS_LEVELS.map((l) => l.year)).toEqual([1, 1, 1, 2, 2]);
    expect(AS_LEVELS.map((l) => l.setSize)).toEqual([15, 20, 15, 20, 15]);
    expect(AS_LEVELS.map((l) => l.secondsPerQuestion)).toEqual([6, 7, 10, 10, 15]);
  });

  it("links next/prev and picks the right default start", () => {
    expect(nextASLevel("AS-01")!.id).toBe("AS-02");
    expect(nextASLevel("AS-05")).toBeUndefined();
    expect(prevASLevel("AS-04")!.id).toBe("AS-03");
    expect(prevASLevel("AS-01")).toBeUndefined();
    expect(getASLevel("nope")).toBeUndefined();
    expect(defaultASStart(1)).toBe("AS-01");
    expect(defaultASStart(2)).toBe("AS-02");
    expect(defaultASStart(3)).toBe("AS-04");
    expect(defaultASStart(4)).toBe("AS-04");
  });

  it("every set has the right size, unique keys, correct answers and numbers 0–100", () => {
    for (const level of AS_LEVELS) {
      for (const set of allSets(level.id)) {
        expect(set).toHaveLength(level.setSize);
        expect(new Set(set.map((q) => q.key)).size, "no repeated keys").toBe(set.length);
        for (const q of set) {
          expect(isCorrect(q), q.text).toBe(true);
          for (const n of [q.answer, ...q.text.match(/\d+/g)!.map(Number)]) {
            expect(Number.isInteger(n), q.text).toBe(true);
            expect(n).toBeGreaterThanOrEqual(0);
            expect(n).toBeLessThanOrEqual(100);
          }
        }
      }
    }
  });

  it("mixes + and − roughly half and half on every level", () => {
    for (const level of AS_LEVELS) {
      let plus = 0;
      let total = 0;
      for (const set of allSets(level.id)) {
        for (const q of set) {
          total++;
          if (operands(q).op === "+") plus++;
        }
      }
      const share = plus / total;
      expect(share, level.id).toBeGreaterThan(0.3);
      expect(share, level.id).toBeLessThan(0.7);
    }
  });

  it("AS-01: bonds in both orders and 0+10 / 10+0 at most once per set", () => {
    const keys = new Set<string>();
    for (const set of allSets("AS-01")) {
      const zeroTen = set.filter((q) => q.key === "0+10" || q.key === "10+0");
      expect(zeroTen.length, "0+10/10+0 at most once").toBeLessThanOrEqual(1);
      for (const q of set) keys.add(q.key);
    }
    expect(keys.has("3+7"), "3+7 seen").toBe(true);
    expect(keys.has("7+3"), "7+3 seen").toBe(true);
  });

  it("AS-02: at least a third of questions cross 10 on average", () => {
    let cross = 0;
    let total = 0;
    for (const set of allSets("AS-02")) {
      for (const q of set) {
        total++;
        if (crosses10(q)) cross++;
      }
    }
    expect(cross / total).toBeGreaterThanOrEqual(1 / 3);
  });

  it("AS-03: the blank appears in every position in every set", () => {
    for (const set of allSets("AS-03")) {
      const positions = new Set(set.map(blankPosition));
      expect(positions.has("first"), "blank first").toBe(true);
      expect(positions.has("second"), "blank second").toBe(true);
      expect(positions.has("left"), "answer on the left").toBe(true);
    }
  });

  it("AS-04: at least half the questions cross a tens boundary on average", () => {
    let cross = 0;
    let total = 0;
    for (const set of allSets("AS-04")) {
      for (const q of set) {
        total++;
        if (crossesTens(q)) cross++;
      }
    }
    expect(cross / total).toBeGreaterThanOrEqual(0.5);
  });

  it("AS-05: about a third are bonds to 100; subtractions sometimes exchange", () => {
    let bonds = 0;
    let total = 0;
    let exchanging = 0;
    let sub2 = 0;
    for (const set of allSets("AS-05")) {
      for (const q of set) {
        total++;
        if (isBond100(q)) {
          bonds++;
          continue;
        }
        const { a, op, b } = operands(q);
        if (op === "−" && a >= 21 && b >= 12) {
          sub2++;
          if (a % 10 < b % 10) exchanging++;
        }
      }
    }
    expect(bonds / total).toBeGreaterThan(0.2);
    expect(bonds / total).toBeLessThan(0.45);
    expect(exchanging / sub2).toBeGreaterThan(0.2);
  });

  it("stays inside the level's scope", () => {
    for (const set of allSets("AS-01")) {
      for (const q of set) {
        const filled = q.text.replace("?", String(q.answer));
        const { a, op, b } = operands(q);
        if (!filled.includes("=")) {
          const bond = op === "+" ? a + b === 10 : a === 10;
          expect(bond, `${q.text} is a bond to 10`).toBe(true);
        } else {
          expect(filled.endsWith("= 10") || filled.startsWith("10 "), `${q.text} is a bond to 10`).toBe(true);
        }
      }
    }
    for (const id of ["AS-02", "AS-03"]) {
      for (const set of allSets(id)) {
        for (const q of set) {
          for (const n of [...q.text.match(/\d+/g)!.map(Number), q.answer]) {
            expect(n, `${id}: ${q.text} within 20`).toBeLessThanOrEqual(20);
          }
        }
      }
    }
    for (const set of allSets("AS-04")) {
      for (const q of set) {
        const { b } = operands(q);
        expect(b <= 9 || b % 10 === 0, `AS-04: ${q.text} is ± 1-digit or ± tens`).toBe(true);
      }
    }
    for (const set of allSets("AS-05")) {
      for (const q of set) {
        const { a, b } = operands(q);
        const two2digit = a >= 21 && b >= 12;
        expect(isBond100(q) || two2digit, `AS-05: ${q.text} in scope`).toBe(true);
      }
    }
  });

  it("weights tricky facts up", () => {
    const level = getASLevel("AS-05")!;
    const tricky = { "30+?=100": 3 };
    let hits = 0;
    for (let s = 1; s <= 200; s++) {
      if (generateASSet(level, tricky, seeded(s)).some((q) => q.key === "30+?=100")) hits++;
    }
    let base = 0;
    for (let s = 1; s <= 200; s++) {
      if (generateASSet(level, {}, seeded(s)).some((q) => q.key === "30+?=100")) base++;
    }
    expect(hits).toBeGreaterThan(base);
  });
});
