// Grammar & punctuation (GP strand) — practice sets from Kimi's question bank
// (src/content/grammar/levels.json). See docs/skill-map.md section 4.
// Every question is "tap the right answer" (ChoiceGrid).

import data from "../content/grammar/levels.json";

export type GpStyle = "pick-word" | "pick-sentence" | "fill-gap" | "pick-mark" | "true-false";

export interface GpQuestion {
  id: string;
  style: GpStyle;
  prompt: string;
  sentence?: string;
  options: string[];
  answer: number;
  /** Shown after a wrong answer; *words* in asterisks are shown in bold. */
  why: string;
}

interface RawLevel {
  level: string;
  year: number;
  title: string;
  questions: GpQuestion[];
}

const RAW = data.levels as RawLevel[];

export interface GpLevel {
  id: string;
  order: number;
  year: number;
  title: string;
  setSize: number;
  accuracyTarget: number;
}

export const GP_LEVELS: GpLevel[] = RAW.map((l, i) => ({
  id: l.level,
  order: i + 1,
  year: l.year,
  title: l.title,
  setSize: 10,
  // Understanding strand: accuracy only, no time target.
  accuracyTarget: 0.9,
}));

const QUESTIONS = new Map(RAW.map((l) => [l.level, l.questions]));

export function getGpLevel(id: string) {
  return GP_LEVELS.find((l) => l.id === id);
}
export function nextGpLevel(id: string) {
  const l = getGpLevel(id);
  return l ? GP_LEVELS.find((x) => x.order === l.order + 1) : undefined;
}
export function prevGpLevel(id: string) {
  const l = getGpLevel(id);
  return l ? GP_LEVELS.find((x) => x.order === l.order - 1) : undefined;
}
export function gpQuestions(id: string): GpQuestion[] {
  return QUESTIONS.get(id) ?? [];
}

/** Start about a year below school year until placement tests exist. */
export function defaultGpStart(schoolYear: number): string {
  if (schoolYear <= 2) return "GP-01";
  if (schoolYear === 3) return "GP-03";
  return "GP-07";
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
 * Put a question's options in a new random order (answer index follows).
 * Yes/No questions keep Yes first — children expect that.
 */
export function shuffleOptions(q: GpQuestion, rng: Rng = Math.random): GpQuestion {
  if (q.style === "true-false") return q;
  const order = shuffle(q.options.map((_, i) => i), rng);
  return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
}

/** One set: `setSize` different questions, tricky ones (by id) 3× as likely. */
export function generateGpSet(level: GpLevel, tricky: Record<string, number> = {}, rng: Rng = Math.random): GpQuestion[] {
  return shuffle(gpQuestions(level.id), rng)
    .map((q) => ({ q, r: rng() / (1 + 2 * Math.min(tricky[q.id] ?? 0, 3)) }))
    .sort((a, b) => a.r - b.r)
    .slice(0, level.setSize)
    .map((x) => shuffleOptions(x.q, rng));
}

/** Text for read-aloud: the question, then the sentence with the gap said as "blank". */
export function spokenGp(q: GpQuestion): string {
  const sentence = q.sentence ? ` ${q.sentence.replace("___", "blank")}` : "";
  return `${q.prompt}${sentence}`;
}
