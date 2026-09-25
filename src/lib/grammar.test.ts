import { describe, expect, it } from "vitest";
import { GP_LEVELS, defaultGpStart, generateGpSet, getGpLevel, gpQuestions, nextGpLevel, shuffleOptions, spokenGp } from "./grammar";

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return s / 2 ** 31;
  };
}

describe("grammar levels", () => {
  it("has twelve levels in order", () => {
    expect(GP_LEVELS.map((l) => l.id)).toEqual(Array.from({ length: 12 }, (_, i) => `GP-${String(i + 1).padStart(2, "0")}`));
    expect(nextGpLevel("GP-12")).toBeUndefined();
    expect(defaultGpStart(1)).toBe("GP-01");
    expect(defaultGpStart(3)).toBe("GP-03");
    expect(defaultGpStart(4)).toBe("GP-07");
  });
});

describe("generateGpSet", () => {
  it("makes a set of different questions with the right answer still marked", () => {
    const level = getGpLevel("GP-06")!;
    for (let seed = 1; seed <= 30; seed++) {
      const set = generateGpSet(level, {}, seeded(seed));
      expect(set).toHaveLength(level.setSize);
      expect(new Set(set.map((q) => q.id)).size).toBe(set.length);
      for (const q of set) {
        const original = gpQuestions("GP-06").find((x) => x.id === q.id)!;
        expect(q.options[q.answer]).toBe(original.options[original.answer]);
        expect([...q.options].sort()).toEqual([...original.options].sort());
      }
    }
  });

  it("keeps Yes before No", () => {
    const q = gpQuestions("GP-01").find((x) => x.style === "true-false")!;
    expect(shuffleOptions(q, seeded(3)).options).toEqual(["Yes", "No"]);
  });

  it("brings back tricky questions more often", () => {
    const level = getGpLevel("GP-03")!;
    let withTricky = 0;
    let without = 0;
    for (let seed = 1; seed <= 200; seed++) {
      if (generateGpSet(level, { "GP-03-001": 3 }, seeded(seed)).some((q) => q.id === "GP-03-001")) withTricky++;
      if (generateGpSet(level, {}, seeded(seed)).some((q) => q.id === "GP-03-001")) without++;
    }
    expect(withTricky).toBeGreaterThan(without);
  });

  it("reads the gap aloud as 'blank'", () => {
    expect(spokenGp({ id: "x", style: "fill-gap", prompt: "Pick one.", sentence: "I ate ___ apple.", options: ["a", "an"], answer: 1, why: "" })).toBe(
      "Pick one. I ate blank apple.",
    );
  });
});
