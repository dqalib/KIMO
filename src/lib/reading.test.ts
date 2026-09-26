import { describe, expect, it } from "vitest";
import { approvedPassages, defaultRcStart, mergeReviews, nextRcLevel, pendingPassages, pickPassage, RC_LEVELS, spokenPassage, type Passage } from "./reading";

const p = (id: string, level = "RC-02"): Passage => ({
  id,
  level,
  title: `Story ${id}`,
  kind: "fiction",
  theme: "school",
  text: "Sam had a red hat.\n\nIt blew away.",
  wordCount: 8,
  questions: [{ skill: "retrieval", prompt: "What colour was the hat?", options: ["red", "blue", "green"], answer: 0 }],
});
const all = [p("RC-02-001"), p("RC-02-002"), p("RC-02-003"), p("RC-03-001", "RC-03")];
const at = "2026-09-26T09:00:00Z";

describe("reading", () => {
  it("has six levels", () => {
    expect(RC_LEVELS.map((l) => l.id)).toEqual(["RC-01", "RC-02", "RC-03", "RC-04", "RC-05", "RC-06"]);
    expect(nextRcLevel("RC-06")).toBeUndefined();
    expect([1, 2, 3, 4].map(defaultRcStart)).toEqual(["RC-01", "RC-01", "RC-03", "RC-05"]);
  });

  it("only offers approved passages from the child's level", () => {
    const reviews = { "RC-02-001": { status: "approved" as const, at }, "RC-02-002": { status: "rejected" as const, at } };
    expect(approvedPassages("RC-02", reviews, all).map((x) => x.id)).toEqual(["RC-02-001"]);
    expect(pendingPassages(reviews, all).map((x) => x.id)).toEqual(["RC-02-003", "RC-03-001"]);
    expect(pickPassage("RC-03", reviews, {}, Math.random, all)).toBeUndefined();
  });

  it("picks the least-read approved passage", () => {
    const reviews = Object.fromEntries(all.map((x) => [x.id, { status: "approved" as const, at }]));
    for (let k = 0; k < 20; k++) {
      expect(pickPassage("RC-02", reviews, { "RC-02-001": 2, "RC-02-002": 1, "RC-02-003": 1 }, Math.random, all)!.id).not.toBe("RC-02-001");
    }
    expect(pickPassage("RC-02", reviews, { "RC-02-001": 1, "RC-02-002": 1 }, Math.random, all)!.id).toBe("RC-02-003");
  });

  it("keeps the newer decision when merging", () => {
    const a = { x: { status: "approved" as const, at: "2026-09-26T09:00:00Z" } };
    const b = { x: { status: "rejected" as const, at: "2026-09-26T10:00:00Z" }, y: { status: "approved" as const, at } };
    expect(mergeReviews(a, b)).toEqual({ x: b.x, y: b.y });
    expect(mergeReviews(b, a)).toEqual({ x: b.x, y: b.y });
  });

  it("reads the title then the text", () => {
    expect(spokenPassage(p("a"))).toBe("Story a. Sam had a red hat. It blew away.");
  });
});
