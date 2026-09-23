import { describe, expect, it } from "vitest";
import { TT_LEVELS, generateSet, getLevel, factKey } from "./tt";
import { applySet, isPassingSet, LevelProgress } from "./mastery";

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

describe("TT levels", () => {
  it("has 16 levels in order", () => {
    expect(TT_LEVELS).toHaveLength(16);
    TT_LEVELS.forEach((l, i) => expect(l.order).toBe(i + 1));
  });

  it("in-order level runs 1× to 12×", () => {
    const set = generateSet(getLevel("TT-07")!);
    expect(set.map((q) => q.prompt)[0]).toBe("1 × 4");
    expect(set.at(-1)!.answer).toBe(48);
  });

  it("mixed sets have the right size, no repeats, and correct answers", () => {
    for (const l of TT_LEVELS.filter((x) => x.kind === "mixed")) {
      for (let s = 1; s <= 20; s++) {
        const set = generateSet(l, {}, seeded(s));
        expect(set).toHaveLength(l.setSize);
        expect(new Set(set.map((q) => q.prompt)).size).toBe(set.length);
        for (const q of set) {
          const m = q.prompt.match(/^(\?|\d+) ([×÷]) (\d+)(?: = (\d+))?$/)!;
          expect(m).not.toBeNull();
          const [, a, op, b, c] = m;
          if (a === "?") expect(q.answer * Number(b)).toBe(Number(c));
          else if (op === "×") expect(Number(a) * Number(b)).toBe(q.answer);
          else expect(Number(a) / Number(b)).toBe(q.answer);
        }
      }
    }
  });

  it("MTC rehearsal never tests ×0 or ×1", () => {
    const set = generateSet(getLevel("TT-16")!, {}, seeded(7));
    for (const q of set) expect(q.prompt).not.toMatch(/(^| )[01] ×|× [01]$/);
  });

  it("weights weak facts up", () => {
    const l = getLevel("TT-14")!;
    const weak = { [factKey(7, 8)]: 3 };
    let hits = 0;
    for (let s = 1; s <= 200; s++) {
      if (generateSet(l, weak, seeded(s)).some((q) => q.key === "7x8")) hits++;
    }
    let base = 0;
    for (let s = 1; s <= 200; s++) {
      if (generateSet(l, {}, seeded(s)).some((q) => q.key === "7x8")) base++;
    }
    expect(hits).toBeGreaterThan(base);
  });
});

describe("mastery gate", () => {
  const start: LevelProgress = { current: "TT-02", passed: ["TT-01"], passStreak: 0, failStreak: 0, flagged: false };
  const good = { total: 12, correctFirstTime: 12, durationMs: 40_000, secondsPerQuestion: 8 };
  const slow = { ...good, durationMs: 200_000 };
  const weak = { ...good, correctFirstTime: 9 };

  it("needs accuracy and speed", () => {
    expect(isPassingSet(good)).toBe(true);
    expect(isPassingSet(slow)).toBe(false);
    expect(isPassingSet(weak)).toBe(false);
  });

  it("passes the level after 2 good sets in a row", () => {
    const a = applySet(start, "TT-02", good, "TT-03", "TT-01");
    expect(a.outcome).toBe("setPassed");
    const b = applySet(a.progress, "TT-02", good, "TT-03", "TT-01");
    expect(b.outcome).toBe("levelPassed");
    expect(b.progress.current).toBe("TT-03");
    expect(b.progress.passed).toContain("TT-02");
  });

  it("a failed set resets the pass streak", () => {
    const a = applySet(start, "TT-02", good, "TT-03", "TT-01");
    const b = applySet(a.progress, "TT-02", weak, "TT-03", "TT-01");
    const c = applySet(b.progress, "TT-02", good, "TT-03", "TT-01");
    expect(c.outcome).toBe("setPassed");
  });

  it("drops back and flags after 3 fails in a row", () => {
    let p = start;
    let outcome = "";
    for (let i = 0; i < 3; i++) ({ progress: p, outcome } = applySet(p, "TT-02", weak, "TT-03", "TT-01"));
    expect(outcome).toBe("droppedBack");
    expect(p.current).toBe("TT-01");
    expect(p.flagged).toBe(true);
  });
});
