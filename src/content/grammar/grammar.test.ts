import { describe, expect, it } from "vitest";
import data from "./levels.json";

// ---- types (mirroring the JSON shape) ----
interface GrammarQuestion {
  id: string;
  style: "pick-word" | "pick-sentence" | "fill-gap" | "pick-mark" | "true-false";
  prompt: string;
  sentence?: string;
  options: string[];
  answer: number;
  why: string;
}
interface GrammarLevel {
  level: string;
  year: number;
  title: string;
  questions: GrammarQuestion[];
}

const levels = (data as { source: string; levels: GrammarLevel[] }).levels;
const STYLES = ["pick-word", "pick-sentence", "fill-gap", "pick-mark", "true-false"];
const CURLY = /[\u2018\u2019\u201c\u201d]/;
const EXPECTED_YEARS: Record<string, number> = {
  "GP-01": 1, "GP-02": 1, "GP-03": 2, "GP-04": 2, "GP-05": 2, "GP-06": 2,
  "GP-07": 3, "GP-08": 3, "GP-09": 3, "GP-10": 4, "GP-11": 4, "GP-12": 4,
};

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("grammar levels", () => {
  it("has 12 levels in order with the right year and 30 questions each", () => {
    expect(levels).toHaveLength(12);
    levels.forEach((l, i) => {
      expect(l.level, l.level).toBe(`GP-${String(i + 1).padStart(2, "0")}`);
      expect(l.year, l.level).toBe(EXPECTED_YEARS[l.level]);
      expect(l.questions, l.level).toHaveLength(30);
    });
  });

  it("has unique ids matching GP-NN-NNN for their level", () => {
    const seen = new Set<string>();
    for (const l of levels) {
      l.questions.forEach((q, i) => {
        expect(q.id).toMatch(new RegExp(`^${l.level}-\\d{3}$`));
        expect(Number(q.id.slice(-3)), `${q.id} number matches position`).toBe(i + 1);
        expect(seen.has(q.id), `${q.id} unique`).toBe(false);
        seen.add(q.id);
      });
    }
  });

  it("every question has a valid style, distinct options and an in-range answer", () => {
    for (const l of levels) {
      for (const q of l.questions) {
        expect(STYLES, q.id).toContain(q.style);
        expect(q.options.length, q.id).toBeGreaterThanOrEqual(2);
        expect(q.options.length, q.id).toBeLessThanOrEqual(4);
        expect(new Set(q.options).size, `${q.id} distinct options`).toBe(q.options.length);
        expect(q.answer, q.id).toBeGreaterThanOrEqual(0);
        expect(q.answer, q.id).toBeLessThan(q.options.length);
        expect(q.why.length, q.id).toBeGreaterThan(0);
        if (q.style === "true-false") {
          expect(q.options, q.id).toEqual(["Yes", "No"]);
        }
      }
    }
  });

  it("fill-gap gaps and pick-word options match their sentences", () => {
    for (const l of levels) {
      for (const q of l.questions) {
        if (q.style === "fill-gap") {
          expect(q.sentence, q.id).toBeDefined();
          expect(q.sentence!.split("___").length - 1, `${q.id} one gap`).toBe(1);
        }
        if (q.style === "pick-word") {
          expect(q.sentence, q.id).toBeDefined();
          for (const opt of q.options) {
            expect(new RegExp(`\\b${escapeRe(opt)}\\b`).test(q.sentence!), `${q.id} "${opt}" in sentence`).toBe(true);
          }
        }
      }
    }
  });

  it("has no duplicate prompt + sentence + options within a level", () => {
    for (const l of levels) {
      const seen = new Set<string>();
      for (const q of l.questions) {
        const k = `${q.prompt}|${q.sentence ?? ""}|${q.options.join("¦")}`;
        expect(seen.has(k), `${l.level} duplicate: ${k.slice(0, 60)}`).toBe(false);
        seen.add(k);
      }
    }
  });

  it("uses at least 3 styles and no answer position more than half the time", () => {
    for (const l of levels) {
      const styles = new Set(l.questions.map((q) => q.style));
      expect(styles.size, l.level).toBeGreaterThanOrEqual(3);
      const counts = new Map<number, number>();
      for (const q of l.questions) counts.set(q.answer, (counts.get(q.answer) ?? 0) + 1);
      for (const [pos, n] of counts) {
        expect(n, `${l.level} answer ${pos}`).toBeLessThanOrEqual(l.questions.length / 2);
      }
    }
  });

  it("uses no curly quotes outside GP-08", () => {
    for (const l of levels) {
      for (const q of l.questions) {
        if (l.level === "GP-08") continue;
        for (const text of [q.prompt, q.sentence ?? "", q.why, ...q.options]) {
          expect(CURLY.test(text), `${q.id} curly quote in "${text.slice(0, 40)}"`).toBe(false);
        }
      }
    }
  });
});
