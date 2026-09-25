import { describe, expect, it } from "vitest";
import { mergeStates } from "./merge";
import type { AppState } from "./store-types";

const base = (): AppState => ({ version: 1, children: [], tt: {}, weakFacts: {}, attempts: [] });
const child = (id: string, name = id) => ({ id, name, schoolYear: 3, avatar: "🦁", color: "#000" });
const prog = (current: string) => ({ current, passed: [], passStreak: 0, failStreak: 0, flagged: false });
const attempt = (id: string, childId: string, finishedAt: string) => ({
  id,
  childId,
  levelId: "TT-01",
  finishedAt,
  total: 12,
  correctFirstTime: 12,
  durationMs: 30000,
  secondsPerQuestion: 8,
  outcome: "setPassed" as const,
  wrong: [],
});

describe("mergeStates", () => {
  it("unions children and attempts from both sides", () => {
    const a = { ...base(), children: [child("y")], tt: { y: prog("TT-06") }, attempts: [attempt("1", "y", "2026-09-20T10:00:00Z")] };
    const b = { ...base(), children: [child("s")], tt: { s: prog("TT-01") }, attempts: [attempt("2", "s", "2026-09-21T10:00:00Z")] };
    const m = mergeStates(a, b);
    expect(m.children.map((c) => c.id)).toEqual(["y", "s"]);
    expect(Object.keys(m.tt).sort()).toEqual(["s", "y"]);
    expect(m.attempts.map((x) => x.id)).toEqual(["1", "2"]);
  });

  it("does not duplicate an attempt present on both sides", () => {
    const at = attempt("1", "y", "2026-09-20T10:00:00Z");
    const a = { ...base(), children: [child("y")], attempts: [at] };
    const m = mergeStates(a, { ...a });
    expect(m.attempts).toHaveLength(1);
  });

  it("keeps the most recently changed progress per child", () => {
    const a = { ...base(), children: [child("y")], tt: { y: prog("TT-07") }, progressUpdatedAt: { y: "2026-09-22T10:00:00Z" } };
    const b = { ...base(), children: [child("y")], tt: { y: prog("TT-08") }, progressUpdatedAt: { y: "2026-09-23T10:00:00Z" } };
    expect(mergeStates(a, b).tt.y.current).toBe("TT-08");
    expect(mergeStates(b, a).tt.y.current).toBe("TT-08");
  });

  it("a child removed on one device stays removed", () => {
    const a = { ...base(), children: [], deletedChildren: ["y"] };
    const b = { ...base(), children: [child("y")], tt: { y: prog("TT-06") }, attempts: [attempt("1", "y", "2026-09-20T10:00:00Z")] };
    const m = mergeStates(a, b);
    expect(m.children).toHaveLength(0);
    expect(m.tt.y).toBeUndefined();
    expect(m.attempts).toHaveLength(0);
    expect(m.deletedChildren).toEqual(["y"]);
  });

  it("takes the higher tricky-fact count", () => {
    const a = { ...base(), children: [child("y")], weakFacts: { y: { "7x8": 2, "6x7": 1 } } };
    const b = { ...base(), children: [child("y")], weakFacts: { y: { "7x8": 1, "8x9": 3 } } };
    expect(mergeStates(a, b).weakFacts.y).toEqual({ "7x8": 2, "6x7": 1, "8x9": 3 });
  });

  it("keeps the most recently set parent PIN", () => {
    const a = { ...base(), parentPinHash: "old", pinUpdatedAt: "2026-09-20T10:00:00Z" };
    const b = { ...base(), parentPinHash: "new", pinUpdatedAt: "2026-09-23T10:00:00Z" };
    expect(mergeStates(a, b).parentPinHash).toBe("new");
    expect(mergeStates(b, a).parentPinHash).toBe("new");
  });

  it("a fresh device merged with the cloud gets everything", () => {
    const cloud = {
      ...base(),
      parentPinHash: "h",
      pinUpdatedAt: "2026-09-20T10:00:00Z",
      children: [child("y"), child("s")],
      tt: { y: prog("TT-10"), s: prog("TT-02") },
      progressUpdatedAt: { y: "2026-09-22T10:00:00Z", s: "2026-09-22T10:00:00Z" },
    };
    const m = mergeStates(base(), cloud);
    expect(m.parentPinHash).toBe("h");
    expect(m.children).toHaveLength(2);
    expect(m.tt.y.current).toBe("TT-10");
  });

  it("keeps the furthest handwriting stage per letter", () => {
    const a = { ...base(), children: [child("s")], hw: { s: { c: { stage: 3 as const, streak: 1 }, a: { stage: 1 as const, streak: 2 } } } };
    const b = { ...base(), children: [child("s")], hw: { s: { c: { stage: 2 as const, streak: 2 }, a: { stage: 2 as const, streak: 0 }, d: { stage: 1 as const, streak: 1 } } } };
    expect(mergeStates(a, b).hw!.s).toEqual({ c: { stage: 3, streak: 1 }, a: { stage: 2, streak: 0 }, d: { stage: 1, streak: 1 } });
  });

  it("keeps the most recent keypad/Pencil choice per child", () => {
    const a = { ...base(), children: [child("y")], inputMode: { y: { mode: "pencil" as const, at: "2026-09-24T09:00:00Z" } } };
    const b = { ...base(), children: [child("y")], inputMode: { y: { mode: "keypad" as const, at: "2026-09-24T08:00:00Z" } } };
    expect(mergeStates(b, a).inputMode!.y.mode).toBe("pencil");
    expect(mergeStates(a, b).inputMode!.y.mode).toBe("pencil");
  });

  it("keeps the most recently changed phonics progress", () => {
    const a = { ...base(), children: [child("s")], ph: { s: prog("PH-03") }, phUpdatedAt: { s: "2026-09-25T09:00:00Z" }, phTricky: { s: { ship: 1 } } };
    const b = { ...base(), children: [child("s")], ph: { s: prog("PH-02") }, phUpdatedAt: { s: "2026-09-25T08:00:00Z" }, phTricky: { s: { ship: 2, cat: 1 } } };
    const m = mergeStates(b, a);
    expect(m.ph!.s.current).toBe("PH-03");
    expect(m.phTricky!.s).toEqual({ ship: 2, cat: 1 });
  });

  it("keeps the most recently changed spelling progress", () => {
    const a = { ...base(), children: [child("y")], sp: { y: prog("SP-06") }, spUpdatedAt: { y: "2026-09-25T09:00:00Z" }, spTricky: { y: { because: 1 } } };
    const b = { ...base(), children: [child("y")], sp: { y: prog("SP-05") }, spUpdatedAt: { y: "2026-09-25T08:00:00Z" }, spTricky: { y: { because: 2, island: 1 } } };
    const m = mergeStates(b, a);
    expect(m.sp!.y.current).toBe("SP-06");
    expect(m.spTricky!.y).toEqual({ because: 2, island: 1 });
    expect(m.ph).toBeUndefined();
  });
});
