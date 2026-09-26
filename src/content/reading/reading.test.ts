import { describe, expect, it } from "vitest";
import data from "./passages.json";

// ---- types (mirroring the JSON shape; see src/lib/reading.ts) ----
type RcSkill =
  | "retrieval" | "sequence" | "vocabulary" | "inference"
  | "prediction" | "summary" | "word-choice";

interface RcQuestion {
  skill: RcSkill;
  prompt: string;
  options: string[];
  answer: number;
}
interface PassageData {
  id: string;
  level: string;
  title: string;
  kind: "fiction" | "non-fiction";
  theme: string;
  text: string;
  wordCount: number;
  questions: RcQuestion[];
  status: "draft";
}

const passages = (data as { passages: PassageData[] }).passages;

const QUESTION_COUNT: Record<string, number> = {
  "RC-01": 3, "RC-02": 4, "RC-03": 4, "RC-04": 5, "RC-05": 5, "RC-06": 6,
};
const WORD_RANGE: Record<string, [number, number]> = {
  "RC-02": [60, 100], "RC-03": [100, 150], "RC-04": [150, 200],
  "RC-05": [200, 300], "RC-06": [300, 400],
};
const ALLOWED_SKILLS: Record<string, RcSkill[]> = {
  "RC-01": ["retrieval"],
  "RC-02": ["retrieval", "sequence"],
  "RC-03": ["retrieval", "vocabulary"],
  "RC-04": ["retrieval", "inference"],
  "RC-05": ["retrieval", "inference", "prediction"],
  "RC-06": ["inference", "summary", "word-choice"],
};
const LEVELS = Object.keys(QUESTION_COUNT);
// curly quotes / typographic dashes (plain hyphen is the only allowed dash)
const CURLY = /[\u2018\u2019\u201c\u201d\u2012\u2013\u2014]/;

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}
function countSentences(text: string): number {
  return (text.match(/[.!?]+/g) ?? []).length;
}

describe("reading passages", () => {
  it("has 48 passages, 8 per level, unique ids matching their level, all draft", () => {
    expect(passages).toHaveLength(48);
    const seen = new Set<string>();
    for (const p of passages) {
      expect(LEVELS, p.id).toContain(p.level);
      expect(p.id).toMatch(new RegExp(`^${p.level}-\\d{3}$`));
      expect(seen.has(p.id), `${p.id} unique`).toBe(false);
      seen.add(p.id);
      expect(p.status, p.id).toBe("draft");
      expect(p.kind, p.id).toMatch(/^(fiction|non-fiction)$/);
    }
    for (const level of LEVELS) {
      expect(passages.filter((p) => p.level === level)).toHaveLength(8);
    }
  });

  it("has accurate word counts inside each level's range (RC-01: 3-5 sentences)", () => {
    for (const p of passages) {
      expect(p.wordCount, p.id).toBe(countWords(p.text));
      if (p.level === "RC-01") {
        const n = countSentences(p.text);
        expect(n, `${p.id} sentences`).toBeGreaterThanOrEqual(3);
        expect(n, `${p.id} sentences`).toBeLessThanOrEqual(5);
      } else {
        const [lo, hi] = WORD_RANGE[p.level];
        expect(p.wordCount, `${p.id} word count`).toBeGreaterThanOrEqual(lo);
        expect(p.wordCount, `${p.id} word count`).toBeLessThanOrEqual(hi);
      }
    }
  });

  it("has the right question counts, level skills, and fiction split at RC-05/06", () => {
    for (const p of passages) {
      expect(p.questions, p.id).toHaveLength(QUESTION_COUNT[p.level]);
      for (const q of p.questions) {
        expect(ALLOWED_SKILLS[p.level], `${p.id}: ${q.skill}`).toContain(q.skill);
      }
    }
    for (const level of ["RC-05", "RC-06"]) {
      const kinds = passages.filter((p) => p.level === level).map((p) => p.kind);
      expect(kinds.filter((k) => k === "fiction"), level).toHaveLength(4);
      expect(kinds.filter((k) => k === "non-fiction"), level).toHaveLength(4);
    }
  });

  it("has distinct 3-4 options, in-range answers, and no answer position over half a level", () => {
    const positions: Record<string, Record<number, number>> = Object.fromEntries(
      LEVELS.map((l) => [l, {}]),
    );
    for (const p of passages) {
      for (const q of p.questions) {
        const min = p.level === "RC-01" || p.level === "RC-02" ? 3 : 3;
        expect(q.options.length, `${p.id}: ${q.prompt}`).toBeGreaterThanOrEqual(min);
        expect(q.options.length, `${p.id}: ${q.prompt}`).toBeLessThanOrEqual(4);
        expect(new Set(q.options).size, `${p.id}: ${q.prompt}`).toBe(q.options.length);
        expect(q.answer, `${p.id}: ${q.prompt}`).toBeGreaterThanOrEqual(0);
        expect(q.answer, `${p.id}: ${q.prompt}`).toBeLessThan(q.options.length);
        positions[p.level][q.answer] = (positions[p.level][q.answer] ?? 0) + 1;
      }
    }
    for (const level of LEVELS) {
      const total = Object.values(positions[level]).reduce((a, b) => a + b, 0);
      for (const [pos, n] of Object.entries(positions[level])) {
        expect(n, `${level} answer position ${pos}`).toBeLessThanOrEqual(Math.floor(total / 2));
      }
    }
  });

  it("has no theme more than 5 times and no duplicate titles", () => {
    const themes = new Map<string, number>();
    const titles = new Set<string>();
    for (const p of passages) {
      themes.set(p.theme, (themes.get(p.theme) ?? 0) + 1);
      expect(titles.has(p.title), `${p.title} unique`).toBe(false);
      titles.add(p.title);
    }
    for (const [theme, n] of themes) {
      expect(n, `theme ${theme}`).toBeLessThanOrEqual(5);
    }
  });

  it("uses no curly quotes or dashes other than a plain hyphen", () => {
    for (const p of passages) {
      const blob = [p.title, p.theme, p.text, ...p.questions.flatMap((q) => [q.prompt, ...q.options])].join(" ");
      expect(CURLY.test(blob), `${p.id}: typographic quote or dash`).toBe(false);
    }
  });
});
