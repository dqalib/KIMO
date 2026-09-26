// Reading comprehension (RC strand). Passages are drafted by Kimi
// (src/content/reading/passages.json, all "draft") and only reach a child once
// a grown-up approves them on the parent page — approvals live in family data
// (AppState.rcReview) so they sync between devices.

import data from "../content/reading/passages.json";

export type RcSkill = "retrieval" | "sequence" | "vocabulary" | "inference" | "prediction" | "summary" | "word-choice";

export interface RcQuestion {
  skill: RcSkill;
  prompt: string;
  options: string[];
  answer: number;
}

export interface Passage {
  id: string;
  level: string;
  title: string;
  kind: "fiction" | "non-fiction";
  theme: string;
  text: string;
  wordCount: number;
  questions: RcQuestion[];
}

export type ReviewStatus = "approved" | "rejected";
export type Reviews = Record<string, { status: ReviewStatus; at: string }>;

export const PASSAGES: Passage[] = (data as { passages: Passage[] }).passages;

export interface RcLevel {
  id: string;
  order: number;
  year: number;
  title: string;
  accuracyTarget: number;
}

export const RC_LEVELS: RcLevel[] = [
  { id: "RC-01", order: 1, year: 1, title: "Short sentences: who, what, where", accuracyTarget: 0.75 },
  { id: "RC-02", order: 2, year: 1, title: "Little stories: what happened?", accuracyTarget: 0.75 },
  { id: "RC-03", order: 3, year: 2, title: "Stories and facts: word meanings", accuracyTarget: 0.75 },
  { id: "RC-04", order: 4, year: 2, title: "How do they feel?", accuracyTarget: 0.75 },
  { id: "RC-05", order: 5, year: 3, title: "Clues and predictions", accuracyTarget: 0.75 },
  { id: "RC-06", order: 6, year: 4, title: "Summing up; the author's words", accuracyTarget: 0.75 },
];

export function getRcLevel(id: string) {
  return RC_LEVELS.find((l) => l.id === id);
}
export function nextRcLevel(id: string) {
  const l = getRcLevel(id);
  return l ? RC_LEVELS.find((x) => x.order === l.order + 1) : undefined;
}
export function prevRcLevel(id: string) {
  const l = getRcLevel(id);
  return l ? RC_LEVELS.find((x) => x.order === l.order - 1) : undefined;
}

/** Start about a year below school year. */
export function defaultRcStart(schoolYear: number): string {
  if (schoolYear <= 2) return "RC-01";
  if (schoolYear === 3) return "RC-03";
  return "RC-05";
}

export function approvedPassages(levelId: string, reviews: Reviews = {}, all: Passage[] = PASSAGES): Passage[] {
  return all.filter((p) => p.level === levelId && reviews[p.id]?.status === "approved");
}

export function pendingPassages(reviews: Reviews = {}, all: Passage[] = PASSAGES): Passage[] {
  return all.filter((p) => !reviews[p.id]);
}

/**
 * Choose today's passage for a level: approved only, least-read first
 * (`readCounts` = passage id → times read), ties broken at random.
 */
export function pickPassage(
  levelId: string,
  reviews: Reviews,
  readCounts: Record<string, number> = {},
  rng: () => number = Math.random,
  all: Passage[] = PASSAGES,
): Passage | undefined {
  const pool = approvedPassages(levelId, reviews, all);
  if (!pool.length) return undefined;
  const least = Math.min(...pool.map((p) => readCounts[p.id] ?? 0));
  const fresh = pool.filter((p) => (readCounts[p.id] ?? 0) === least);
  return fresh[Math.floor(rng() * fresh.length)];
}

/** Text for read-aloud: title, then the passage. */
export function spokenPassage(p: Passage): string {
  return `${p.title}. ${p.text.replace(/\n+/g, " ")}`;
}

/** Newer review wins when two devices disagree. */
export function mergeReviews(a: Reviews = {}, b: Reviews = {}): Reviews {
  const out: Reviews = { ...a };
  for (const [id, r] of Object.entries(b)) if (!out[id] || r.at > out[id].at) out[id] = r;
  return out;
}
