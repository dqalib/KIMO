import { describe, expect, it } from "vitest";
import data from "./levels.json";

// Source: National curriculum in England: English programmes of study,
// Appendix 1 (Spelling) — GOV.UK, Crown copyright, Open Government Licence.
interface Word {
  word: string;
  sentence: string;
  homophoneOf?: string[];
}
interface Level {
  level: string;
  year: number;
  words: Word[];
}
interface SpellingData {
  source: string;
  levels: Level[];
}

const DATA = data as SpellingData;
const LEVELS = DATA.levels;
const level = (id: string) => LEVELS.find((l) => l.level === id)!;

const EXPECTED_YEAR: Record<string, number> = {
  "SP-01": 1, "SP-02": 1, "SP-03": 2, "SP-04": 2,
  "SP-05": 3, "SP-06": 3, "SP-07": 3, "SP-08": 3, "SP-09": 4,
};

const EXPECTED_COUNT: Record<string, number> = {
  "SP-01": 45, "SP-02": 30, "SP-03": 64, "SP-04": 40,
  "SP-05": 55, "SP-06": 40, "SP-07": 40, "SP-08": 46, "SP-09": 54,
};

// The full years 3-4 statutory word list with optional endings expanded,
// exactly as published in Appendix 1.
const Y3_4_LIST = [
  "accident", "accidentally", "actual", "actually", "address", "answer", "appear", "arrive",
  "believe", "bicycle", "breath", "breathe", "build", "business", "busy", "calendar", "caught",
  "centre", "century", "certain", "circle", "complete", "consider", "continue", "decide",
  "describe", "different", "difficult", "disappear", "early", "earth", "eight", "eighth",
  "enough", "exercise", "experience", "experiment", "extreme", "famous", "favourite",
  "February", "forward", "forwards", "fruit", "grammar", "group", "guard", "guide", "heard",
  "heart", "height", "history", "imagine", "increase", "important", "interest", "island",
  "knowledge", "learn", "length", "library", "material", "medicine", "mention", "minute",
  "natural", "naughty", "notice", "occasion", "occasionally", "often", "opposite", "ordinary",
  "particular", "peculiar", "perhaps", "popular", "position", "possess", "possession",
  "possible", "potatoes", "pressure", "probably", "promise", "purpose", "quarter", "question",
  "recent", "regular", "reign", "remember", "sentence", "separate", "special", "straight",
  "strange", "strength", "suppose", "surprise", "therefore", "though", "although", "thought",
  "through", "various", "weight", "woman", "women",
];

// Fiction/brand names are not allowed anywhere (same rule as phonics, brief 001).
const BANNED = [
  "quaffle", "quidditch", "muggle", "hogwarts", "pokemon", "lego", "minecraft", "roblox",
];

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("spelling levels.json", () => {
  it("has a GOV.UK source and nine levels SP-01..SP-09 with the right year", () => {
    expect(DATA.source).toContain("gov.uk");
    expect(LEVELS.map((l) => l.level)).toEqual(Object.keys(EXPECTED_YEAR));
    for (const l of LEVELS) expect(l.year).toBe(EXPECTED_YEAR[l.level]);
  });

  it("levels have the expected word counts", () => {
    for (const l of LEVELS) expect(l.words).toHaveLength(EXPECTED_COUNT[l.level]);
  });

  it("no duplicate words within a level", () => {
    for (const l of LEVELS) {
      const words = l.words.map((w) => w.word.toLowerCase());
      expect(new Set(words).size, l.level).toBe(words.length);
    }
  });

  it("SP-05 + SP-09 together are exactly the full years 3-4 statutory list, no overlap", () => {
    const a = level("SP-05").words.map((w) => w.word);
    const b = level("SP-09").words.map((w) => w.word);
    expect(a.length + b.length).toBe(Y3_4_LIST.length);
    const both = [...a, ...b].sort();
    expect(both).toEqual([...Y3_4_LIST].sort());
    expect(new Set(a).size).toBe(a.length);
    expect(new Set(b).size).toBe(b.length);
  });

  it("every sentence contains its word exactly once (case-insensitive, whole word)", () => {
    for (const l of LEVELS) {
      for (const w of l.words) {
        const matches = w.sentence.match(new RegExp(`\\b${escapeRegExp(w.word)}\\b`, "gi"));
        expect(matches, `${w.word} in ${l.level}: "${w.sentence}"`).not.toBeNull();
        expect(matches!, w.word).toHaveLength(1);
      }
    }
  });

  it("sentences are 5-10 words", () => {
    for (const l of LEVELS) {
      for (const w of l.words) {
        const n = w.sentence.trim().split(/\s+/).length;
        expect(n >= 5 && n <= 10, `${w.word}: "${w.sentence}" has ${n} words`).toBe(true);
      }
    }
  });

  // Words that must be spelled with a capital letter (the pronoun I, titles, names of days/months/festivals).
  const CAPITALISED = ["I", "I'll", "I'm", "I've", "Mr", "Mrs", "Christmas", "February"];

  it("words are lowercase letters, apostrophes or hyphens only (words that need a capital excepted)", () => {
    for (const l of LEVELS) {
      for (const w of l.words) {
        if (CAPITALISED.includes(w.word)) continue;
        expect(w.word, `${w.word} in ${l.level}`).toMatch(/^[a-z'-]+$/);
      }
    }
    // exactly these capitalised forms are allowed
    const capitalized = LEVELS.flatMap((l) => l.words)
      .map((w) => w.word)
      .filter((word) => !/^[a-z'-]+$/.test(word))
      .sort();
    expect(capitalized).toEqual([...CAPITALISED].sort());
  });

  it("homophoneOf references exist in SP-08 and are mutual", () => {
    const sp08 = new Set(level("SP-08").words.map((w) => w.word));
    const byWord = new Map(level("SP-08").words.map((w) => [w.word, w]));
    for (const l of LEVELS) {
      for (const w of l.words) {
        for (const h of w.homophoneOf ?? []) {
          expect(sp08.has(h), `${w.word} -> ${h}`).toBe(true);
        }
      }
    }
    // every SP-08 word is a homophone entry with a mutual partner
    for (const w of level("SP-08").words) {
      expect(w.homophoneOf, w.word).toBeDefined();
      for (const h of w.homophoneOf!) {
        expect(byWord.get(h)!.homophoneOf).toContain(w.word);
      }
    }
  });

  it("no fiction or brand names", () => {
    for (const l of LEVELS) {
      for (const w of l.words) expect(BANNED).not.toContain(w.word.toLowerCase());
    }
  });

  // Added in review (Claude): SP-08 must be the *Years 3–4* homophones from Appendix 1,
  // not the Years 5–6 "often confused" list.
  it("SP-08 is exactly the Appendix 1 years 3-4 homophone list", () => {
    const Y3_4_HOMOPHONES = [
      "accept", "except", "affect", "effect", "ball", "bawl", "berry", "bury", "brake", "break",
      "fair", "fare", "grate", "great", "groan", "grown", "here", "hear", "heel", "heal", "he'll",
      "knot", "not", "mail", "male", "main", "mane", "meat", "meet", "medal", "meddle", "missed", "mist",
      "peace", "piece", "plain", "plane", "rain", "rein", "reign", "scene", "seen", "weather", "whether",
      "whose", "who's",
    ];
    expect(level("SP-08").words.map((w) => w.word).sort()).toEqual([...Y3_4_HOMOPHONES].sort());
  });
});
