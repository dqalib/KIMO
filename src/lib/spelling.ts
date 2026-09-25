// Spelling (SP strand) — practice sets built from Kimi's word lists
// (src/content/spelling/levels.json). See docs/skill-map.md section 4.
//
// One question: the app says the word, then a sentence with it, then the word
// again; the child types it on the on-screen keyboard.

import data from "../content/spelling/levels.json";

export interface SpWord {
  word: string;
  sentence: string;
  homophoneOf?: string[];
}

const LEVEL_WORDS = new Map((data.levels as { level: string; year: number; words: SpWord[] }[]).map((l) => [l.level, l.words]));

export interface SpLevel {
  id: string;
  order: number;
  year: number;
  title: string;
  setSize: number;
  accuracyTarget: number;
}

const INFO: [string, number, string][] = [
  ["SP-01", 1, "Year 1 tricky words"],
  ["SP-02", 1, "Endings: -s, -es, -ing, -ed, -er"],
  ["SP-03", 2, "Year 2 tricky words"],
  ["SP-04", 2, "Endings: -ly, -ment, -ness, -ful, -less; can't, didn't"],
  ["SP-05", 3, "Year 3/4 word list, part 1"],
  ["SP-06", 3, "Beginnings: un-, dis-, mis-, re-, in-, im-, il-, ir-"],
  ["SP-07", 3, "Endings: -ation, -ous, -tion, -sion, -cian"],
  ["SP-08", 3, "Sound-alike words (here / hear)"],
  ["SP-09", 4, "Year 3/4 word list, part 2"],
];

export const SP_LEVELS: SpLevel[] = INFO.map(([id, year, title], i) => ({
  id,
  order: i + 1,
  year,
  title,
  setSize: 10,
  // Spelling is an "understanding" strand: accuracy only, no time target.
  accuracyTarget: 0.9,
}));

export function getSpLevel(id: string) {
  return SP_LEVELS.find((l) => l.id === id);
}
export function nextSpLevel(id: string) {
  const l = getSpLevel(id);
  return l ? SP_LEVELS.find((x) => x.order === l.order + 1) : undefined;
}
export function prevSpLevel(id: string) {
  const l = getSpLevel(id);
  return l ? SP_LEVELS.find((x) => x.order === l.order - 1) : undefined;
}

export function spLevelWords(id: string): SpWord[] {
  return LEVEL_WORDS.get(id) ?? [];
}

/**
 * Where a child starts before any placement test: about a year below their
 * school year ("start easy, build confidence"). The parent can move them.
 */
export function defaultSpStart(schoolYear: number): string {
  if (schoolYear <= 2) return "SP-01";
  if (schoolYear === 3) return "SP-03";
  return "SP-05";
}

/** Normalise what was typed: trim, curly apostrophes → straight. */
export function cleanTyped(s: string): string {
  return s.trim().replace(/[‘’ʼ]/g, "'");
}

/**
 * Is the typed answer right? Words that need a capital (I, Mr, Christmas,
 * February…) must have it; other words ignore case, so a stray capital at the
 * start isn't marked wrong.
 */
export function isCorrectSpelling(typed: string, word: string): boolean {
  const t = cleanTyped(typed);
  if (word !== word.toLowerCase()) return t === word;
  return t.toLowerCase() === word;
}

/** What the app says for a question: word, sentence, word. */
export function spokenPrompt(w: SpWord): string {
  return `${w.word}. ${w.sentence} ${w.word}.`;
}

type Rng = () => number;

function shuffle<T>(xs: T[], rng: Rng): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build one set for a level: `setSize` different words, with words the child
 * got wrong before (`tricky`) more likely to come up. On the homophone level,
 * the two words of a pair are never in the same set, so the sentence is what
 * tells the child which spelling is wanted — not the process of elimination.
 */
export function generateSpSet(level: SpLevel, tricky: Record<string, number> = {}, rng: Rng = Math.random): SpWord[] {
  const weighted = shuffle(spLevelWords(level.id), rng)
    .map((w) => ({ w, r: rng() / (1 + 2 * Math.min(tricky[w.word] ?? 0, 3)) }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.w);

  const out: SpWord[] = [];
  for (const w of weighted) {
    if (out.length >= level.setSize) break;
    if (w.homophoneOf?.some((h) => out.some((o) => o.word === h))) continue;
    out.push(w);
  }
  return out;
}
