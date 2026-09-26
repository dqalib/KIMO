// Progress summaries for the parent dashboard and the child's home page:
// this week's practice, the daily goal, streaks, and "tricky" items across all
// subjects. Pure functions of the family data, so they're easy to test.

import { gpQuestions, GP_LEVELS } from "./grammar";
import { PASSAGES } from "./reading";
import type { AppState, Attempt } from "./store-types";

export const SUBJECTS: Record<string, string> = {
  TT: "Times tables",
  AS: "Adding & taking away",
  NP: "Numbers",
  PH: "Phonics",
  SP: "Spelling",
  GP: "Grammar",
  RC: "Reading",
};

export function subjectOf(levelId: string): string {
  return SUBJECTS[levelId.slice(0, 2)] ?? levelId;
}

export const DEFAULT_DAILY_GOAL = 2;

export function dailyGoal(s: AppState, childId: string): number {
  return s.dailyGoal?.[childId]?.sets ?? DEFAULT_DAILY_GOAL;
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export function setsOn(attempts: Attempt[], childId: string, day: Date): number {
  return attempts.filter((a) => a.childId === childId && sameDay(new Date(a.finishedAt), day)).length;
}

/** Days in a row with at least one set, counting back from today (or yesterday if nothing yet today). */
export function dayStreak(attempts: Attempt[], childId: string, now = new Date()): number {
  const days = new Set(attempts.filter((a) => a.childId === childId).map((a) => new Date(a.finishedAt).toDateString()));
  const d = new Date(now);
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(d.toDateString())) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export interface WeekSummary {
  sets: number;
  minutes: number;
  levelsPassed: string[];
  /** Last 7 days, oldest first. */
  days: { date: Date; sets: number; goalMet: boolean }[];
  bySubject: { subject: string; sets: number; accuracy: number }[];
}

export function weekSummary(s: AppState, childId: string, now = new Date()): WeekSummary {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const week = s.attempts.filter((a) => a.childId === childId && new Date(a.finishedAt) >= start && new Date(a.finishedAt) <= now);
  const goal = dailyGoal(s, childId);

  const days = Array.from({ length: 7 }, (_, k) => {
    const date = new Date(start);
    date.setDate(start.getDate() + k);
    const sets = setsOn(week, childId, date);
    return { date, sets, goalMet: sets >= goal };
  });

  const groups = new Map<string, Attempt[]>();
  for (const a of week) groups.set(subjectOf(a.levelId), [...(groups.get(subjectOf(a.levelId)) ?? []), a]);
  const bySubject = [...groups.entries()]
    .map(([subject, list]) => ({
      subject,
      sets: list.length,
      accuracy: list.reduce((t, a) => t + a.correctFirstTime, 0) / Math.max(1, list.reduce((t, a) => t + a.total, 0)),
    }))
    .sort((x, y) => y.sets - x.sets);

  return {
    sets: week.length,
    minutes: Math.round(week.reduce((t, a) => t + a.durationMs, 0) / 60000),
    levelsPassed: week.filter((a) => a.outcome === "levelPassed").map((a) => a.levelId),
    days,
    bySubject,
  };
}

export interface TrickyItem {
  subject: string;
  label: string;
  count: number;
}

const GP_BY_ID = new Map(GP_LEVELS.flatMap((l) => gpQuestions(l.id)).map((q) => [q.id, q]));
const PASSAGE_BY_ID = new Map(PASSAGES.map((p) => [p.id, p]));

function asLabel(key: string): string {
  return key.replace(/([+\-=])/g, " $1 ").replace(/ - /g, " − ").replace(/\s+/g, " ").trim();
}

/** The things each child most often gets wrong, across every subject. */
export function trickyItems(s: AppState, childId: string, limit = 8): TrickyItem[] {
  const out: TrickyItem[] = [];
  for (const [k, n] of Object.entries(s.weakFacts[childId] ?? {})) out.push({ subject: SUBJECTS.TT, label: k.replace("x", " × ").replace("/", " ÷ "), count: n });
  for (const [k, n] of Object.entries(s.asTricky?.[childId] ?? {})) out.push({ subject: SUBJECTS.AS, label: asLabel(k), count: n });
  for (const [k, n] of Object.entries(s.spTricky?.[childId] ?? {})) out.push({ subject: SUBJECTS.SP, label: k, count: n });
  for (const [k, n] of Object.entries(s.phTricky?.[childId] ?? {})) out.push({ subject: SUBJECTS.PH, label: k, count: n });
  for (const [k, n] of Object.entries(s.gpTricky?.[childId] ?? {})) {
    const q = GP_BY_ID.get(k);
    out.push({ subject: SUBJECTS.GP, label: q ? `${q.prompt}${q.sentence ? ` “${q.sentence}”` : ""}` : k, count: n });
  }
  for (const [k, n] of Object.entries(s.rcTricky?.[childId] ?? {})) out.push({ subject: SUBJECTS.RC, label: PASSAGE_BY_ID.get(k)?.title ?? k, count: n });
  return out.sort((a, b) => b.count - a.count).slice(0, limit);
}

