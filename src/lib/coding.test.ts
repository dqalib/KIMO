import { describe, expect, it } from "vitest";
import { ALL_TERMS, CW_LEVELS, cwExtras, cwLevelTerms, generateCwSet, getTerm, termQuestion } from "./coding";

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return s / 2 ** 31;
  };
}

describe("coding words content", () => {
  it("has six levels with unique term ids, each with enough words", () => {
    expect(CW_LEVELS.map((l) => l.id)).toEqual(["CW-01", "CW-02", "CW-03", "CW-04", "CW-05", "CW-06"]);
    expect(new Set(ALL_TERMS.map((t) => t.id)).size).toBe(ALL_TERMS.length);
    for (const l of CW_LEVELS) expect(cwLevelTerms(l.id).length).toBeGreaterThanOrEqual(8);
  });

  it("includes the basics (monitor, RAM, loop…)", () => {
    for (const id of ["monitor", "keyboard", "ram", "processor", "loop", "algorithm", "bug", "variable", "internet", "wifi"]) expect(getTerm(id), id).toBeDefined();
  });

  it("every term has a meaning, an example and an emoji; avoid-lists point at real terms", () => {
    for (const t of ALL_TERMS) {
      expect(t.meaning.length, t.id).toBeGreaterThan(10);
      expect(t.example.length, t.id).toBeGreaterThan(10);
      expect(t.emoji.length, t.id).toBeGreaterThan(0);
      for (const a of t.avoid ?? []) expect(getTerm(a), `${t.id} avoid ${a}`).toBeDefined();
    }
  });

  it("extra questions have the right answer first in the file and distinct options", () => {
    for (const l of CW_LEVELS)
      for (const x of cwExtras(l.id)) {
        expect(x.answer).toBe(0);
        expect(new Set(x.options).size, x.prompt).toBe(x.options.length);
      }
  });
});

describe("questions", () => {
  it("one right answer, no near-synonyms as wrong answers, distinct options", () => {
    for (let seed = 1; seed <= 20; seed++)
      for (const t of ALL_TERMS)
        for (const kind of ["m", "w"] as const) {
          const q = termQuestion(t, kind, 4, seeded(seed));
          expect(q.options).toHaveLength(4);
          expect(new Set(q.options).size).toBe(4);
          expect(q.options[q.answer]).toBe(kind === "m" ? t.meaning : t.term);
          for (const a of t.avoid ?? []) expect(q.options).not.toContain(kind === "m" ? getTerm(a)!.meaning : getTerm(a)!.term);
        }
  });
});

describe("generateCwSet", () => {
  const level = CW_LEVELS[1];

  it("first set: up to 4 new words to learn, each asked about, 10 questions", () => {
    const set = generateCwSet(level, new Set(), [], {}, seeded(3));
    expect(set.learn).toHaveLength(4);
    expect(set.questions).toHaveLength(10);
    for (const t of set.learn) expect(set.questions.some((q) => q.termId === t.id)).toBe(true);
    expect(set.questions.some((q) => q.review)).toBe(false);
  });

  it("puts up to 3 due words from earlier levels first, marked as review", () => {
    const seen = new Set([...cwLevelTerms("CW-01"), ...cwLevelTerms("CW-02")].map((t) => t.id));
    const set = generateCwSet(level, seen, ["monitor", "mouse", "printer", "webcam"], {}, seeded(5));
    expect(set.learn).toHaveLength(0);
    expect(set.questions.slice(0, 3).map((q) => [q.termId, q.review])).toEqual([
      ["monitor", true],
      ["mouse", true],
      ["printer", true],
    ]);
    expect(set.questions.filter((q) => !q.review)).toHaveLength(10);
  });

  it("brings missed words back more often", () => {
    const seen = new Set(cwLevelTerms("CW-02").map((t) => t.id));
    let withTricky = 0;
    let without = 0;
    for (let seed = 1; seed <= 200; seed++) {
      if (generateCwSet(level, seen, [], { "ram:m": 3 }, seeded(seed)).questions.some((q) => q.termId === "ram")) withTricky++;
      if (generateCwSet(level, seen, [], {}, seeded(seed)).questions.some((q) => q.termId === "ram")) without++;
    }
    expect(withTricky).toBeGreaterThan(without);
  });
});
