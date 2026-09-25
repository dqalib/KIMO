import { describe, expect, it } from "vitest";
import { PH_LEVELS, generatePhSet, levelWords, soundDistance, taughtGraphemes } from "./phonics";

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

describe("phonics levels", () => {
  it("has 16 levels, each with words", () => {
    expect(PH_LEVELS).toHaveLength(16);
    for (const l of PH_LEVELS) expect(levelWords(l.id).length, l.id).toBeGreaterThan(0);
  });

  it("taught sounds grow level by level", () => {
    expect(taughtGraphemes("PH-01")).toContain("s");
    expect(taughtGraphemes("PH-01")).not.toContain("sh");
    expect(taughtGraphemes("PH-06")).toContain("sh");
  });
});

describe("generatePhSet", () => {
  for (const level of PH_LEVELS) {
    it(`${level.id}: builds valid sets`, () => {
      for (let s = 1; s <= 25; s++) {
        const set = generatePhSet(level, {}, rng(s));
        expect(set).toHaveLength(level.id === "PH-16" ? 40 : level.setSize);
        expect(new Set(set.map((q) => `${q.kind}:${q.key}`)).size, "no repeats").toBe(set.length);
        const taught = taughtGraphemes(level.id);
        for (const q of set) {
          if (q.kind === "hear") {
            expect(q.options).toHaveLength(3);
            expect(new Set(q.options).size).toBe(3);
            expect(q.options[q.answer]).toBe(q.say);
          }
          if (q.kind === "missing") {
            expect(q.options).toHaveLength(3);
            expect(new Set(q.options).size).toBe(3);
            expect(q.options[q.answer]).toBe(q.graphemes[q.blank]);
            expect(q.graphemes.length).toBeGreaterThanOrEqual(3);
            // wrong answers are sounds the child has already been taught
            for (const o of q.options) expect(taught, `${o} taught by ${level.id}`).toContain(o);
          }
          if (q.kind === "real") expect(q.answer).toBe(q.word.real);
        }
      }
    });
  }

  it("PH-16 uses one whole practice paper, simpler section first", () => {
    const set = generatePhSet(PH_LEVELS[15], {}, rng(3));
    const words = set.map((q) => (q.kind === "read" ? q.word : null)!);
    expect(new Set(words.map((w) => w.paper)).size).toBe(1);
    expect(words.slice(0, 20).every((w) => w.section === 1)).toBe(true);
  });

  it("'hear' distractors usually differ by just one sound", () => {
    let close = 0, total = 0;
    for (let s = 1; s <= 40; s++) {
      for (const q of generatePhSet(PH_LEVELS[5], {}, rng(s))) {
        if (q.kind !== "hear") continue;
        const all = PH_LEVELS.slice(0, 6).flatMap((l) => levelWords(l.id));
        const target = all.find((w) => w.word === q.say)!;
        for (const o of q.options) {
          if (o === q.say) continue;
          total++;
          if (soundDistance(target, all.find((w) => w.word === o)!) === 1) close++;
        }
      }
    }
    expect(close / total).toBeGreaterThan(0.75);
  });

  it("practises tricky words more often", () => {
    const level = PH_LEVELS[3];
    const target = levelWords(level.id)[0].word;
    let withTricky = 0, without = 0;
    for (let s = 1; s <= 200; s++) {
      if (generatePhSet(level, { [target]: 3 }, rng(s)).some((q) => q.key === target)) withTricky++;
      if (generatePhSet(level, {}, rng(s)).some((q) => q.key === target)) without++;
    }
    expect(withTricky).toBeGreaterThan(without * 1.5);
  });
});
