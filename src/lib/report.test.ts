import { describe, expect, it } from "vitest";
import { dailyGoal, dayStreak, DEFAULT_DAILY_GOAL, subjectOf, trickyItems, weekSummary } from "./report";
import type { AppState, Attempt } from "./store-types";

const now = new Date("2026-09-26T18:00:00");
const daysAgo = (n: number, h = 17) => {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  d.setHours(h, 0, 0, 0);
  return d.toISOString();
};
let n = 0;
const att = (levelId: string, finishedAt: string, extra: Partial<Attempt> = {}): Attempt => ({
  id: String(n++),
  childId: "y",
  levelId,
  finishedAt,
  total: 10,
  correctFirstTime: 9,
  durationMs: 120000,
  secondsPerQuestion: 0,
  outcome: "setPassed",
  wrong: [],
  ...extra,
});
const base = (attempts: Attempt[], extra: Partial<AppState> = {}): AppState => ({
  version: 1,
  children: [{ id: "y", name: "Y", schoolYear: 3, avatar: "🦊", color: "#000" }],
  tt: {},
  weakFacts: {},
  attempts,
  ...extra,
});

describe("report", () => {
  it("names subjects from level ids", () => {
    expect(subjectOf("TT-04")).toBe("Times tables");
    expect(subjectOf("GP-10")).toBe("Grammar");
    expect(subjectOf("XX-01")).toBe("XX-01");
  });

  it("counts a streak from today, or from yesterday if nothing yet today", () => {
    expect(dayStreak([att("TT-01", daysAgo(0)), att("TT-01", daysAgo(1)), att("TT-01", daysAgo(3))], "y", now)).toBe(2);
    expect(dayStreak([att("TT-01", daysAgo(1)), att("TT-01", daysAgo(2))], "y", now)).toBe(2);
    expect(dayStreak([att("TT-01", daysAgo(2))], "y", now)).toBe(0);
  });

  it("summarises the last 7 days against the daily goal", () => {
    const s = base(
      [
        att("TT-01", daysAgo(0)),
        att("SP-03", daysAgo(0), { correctFirstTime: 7 }),
        att("TT-01", daysAgo(2), { outcome: "levelPassed" }),
        att("TT-01", daysAgo(9)), // too old
      ],
      { dailyGoal: { y: { sets: 2, at: daysAgo(5) } } },
    );
    const w = weekSummary(s, "y", now);
    expect(w.sets).toBe(3);
    expect(w.minutes).toBe(6);
    expect(w.levelsPassed).toEqual(["TT-01"]);
    expect(w.days).toHaveLength(7);
    expect(w.days[6]).toMatchObject({ sets: 2, goalMet: true });
    expect(w.days[4]).toMatchObject({ sets: 1, goalMet: false });
    expect(w.bySubject[0]).toEqual({ subject: "Times tables", sets: 2, accuracy: 0.9 });
    expect(w.bySubject[1]).toEqual({ subject: "Spelling", sets: 1, accuracy: 0.7 });
  });

  it("uses the default goal until the parent sets one", () => {
    expect(dailyGoal(base([]), "y")).toBe(DEFAULT_DAILY_GOAL);
    expect(dailyGoal(base([], { dailyGoal: { y: { sets: 4, at: now.toISOString() } } }), "y")).toBe(4);
  });

  it("lists tricky items from every subject, most missed first", () => {
    const s = base([], {
      weakFacts: { y: { "7x8": 3 } },
      asTricky: { y: { "17-9": 2, "?+8=15": 1 } },
      spTricky: { y: { because: 4 } },
      gpTricky: { y: { "GP-03-001": 1 } },
    });
    const t = trickyItems(s, "y");
    expect(t[0]).toEqual({ subject: "Spelling", label: "because", count: 4 });
    expect(t[1]).toEqual({ subject: "Times tables", label: "7 × 8", count: 3 });
    expect(t[2]).toEqual({ subject: "Adding & taking away", label: "17 − 9", count: 2 });
    expect(t.map((x) => x.label)).toContain("? + 8 = 15");
    expect(t.find((x) => x.subject === "Grammar")!.label).toContain("Which word is a verb?");
  });
});

describe("numbers labels", () => {
  it("turns question keys into readable text", async () => {
    const { npLabel } = await import("./report");
    expect(npLabel("r100:250")).toBe("round 250 to the nearest 100");
    expect(npLabel("m10:395")).toBe("10 more than 395");
    expect(npLabel("l1000:8413")).toBe("1000 less than 8413");
    expect(npLabel("cmp:63:36")).toBe("63 ? 36");
    expect(npLabel("2s:4:1")).toBe("counting in 2s");
    expect(npLabel("toroman:29")).toBe("29 in Roman numerals");
  });
});

describe("childReport", () => {
  it("summarises 30 days, subjects with level position and trend, memory and tricky items", async () => {
    const { childReport } = await import("./report");
    const { applyAnswers } = await import("./memory");
    const s = base(
      [
        att("SP-03", daysAgo(10), { correctFirstTime: 6 }),
        att("SP-03", daysAgo(2), { correctFirstTime: 9 }),
        att("SP-03", daysAgo(1), { correctFirstTime: 10, outcome: "levelPassed" }),
        att("CW-01", daysAgo(0)),
      ],
      {
        sp: { y: { current: "SP-04", passed: ["SP-03"], passStreak: 0, failStreak: 0, flagged: false } },
        spTricky: { y: { because: 2 } },
        memory: { y: applyAnswers({}, [{ key: "sp:said", ok: true }, { key: "cw:loop", ok: false }], new Date(daysAgo(3))) },
      },
    );
    const levels = (code: string, n: number) => Array.from({ length: n }, (_, k) => ({ id: `${code}-${String(k + 1).padStart(2, "0")}`, title: `L${k + 1}` }));
    const r = childReport(
      s,
      "y",
      [
        { code: "SP", name: "Spelling", levels: levels("SP", 18), progress: s.sp!.y, shown: true },
        { code: "CW", name: "Coding words", levels: levels("CW", 6), shown: true },
        { code: "PH", name: "Phonics", levels: levels("PH", 16), shown: false },
      ],
      now,
    );
    expect(r.days).toHaveLength(30);
    expect(r.sets30).toBe(4);
    expect(r.sets7).toBe(3);
    const sp = r.subjects.find((x) => x.code === "SP")!;
    expect(sp).toMatchObject({ levelId: "SP-04", levelNo: 4, levelCount: 18, levelsPassed: 1, sets30: 3 });
    expect(sp.accuracyThisWeek).toBeCloseTo(0.95);
    expect(sp.accuracyLastWeek).toBeCloseTo(0.6);
    expect(r.subjects.map((x) => x.code)).toEqual(["SP", "CW"]); // phonics hidden and never practised
    expect(r.memory.spelling.total).toBe(1);
    expect(r.memory.coding.dueToday).toBe(1);
    expect(r.levelsPassed[0]).toMatchObject({ levelId: "SP-03", subject: "Spelling" });
    expect(r.tricky[0]).toMatchObject({ label: "because", count: 2 });
  });
});
