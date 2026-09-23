import { describe, expect, it } from "vitest";
import gpcs from "./gpcs.json";
import levels from "./levels.json";

// ---- types (mirroring the JSON shape) ----
interface Gpc {
  grapheme: string;
  say: string;
  example: string;
  variant?: string;
}
interface GpcLevel {
  level: string;
  gpcs: Gpc[];
}
interface Word {
  word: string;
  graphemes: string[];
  real: boolean;
  paper?: number;
  section?: number;
}
interface Level {
  level: string;
  words: Word[];
}

const GPCS = gpcs as GpcLevel[];
const LEVELS = levels as Level[];

const phOrder = (id: string) => Number(id.split("-")[1]);

// Earliest level at which each grapheme string is taught.
const teachLevel = new Map<string, number>();
for (const g of GPCS) {
  const o = phOrder(g.level);
  for (const gpc of g.gpcs) {
    teachLevel.set(gpc.grapheme, Math.min(teachLevel.get(gpc.grapheme) ?? Infinity, o));
  }
}

/**
 * Check that a grapheme split rebuilds the word.
 * Plain graphemes match literally left to right. A split digraph ("a-e")
 * contributes its first letter at the current position and claims the word's
 * final "e" (which must not also be listed as its own grapheme).
 */
function rebuilds(word: string, graphemes: string[]): boolean {
  const w = word.toLowerCase();
  const splits = graphemes.filter((g) => g.includes("-"));
  if (splits.length > 1) return false;
  if (splits.length === 1 && !w.endsWith("e")) return false;
  let pos = 0;
  for (const g of graphemes) {
    if (g.includes("-")) {
      const first = g.slice(0, g.indexOf("-"));
      if (!w.startsWith(first, pos)) return false;
      pos += first.length;
    } else {
      if (!w.startsWith(g, pos)) return false;
      pos += g.length;
    }
  }
  return splits.length === 0 ? pos === w.length : pos === w.length - 1;
}

describe("gpcs.json", () => {
  it("introduces GPCs at exactly the expected levels", () => {
    expect(GPCS.map((g) => g.level)).toEqual([
      "PH-01", "PH-02", "PH-03", "PH-05", "PH-06", "PH-07", "PH-08", "PH-11", "PH-12", "PH-13", "PH-14",
    ]);
  });

  it("PH-07 has long and short oo; PH-13 has the five split digraphs", () => {
    const ph07 = GPCS.find((g) => g.level === "PH-07")!;
    const oo = ph07.gpcs.filter((g) => g.grapheme === "oo").map((g) => g.variant).sort();
    expect(oo).toEqual(["long", "short"]);
    const ph13 = GPCS.find((g) => g.level === "PH-13")!.gpcs.map((g) => g.grapheme);
    expect(ph13).toEqual(["a-e", "e-e", "i-e", "o-e", "u-e"]);
  });

  it("PH-14 has 10-14 alternative pronunciations", () => {
    const ph14 = GPCS.find((g) => g.level === "PH-14")!;
    expect(ph14.gpcs.length).toBeGreaterThanOrEqual(10);
    expect(ph14.gpcs.length).toBeLessThanOrEqual(14);
    for (const g of ph14.gpcs) expect(g.variant).toBeTruthy();
  });
});

describe("levels.json", () => {
  const EXPECTED_COUNTS: Record<string, number> = {
    "PH-01": 20, "PH-02": 20, "PH-03": 20, "PH-04": 40,
    "PH-05": 30, "PH-06": 30, "PH-07": 30, "PH-08": 30,
    "PH-09": 40, "PH-10": 40, "PH-11": 30, "PH-12": 30,
    "PH-13": 30, "PH-14": 30, "PH-15": 40, "PH-16": 80,
  };

  it("every level PH-01 -> PH-16 exists with the right word count", () => {
    expect(LEVELS.map((l) => l.level)).toEqual(Object.keys(EXPECTED_COUNTS));
    for (const l of LEVELS) {
      expect(l.words).toHaveLength(EXPECTED_COUNTS[l.level]);
    }
  });

  it("every grapheme is taught at the same level or earlier", () => {
    for (const l of LEVELS) {
      const o = phOrder(l.level);
      for (const w of l.words) {
        for (const g of w.graphemes) {
          const taught = teachLevel.get(g);
          expect(taught, `${w.word} in ${l.level} uses ${g}`).toBeDefined();
          expect(taught!, `${w.word} in ${l.level} uses ${g} too early`).toBeLessThanOrEqual(o);
        }
      }
    }
  });

  it("graphemes rebuild the word (with the split-digraph rule)", () => {
    for (const l of LEVELS) {
      for (const w of l.words) {
        expect(rebuilds(w.word, w.graphemes), `${w.word} in ${l.level}`).toBe(true);
      }
    }
  });

  it("no duplicate words within a level", () => {
    for (const l of LEVELS) {
      const words = l.words.map((w) => w.word);
      expect(new Set(words).size, l.level).toBe(words.length);
    }
  });

  it("a word appears in at most 2 levels", () => {
    const seen = new Map<string, string[]>();
    for (const l of LEVELS) {
      for (const w of l.words) {
        seen.set(w.word, [...(seen.get(w.word) ?? []), l.level]);
      }
    }
    for (const [word, where] of seen) {
      expect(where.length, `${word} in ${where.join(", ")}`).toBeLessThanOrEqual(2);
    }
  });

  it("PH-01..PH-03 words are 2-3 letters", () => {
    for (const id of ["PH-01", "PH-02", "PH-03"]) {
      for (const w of LEVELS.find((l) => l.level === id)!.words) {
        expect(w.word.length).toBeLessThanOrEqual(3);
        expect(w.word.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("levels that introduce GPCs use them: PH-05..08, PH-11..13", () => {
    for (const id of ["PH-05", "PH-06", "PH-07", "PH-08", "PH-11", "PH-12", "PH-13"]) {
      const o = phOrder(id);
      for (const w of LEVELS.find((l) => l.level === id)!.words) {
        expect(
          w.graphemes.some((g) => teachLevel.get(g) === o),
          `${w.word} in ${id} uses no newly taught grapheme`,
        ).toBe(true);
      }
    }
  });

  it("PH-14 words demonstrate an alternative pronunciation", () => {
    const variantGraphemes = new Set(
      GPCS.find((g) => g.level === "PH-14")!.gpcs.map((g) => g.grapheme),
    );
    for (const w of LEVELS.find((l) => l.level === "PH-14")!.words) {
      expect(
        w.graphemes.some((g) => variantGraphemes.has(g)),
        `${w.word} shows no PH-14 variant`,
      ).toBe(true);
    }
  });

  it("PH-10 and PH-15 are all nonsense words", () => {
    for (const id of ["PH-10", "PH-15"]) {
      for (const w of LEVELS.find((l) => l.level === id)!.words) {
        expect(w.real, `${w.word} in ${id}`).toBe(false);
      }
    }
  });

  it("PH-16 mirrors the check: 2 papers x 40, 20 per section, 8-10 nonsense first per section", () => {
    const words = LEVELS.find((l) => l.level === "PH-16")!.words;
    for (const p of [1, 2]) {
      for (const s of [1, 2]) {
        const section = words.filter((w) => w.paper === p && w.section === s);
        expect(section, `paper ${p} section ${s}`).toHaveLength(20);
        const alienCount = section.filter((w) => !w.real).length;
        expect(alienCount).toBeGreaterThanOrEqual(8);
        expect(alienCount).toBeLessThanOrEqual(10);
        // nonsense words come first: once a real word appears, no alien after it
        const firstReal = section.findIndex((w) => w.real);
        expect(section.slice(firstReal).every((w) => w.real)).toBe(true);
      }
    }
    // every PH-16 word carries paper + section
    for (const w of words) {
      expect(w.paper).toBeGreaterThanOrEqual(1);
      expect(w.paper).toBeLessThanOrEqual(2);
      expect(w.section).toBeGreaterThanOrEqual(1);
      expect(w.section).toBeLessThanOrEqual(2);
    }
  });

  it("all words are lowercase a-z only", () => {
    for (const l of LEVELS) {
      for (const w of l.words) {
        expect(w.word).toMatch(/^[a-z]+$/);
      }
    }
  });
});
