// Progress summaries for the parent dashboard and the child's home page:
// this week's practice, the daily goal, streaks, and "tricky" items across all
// subjects. Pure functions of the family data, so they're easy to test.

import { gpQuestions, GP_LEVELS } from "./grammar";
import { timeWords } from "./mt-time";
import { PASSAGES } from "./reading";
import type { AppState, Attempt } from "./store-types";

export const SUBJECTS: Record<string, string> = {
  TT: "Times tables",
  AS: "Adding & taking away",
  NP: "Numbers",
  FR: "Fractions",
  MT: "Telling the time",
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

/** Readable version of a numbers question key (see src/lib/np.ts), e.g. "r100:250" → "round 250 to the nearest 100". */
export function npLabel(key: string): string {
  const [kind, ...p] = key.split(":");
  let m: RegExpMatchArray | null;
  if ((m = kind.match(/^([ml])(\d+)$/))) return `${m[2]} ${m[1] === "m" ? "more" : "less"} than ${p[0]}`;
  if ((m = kind.match(/^r(\d+)$/))) return `round ${p[0]} to the nearest ${m[1]}`;
  if ((m = kind.match(/^(\d+)s$/))) return `counting in ${m[1]}s`;
  const named: Record<string, () => string> = {
    after: () => `after ${p[0]}`,
    before: () => `before ${p[0]}`,
    between: () => `the number between ${Number(p[0]) - 1} and ${Number(p[0]) + 1}`,
    write: () => `writing ${p[0]}`,
    cmp: () => `${p[0]} ? ${p[1]}`,
    to: () => `${p[0]} tens and ${p[1]} ones`,
    hto: () => `${p[0]} hundreds, ${p[1]} tens, ${p[2]} ones`,
    tho: () => `${p[0]} thousands, ${p[1]} hundreds, ${p[2]} tens, ${p[3]} ones`,
    digit: () => `the ${p[0]} in ${p[1]}`,
    neg: () => "negative numbers",
    roman: () => `${p[0]} = ?`,
    toroman: () => `${p[0]} in Roman numerals`,
  };
  return named[kind]?.() ?? key.replace(/:/g, " ");
}

/** Readable version of a telling-the-time key (see src/lib/mt-time.ts), e.g. "read:3:45" → "reading quarter to 4". */
export function mtLabel(key: string): string {
  const [kind, ...p] = key.split(":").map((v, i) => (i === 0 ? v : Number(v))) as [string, ...number[]];
  const two = (n: number) => String(n).padStart(2, "0");
  if (kind === "read") return `reading ${timeWords(p[0], p[1])} on a clock`;
  if (kind === "which") return `finding the clock for ${timeWords(p[0], p[1])}`;
  if (kind === "12to24") return `${two(p[0])}:${two(p[1])} in 12-hour time`;
  if (kind === "gap") return `minutes from ${p[0]}:${two(p[1])} to ${p[2]}:${two(p[3])}`;
  return key.replace(/:/g, " ");
}

/** Readable version of a fractions question key (see src/lib/fr.ts), e.g. "of:3:4:8" → "3/4 of 8". */
export function frLabel(key: string): string {
  const [kind, ...p] = key.split(":");
  const f = (n: string, d: string) => `${n === "x" ? "?" : n}/${d === "x" ? "?" : d}`;
  const named: Record<string, () => string> = {
    of: () => `${f(p[0], p[1])} of ${p[2]}`,
    inv: () => `${f(p[0], p[1])} of ? = ${p[2]}`,
    howmany: () => `how many 1/${p[0]}s make a whole`,
    eq: () => `${f(p[0], p[1])} = ${f(p[2], p[3])}`,
    same: () => `the same as ${f(p[0], p[1])}`,
    cmp: () => `${f(p[0], p[1])} ? ${f(p[2], p[3])}`,
    big: () => `${f(p[0], p[1])} or ${f(p[2], p[3])}`,
    add: () => `${f(p[0], p[2])} + ${f(p[1], p[2])}`,
    sub: () => `${f(p[0], p[2])} − ${f(p[1], p[2])}`,
    dec: () => `${f(p[0], p[1])} as a decimal`,
    hund: () => `${f(p[0], p[1])} in hundredths`,
    todec: () => `${f(p[0], p[1])} as a decimal`,
    shade: () => `which fraction of a ${p[0] === "rect" ? "rectangle" : p[0]} is shaded (1/${p[1]})`,
    halves: () => `is a ${p[0] === "rect" ? "rectangle" : p[0]} cut into halves?`,
    quarters: () => `is a ${p[0] === "rect" ? "rectangle" : p[0]} cut into quarters?`,
    pick: () => `finding 1/${p[0]} of a ${p[1] === "rect" ? "rectangle" : p[1]}`,
    half: () => `half of ${p[0]}`,
    quarter: () => `a quarter of ${p[0]}`,
  };
  return named[kind]?.() ?? key.replace(/:/g, " ");
}

/** The things each child most often gets wrong, across every subject. */
export function trickyItems(s: AppState, childId: string, limit = 8): TrickyItem[] {
  const out: TrickyItem[] = [];
  for (const [k, n] of Object.entries(s.weakFacts[childId] ?? {})) out.push({ subject: SUBJECTS.TT, label: k.replace("x", " × ").replace("/", " ÷ "), count: n });
  for (const [k, n] of Object.entries(s.asTricky?.[childId] ?? {})) out.push({ subject: SUBJECTS.AS, label: asLabel(k), count: n });
  for (const [k, n] of Object.entries(s.npTricky?.[childId] ?? {})) out.push({ subject: SUBJECTS.NP, label: npLabel(k), count: n });
  for (const [k, n] of Object.entries(s.mtTricky?.[childId] ?? {})) out.push({ subject: SUBJECTS.MT, label: mtLabel(k), count: n });
  for (const [k, n] of Object.entries(s.frTricky?.[childId] ?? {})) out.push({ subject: SUBJECTS.FR, label: frLabel(k), count: n });
  for (const [k, n] of Object.entries(s.spTricky?.[childId] ?? {})) out.push({ subject: SUBJECTS.SP, label: k, count: n });
  for (const [k, n] of Object.entries(s.phTricky?.[childId] ?? {})) out.push({ subject: SUBJECTS.PH, label: k, count: n });
  for (const [k, n] of Object.entries(s.gpTricky?.[childId] ?? {})) {
    const q = GP_BY_ID.get(k);
    out.push({ subject: SUBJECTS.GP, label: q ? `${q.prompt}${q.sentence ? ` “${q.sentence}”` : ""}` : k, count: n });
  }
  for (const [k, n] of Object.entries(s.rcTricky?.[childId] ?? {})) out.push({ subject: SUBJECTS.RC, label: PASSAGE_BY_ID.get(k)?.title ?? k, count: n });
  return out.sort((a, b) => b.count - a.count).slice(0, limit);
}

