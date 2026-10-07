// Coding words (CW strand): basic computing and coding vocabulary — monitor,
// RAM, loop, algorithm, Wi-Fi… Words come from src/content/coding/terms.json.
//
// A set: new words are shown first as "learn" cards (picture, meaning,
// example, read aloud), then 10 tap-the-answer questions with instant
// right/wrong. Words from earlier sets come back on later days ("Do you
// still remember?") using the spaced review in src/lib/memory.ts.

import data from "../content/coding/terms.json";

export interface CwTerm {
  id: string;
  term: string;
  emoji: string;
  meaning: string;
  example: string;
  /** Terms too close in meaning to use as wrong answers for this one. */
  avoid?: string[];
}

interface RawExtra {
  prompt: string;
  options: string[];
  answer: number;
  why: string;
}

interface RawLevel {
  level: string;
  year: number;
  title: string;
  terms: CwTerm[];
  extra: RawExtra[];
}

const RAW = data.levels as RawLevel[];

export interface CwLevel {
  id: string;
  order: number;
  year: number;
  title: string;
  setSize: number;
  accuracyTarget: number;
  /** Answer buttons per question (fewer for the younger levels). */
  choices: number;
}

export const CW_LEVELS: CwLevel[] = RAW.map((l, i) => ({
  id: l.level,
  order: i + 1,
  year: l.year,
  title: l.title,
  setSize: 10,
  accuracyTarget: 0.9,
  choices: l.year <= 2 ? 3 : 4,
}));

const TERMS = new Map(RAW.flatMap((l) => l.terms.map((t) => [t.id, t] as const)));
const LEVEL_OF = new Map(RAW.flatMap((l) => l.terms.map((t) => [t.id, l.level] as const)));

export function getCwLevel(id: string) {
  return CW_LEVELS.find((l) => l.id === id);
}
export function nextCwLevel(id: string) {
  const l = getCwLevel(id);
  return l ? CW_LEVELS.find((x) => x.order === l.order + 1) : undefined;
}
export function prevCwLevel(id: string) {
  const l = getCwLevel(id);
  return l ? CW_LEVELS.find((x) => x.order === l.order - 1) : undefined;
}
export function cwLevelTerms(id: string): CwTerm[] {
  return RAW.find((l) => l.level === id)?.terms ?? [];
}
export function cwExtras(id: string): RawExtra[] {
  return RAW.find((l) => l.level === id)?.extra ?? [];
}
export function getTerm(id: string): CwTerm | undefined {
  return TERMS.get(id);
}
export const ALL_TERMS: CwTerm[] = [...TERMS.values()];

/** Everyone starts at the beginning — it's new for all of them. */
export function defaultCwStart(): string {
  return "CW-01";
}

/** What is said for a learn card. */
export function spokenTerm(t: CwTerm): string {
  return `${t.term}. ${t.meaning}`;
}

export interface CwQuestion {
  /** Stable id: "<term>:m" (what does it mean), "<term>:w" (which word), "x:<level>:<n>" (extra). */
  id: string;
  /** The term this tests (for the memory boxes), if any. */
  termId?: string;
  prompt: string;
  options: string[];
  answer: number;
  /** Shown after a wrong answer. */
  why: string;
  /** Came back from an earlier day ("Do you still remember?"). */
  review?: boolean;
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

/** Wrong answers: other terms from the same level (topped up from neighbours), never "avoid" ones. */
function distractors(t: CwTerm, n: number, rng: Rng): CwTerm[] {
  const lvl = LEVEL_OF.get(t.id)!;
  const order = getCwLevel(lvl)!.order;
  const clash = (o: CwTerm) => o.id === t.id || t.avoid?.includes(o.id) || o.avoid?.includes(t.id);
  const same = shuffle(cwLevelTerms(lvl).filter((o) => !clash(o)), rng);
  const near = shuffle(
    CW_LEVELS.filter((l) => Math.abs(l.order - order) === 1).flatMap((l) => cwLevelTerms(l.id)).filter((o) => !clash(o)),
    rng,
  );
  return [...same, ...near].slice(0, n);
}

/** "What is a loop?" (pick the meaning) or "Which word means…?" (pick the word). */
export function termQuestion(t: CwTerm, kind: "m" | "w", choices: number, rng: Rng = Math.random): CwQuestion {
  const wrong = distractors(t, choices - 1, rng);
  const pool = shuffle([t, ...wrong], rng);
  const answer = pool.indexOf(t);
  if (kind === "m") {
    return {
      id: `${t.id}:m`,
      termId: t.id,
      prompt: `What does “${t.term}” mean?`,
      options: pool.map((x) => x.meaning),
      answer,
      why: `${t.term}: ${t.meaning}`,
    };
  }
  return {
    id: `${t.id}:w`,
    termId: t.id,
    prompt: `Which word means: ${t.meaning}`,
    options: pool.map((x) => x.term),
    answer,
    why: `${t.term}: ${t.meaning}`,
  };
}

function extraQuestion(levelId: string, n: number, rng: Rng): CwQuestion {
  const x = cwExtras(levelId)[n];
  const order = shuffle(
    x.options.map((_, i) => i),
    rng,
  );
  return { id: `x:${levelId}:${n}`, prompt: x.prompt, options: order.map((i) => x.options[i]), answer: order.indexOf(x.answer), why: x.why };
}

export interface CwSet {
  /** New words to learn before the questions. */
  learn: CwTerm[];
  questions: CwQuestion[];
}

export const NEW_PER_SET = 4;
export const REVIEW_PER_SET = 3;

/**
 * Build one set.
 * - `seen`: term ids the child has already met (in their memory boxes).
 * - `due`: term ids due for review today (from any level).
 * - `tricky`: question ids → times wrong, so missed ones come up more.
 * Up to 3 review questions come first, then the level's questions. Every new
 * word is asked about at least once in the set it's learned.
 */
export function generateCwSet(level: CwLevel, seen: Set<string>, due: string[], tricky: Record<string, number> = {}, rng: Rng = Math.random): CwSet {
  const terms = cwLevelTerms(level.id);
  const learn = shuffle(
    terms.filter((t) => !seen.has(t.id)),
    rng,
  ).slice(0, NEW_PER_SET);
  const learnIds = new Set(learn.map((t) => t.id));
  const kind = (): "m" | "w" => (rng() < 0.5 ? "m" : "w");

  // Review: due words from other levels first, then due words from this level.
  const levelIds = new Set(terms.map((t) => t.id));
  const dueOrdered = [...due.filter((id) => !levelIds.has(id)), ...due.filter((id) => levelIds.has(id))];
  const review: CwQuestion[] = [];
  for (const id of dueOrdered) {
    if (review.length >= REVIEW_PER_SET) break;
    const t = TERMS.get(id);
    if (t && !learnIds.has(id)) review.push({ ...termQuestion(t, kind(), level.choices, rng), review: true });
  }
  const used = new Set(review.map((q) => q.termId));

  // The level's own questions: new words first, then the rest (missed ones more likely), plus a couple of extras.
  const practised = terms.filter((t) => seen.has(t.id) && !used.has(t.id));
  const weighted = shuffle(practised, rng)
    .map((t) => ({ t, r: rng() / (1 + 2 * Math.min((tricky[`${t.id}:m`] ?? 0) + (tricky[`${t.id}:w`] ?? 0), 3)) }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.t);
  const main: CwQuestion[] = learn.map((t) => termQuestion(t, "m", level.choices, rng));
  const extras = shuffle(
    cwExtras(level.id).map((_, n) => n),
    rng,
  );
  // When there's nothing practised yet (first set), extras fill more of the set.
  const wantExtras = Math.min(extras.length, practised.length ? 2 : 4);
  for (const n of extras.slice(0, wantExtras)) main.push(extraQuestion(level.id, n, rng));
  for (const t of weighted) {
    if (main.length >= level.setSize) break;
    main.push(termQuestion(t, kind(), level.choices, rng));
  }
  // Still short (small level, early sets): ask the new words the other way round.
  for (const t of learn) {
    if (main.length >= level.setSize) break;
    main.push(termQuestion(t, "w", level.choices, rng));
  }
  for (const n of extras.slice(wantExtras)) {
    if (main.length >= level.setSize) break;
    main.push(extraQuestion(level.id, n, rng));
  }

  return { learn, questions: [...review, ...shuffle(main.slice(0, level.setSize), rng)] };
}

/** Is a question still answerable (term removed from content since it was saved)? */
export function hasTerm(id: string): boolean {
  return TERMS.has(id);
}
