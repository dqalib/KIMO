import { describe, expect, it } from "vitest";
import { SP_LEVELS, cleanTyped, defaultSpStart, generateSpSet, getSpLevel, isCorrectSpelling, spLevelWords, spokenPrompt } from "./spelling";

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return s / 2 ** 31;
  };
}

describe("spelling levels", () => {
  it("has nine levels, each with enough words for a set", () => {
    expect(SP_LEVELS.map((l) => l.id)).toEqual(["SP-01", "SP-02", "SP-03", "SP-04", "SP-05", "SP-06", "SP-07", "SP-08", "SP-09"]);
    for (const l of SP_LEVELS) expect(spLevelWords(l.id).length).toBeGreaterThanOrEqual(l.setSize);
  });

  it("starts about a year below school year", () => {
    expect(defaultSpStart(1)).toBe("SP-01");
    expect(defaultSpStart(2)).toBe("SP-01");
    expect(defaultSpStart(3)).toBe("SP-03");
    expect(defaultSpStart(4)).toBe("SP-05");
  });
});

describe("marking", () => {
  it("ignores case for ordinary words", () => {
    expect(isCorrectSpelling("Because", "because")).toBe(true);
    expect(isCorrectSpelling(" because ", "because")).toBe(true);
    expect(isCorrectSpelling("becuase", "because")).toBe(false);
  });

  it("needs the capital where the word has one", () => {
    expect(isCorrectSpelling("Christmas", "Christmas")).toBe(true);
    expect(isCorrectSpelling("christmas", "Christmas")).toBe(false);
    expect(isCorrectSpelling("I'm", "I'm")).toBe(true);
  });

  it("accepts curly apostrophes", () => {
    expect(cleanTyped("can’t")).toBe("can't");
    expect(isCorrectSpelling("didn’t", "didn't")).toBe(true);
  });

  it("says the word, the sentence, then the word", () => {
    expect(spokenPrompt({ word: "said", sentence: "Mum said we could play." })).toBe("said. Mum said we could play. said.");
  });
});

describe("generateSpSet", () => {
  it("makes a set of different words from the level", () => {
    const level = getSpLevel("SP-05")!;
    const set = generateSpSet(level, {}, seeded(1));
    expect(set).toHaveLength(level.setSize);
    expect(new Set(set.map((w) => w.word)).size).toBe(set.length);
    const words = new Set(spLevelWords("SP-05").map((w) => w.word));
    for (const w of set) expect(words.has(w.word)).toBe(true);
  });

  it("never puts both words of a homophone pair in one set", () => {
    const level = getSpLevel("SP-08")!;
    for (let seed = 1; seed <= 50; seed++) {
      const set = generateSpSet(level, {}, seeded(seed));
      expect(set).toHaveLength(level.setSize);
      const inSet = new Set(set.map((w) => w.word));
      for (const w of set) for (const h of w.homophoneOf ?? []) expect(inSet.has(h)).toBe(false);
    }
  });

  it("brings back tricky words more often", () => {
    const level = getSpLevel("SP-05")!;
    let withTricky = 0;
    let without = 0;
    for (let seed = 1; seed <= 200; seed++) {
      if (generateSpSet(level, { believe: 3 }, seeded(seed)).some((w) => w.word === "believe")) withTricky++;
      if (generateSpSet(level, {}, seeded(seed)).some((w) => w.word === "believe")) without++;
    }
    expect(withTricky).toBeGreaterThan(without);
  });
});
