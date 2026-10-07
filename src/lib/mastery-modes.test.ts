import { describe, expect, it } from "vitest";
import { applySet, type LevelProgress, type SetResult } from "./mastery";

const p0: LevelProgress = { current: "SP-02", passed: ["SP-01"], passStreak: 0, failStreak: 0, flagged: false };
const r = (ok: number, mode?: SetResult["mode"]): SetResult => ({ total: 10, correctFirstTime: ok, durationMs: 1, secondsPerQuestion: 0, mode });

describe("practice and exam", () => {
  it("practice never moves the level, but counts great sets in a row (ready for the exam)", () => {
    let p = p0;
    for (let k = 0; k < 4; k++) p = applySet(p, "SP-02", r(10, "practice"), "SP-03", "SP-01").progress;
    expect(p.current).toBe("SP-02");
    expect(p.passStreak).toBe(4);
    expect(applySet(p, "SP-02", r(5, "practice"), "SP-03", "SP-01").progress.passStreak).toBe(0);
    // lots of bad practice never drops back
    let q = p0;
    for (let k = 0; k < 5; k++) q = applySet(q, "SP-02", r(2, "practice"), "SP-03", "SP-01").progress;
    expect(q).toMatchObject({ current: "SP-02", flagged: false });
  });

  it("passing one exam moves up a level", () => {
    const { progress, outcome } = applySet(p0, "SP-02", r(9, "exam"), "SP-03", "SP-01");
    expect(outcome).toBe("levelPassed");
    expect(progress).toMatchObject({ current: "SP-03", passed: ["SP-01", "SP-02"], passStreak: 0, failStreak: 0 });
  });

  it("three failed exams in a row drop back a level and flag it", () => {
    let p = p0;
    p = applySet(p, "SP-02", r(7, "exam"), "SP-03", "SP-01").progress;
    p = applySet(p, "SP-02", r(10, "practice"), "SP-03", "SP-01").progress; // practice in between doesn't reset exam fails
    p = applySet(p, "SP-02", r(8, "exam"), "SP-03", "SP-01").progress;
    const third = applySet(p, "SP-02", r(6, "exam"), "SP-03", "SP-01");
    expect(third.outcome).toBe("droppedBack");
    expect(third.progress).toMatchObject({ current: "SP-01", flagged: true });
  });

  it("no mode keeps the old rule (two passing sets)", () => {
    const a = applySet(p0, "SP-02", r(10), "SP-03", "SP-01");
    expect(a.outcome).toBe("setPassed");
    expect(applySet(a.progress, "SP-02", r(10), "SP-03", "SP-01").outcome).toBe("levelPassed");
  });
});
