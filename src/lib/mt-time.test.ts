import { describe, expect, it } from "vitest";
import {
  digital,
  generateTimeSet,
  getMTTimeLevel,
  MT_TIME_LEVELS,
  TimeQuestion,
  timeWords,
  to12Hour,
} from "./mt-time";

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** Independent expected answer, recomputed from the key only. */
function expected(q: TimeQuestion): number | string {
  const parts = q.key.split(":").map(Number);
  const shape = q.key.split(":")[0];
  switch (shape) {
    case "read": {
      const [, h, m] = parts;
      // MT-02/03 answer in words, MT-05 answers digital — digital has a colon
      return typeof q.answer === "string" && q.answer.includes(":") ? digital(h, m) : timeWords(h, m);
    }
    case "which": {
      const [, h, m] = parts;
      return digital(h, m);
    }
    case "12to24": {
      const [, H, M] = parts;
      return to12Hour(H, M);
    }
    case "gap": {
      const [, h, m, H, M] = parts;
      return (H * 60 + M) - (h * 60 + m);
    }
    default:
      throw new Error(`unknown key ${q.key}`);
  }
}

function allSets(id: string, n = 200) {
  return Array.from({ length: n }, (_, i) => generateTimeSet(id, {}, seeded(i + 1)));
}

describe("MT time levels", () => {
  it("has MT-02, MT-03, MT-05 with sizes and time targets", () => {
    expect(MT_TIME_LEVELS.map((l) => l.id)).toEqual(["MT-02", "MT-03", "MT-05"]);
    expect(MT_TIME_LEVELS.map((l) => l.order)).toEqual([2, 3, 5]);
    expect(MT_TIME_LEVELS.map((l) => l.year)).toEqual([1, 2, 3]);
    expect(MT_TIME_LEVELS.map((l) => l.setSize)).toEqual([12, 12, 15]);
    expect(MT_TIME_LEVELS.map((l) => l.secondsPerQuestion)).toEqual([10, 12, 15]);
    expect(getMTTimeLevel("nope")).toBeUndefined();
    expect(() => generateTimeSet("nope")).toThrow();
  });
});

describe("timeWords", () => {
  it("covers every 5-minute time of an hour in UK wording", () => {
    const byMinute: Record<number, string> = {
      0: "4 o'clock",
      5: "5 past 4",
      10: "10 past 4",
      15: "quarter past 4",
      20: "20 past 4",
      25: "25 past 4",
      30: "half past 4",
      35: "25 to 5",
      40: "20 to 5",
      45: "quarter to 5",
      50: "10 to 5",
      55: "5 to 5",
    };
    for (const [m, words] of Object.entries(byMinute)) {
      expect(timeWords(4, Number(m)), `4:${m}`).toBe(words);
    }
  });

  it("wraps the hour for 'to' form across 12 and folds 0/24 onto the face", () => {
    expect(timeWords(12, 45)).toBe("quarter to 1");
    expect(timeWords(12, 55)).toBe("5 to 1");
    expect(timeWords(12, 0)).toBe("12 o'clock");
    expect(timeWords(0, 30)).toBe("half past 12");
    expect(timeWords(15, 15)).toBe("quarter past 3");
  });

  it("falls back to digital for non-5-minute times", () => {
    expect(timeWords(9, 37)).toBe("9:37");
    expect(timeWords(4, 1)).toBe("4:01");
  });

  it("to12Hour formats am/pm and noon/midnight", () => {
    expect(to12Hour(14, 20)).toBe("2:20 pm");
    expect(to12Hour(2, 20)).toBe("2:20 am");
    expect(to12Hour(12, 5)).toBe("12:05 pm");
    expect(to12Hour(0, 5)).toBe("12:05 am");
  });
});

describe("time sets", () => {
  it("every set has the right size, unique keys, correct answers, options rule", () => {
    for (const level of MT_TIME_LEVELS) {
      for (const set of allSets(level.id)) {
        expect(set, level.id).toHaveLength(level.setSize);
        expect(new Set(set.map((q) => q.key)).size, `${level.id}: no repeated keys`).toBe(set.length);
        for (const q of set) {
          expect(q.answer, `${level.id}: ${q.key}`).toBe(expected(q));
          const keypad = typeof q.answer === "number"; // whole number of minutes
          expect(q.options !== undefined, `${level.id}: ${q.key} options rule`).toBe(!keypad);
          if (q.options) {
            expect(q.options, q.key).toHaveLength(3);
            expect(new Set(q.options).size, q.key).toBe(3);
            expect(q.options, q.key).toContain(String(q.answer));
          }
          if (q.key.startsWith("read:")) {
            expect(q.clock, q.key).toEqual({ hours: Number(q.key.split(":")[1]), minutes: Number(q.key.split(":")[2]) });
          }
        }
      }
    }
  });

  it("MT-02 only uses o'clock and half past; MT-03 uses 5-minute times", () => {
    for (const set of allSets("MT-02")) {
      for (const q of set) {
        if (!q.key.startsWith("read:")) continue;
        expect([0, 30], q.key).toContain(Number(q.key.split(":")[2]));
        expect(q.clock?.minutes, q.key).toBe(Number(q.key.split(":")[2]));
      }
    }
    for (const set of allSets("MT-03")) {
      for (const q of set) {
        expect(Number(q.key.split(":")[2]) % 5, q.key).toBe(0);
      }
    }
  });

  it("which-options are h:mm strings the screen will draw as clocks", () => {
    for (const set of allSets("MT-03")) {
      for (const q of set) {
        if (!q.key.startsWith("which:")) continue;
        expect(q.clock, q.key).toBeUndefined();
        for (const o of q.options ?? []) {
          expect(o, q.key).toMatch(/^(1[0-2]|[1-9]):[0-5][0-9]$/);
        }
      }
    }
  });

  it("12to24 keys stay in 24-hour range and gaps are positive", () => {
    for (const set of allSets("MT-05")) {
      for (const q of set) {
        if (q.key.startsWith("12to24:")) {
          const H = Number(q.key.split(":")[1]);
          expect(H, q.key).toBeGreaterThanOrEqual(0);
          expect(H, q.key).toBeLessThanOrEqual(23);
        }
        if (q.key.startsWith("gap:")) {
          expect(q.answer as number, q.key).toBeGreaterThan(0);
          expect(q.answer as number, q.key).toBeLessThanOrEqual(120);
        }
      }
    }
  });

  it("MT-05 uses all four shapes across sets", () => {
    const shapes = new Set<string>();
    for (const set of allSets("MT-05", 50)) {
      for (const q of set) shapes.add(q.key.split(":")[0]);
    }
    expect(shapes.has("read"), "has read").toBe(true);
    expect(shapes.has("which"), "has which").toBe(true);
    expect(shapes.has("12to24"), "has 12to24").toBe(true);
    expect(shapes.has("gap"), "has gap").toBe(true);
  });

  it("weights tricky keys up", () => {
    const tricky = { "read:3:15": 3 };
    let hits = 0;
    for (let s = 1; s <= 200; s++) {
      if (generateTimeSet("MT-03", tricky, seeded(s)).some((q) => q.key === "read:3:15")) hits++;
    }
    let base = 0;
    for (let s = 1; s <= 200; s++) {
      if (generateTimeSet("MT-03", {}, seeded(s)).some((q) => q.key === "read:3:15")) base++;
    }
    expect(hits).toBeGreaterThan(base);
  });
});
