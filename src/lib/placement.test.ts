import { describe, expect, it } from "vitest";
import { MAX_ROUNDS, recordRound, startPlacement } from "./placement";

const L = ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"];

function run(start: string, scores: number[]) {
  let s = startPlacement(L, start);
  const seen: string[] = [];
  for (const r of scores) {
    if (s.result) break;
    seen.push(L[s.current]);
    s = recordRound(s, r);
  }
  return { result: s.result, seen };
}

describe("placement", () => {
  it("climbs while everything is right, then starts one below the slip", () => {
    expect(run("L3", [3, 3, 0])).toEqual({ result: "L4", seen: ["L3", "L4", "L5"] });
  });

  it("starts one below a level they're on the edge of", () => {
    expect(run("L3", [3, 2])).toEqual({ result: "L3", seen: ["L3", "L4"] });
    expect(run("L3", [2])).toEqual({ result: "L2", seen: ["L3"] });
  });

  it("steps down after a slip until something is solid", () => {
    expect(run("L5", [1, 0, 3])).toEqual({ result: "L3", seen: ["L5", "L4", "L3"] });
  });

  it("stops at the ends", () => {
    expect(run("L1", [0])).toEqual({ result: "L1", seen: ["L1"] });
    expect(run("L1", [2])).toEqual({ result: "L1", seen: ["L1"] });
    expect(run("L7", [3, 3])).toEqual({ result: "L8", seen: ["L7", "L8"] });
  });

  it("never asks more than the maximum number of rounds", () => {
    const { seen, result } = run("L1", [3, 3, 3, 3, 3, 3, 3, 3]);
    expect(seen.length).toBe(MAX_ROUNDS);
    expect(result).toBe("L6");
  });

  it("falls back to the first level for an unknown start", () => {
    expect(startPlacement(L, "nope").current).toBe(0);
  });
});
