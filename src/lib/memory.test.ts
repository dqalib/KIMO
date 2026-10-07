import { describe, expect, it } from "vitest";
import { applyAnswers, dayKey, dueKeys, mergeMemory, summarise, updateItem } from "./memory";

const day = (s: string) => new Date(`${s}T10:00:00`);

describe("memory boxes", () => {
  it("new and right → box 2, back in 3 days; new and wrong → box 1, back tomorrow", () => {
    expect(updateItem(undefined, true, day("2026-10-07"))).toMatchObject({ box: 2, due: "2026-10-10", right: 1, wrong: 0 });
    expect(updateItem(undefined, false, day("2026-10-07"))).toMatchObject({ box: 1, due: "2026-10-08", right: 0, wrong: 1 });
  });

  it("right again moves up a box (further apart); wrong drops to box 1 and is marked forgotten", () => {
    const a = updateItem(undefined, true, day("2026-10-07"));
    const b = updateItem(a, true, day("2026-10-10"));
    expect(b).toMatchObject({ box: 3, due: "2026-10-17" });
    const c = updateItem(b, false, day("2026-10-17"));
    expect(c).toMatchObject({ box: 1, due: "2026-10-18", forgot: true, right: 2, wrong: 1 });
  });

  it("tops out at box 5 (once a month)", () => {
    let m = updateItem(undefined, true, day("2026-01-01"));
    for (let k = 0; k < 6; k++) m = updateItem(m, true, day("2026-01-01"));
    expect(m.box).toBe(5);
    expect(m.due).toBe("2026-01-31");
  });

  it("lists due items for one subject, most overdue first", () => {
    let mem = applyAnswers({}, [{ key: "sp:said", ok: false }, { key: "cw:loop", ok: false }], day("2026-10-01"));
    mem = applyAnswers(mem, [{ key: "sp:friend", ok: false }], day("2026-10-05"));
    mem = applyAnswers(mem, [{ key: "sp:because", ok: true }], day("2026-10-07"));
    expect(dueKeys(mem, "sp:", day("2026-10-07"))).toEqual(["said", "friend"]);
    expect(dueKeys(mem, "cw:", day("2026-10-07"))).toEqual(["loop"]);
    expect(dueKeys(mem, "sp:", day("2026-10-07"), 1)).toEqual(["said"]);
  });

  it("summarises remembered / learning / due / forgotten", () => {
    let mem = applyAnswers({}, [{ key: "sp:a", ok: true }, { key: "sp:b", ok: true }], day("2026-10-01"));
    for (const d of ["2026-10-04", "2026-10-11"]) mem = applyAnswers(mem, [{ key: "sp:a", ok: true }], day(d));
    mem = applyAnswers(mem, [{ key: "sp:b", ok: false }], day("2026-10-04"));
    const s = summarise(mem, "sp:", day("2026-10-12"));
    expect(s).toMatchObject({ total: 2, remembered: 1, learning: 1, dueToday: 1, forgotten: ["b"] });
  });

  it("merges two iPads: the most recently answered copy of each item wins", () => {
    const a = applyAnswers({}, [{ key: "sp:x", ok: true }], day("2026-10-01"));
    const b = applyAnswers({}, [{ key: "sp:x", ok: false }, { key: "sp:y", ok: true }], day("2026-10-02"));
    const m = mergeMemory(a, b);
    expect(m["sp:x"].box).toBe(1);
    expect(Object.keys(m).sort()).toEqual(["sp:x", "sp:y"]);
    expect(mergeMemory(b, a)["sp:x"].box).toBe(1);
  });

  it("uses local dates", () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});
