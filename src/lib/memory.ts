// "Do you still remember?" — spaced review across days (Leitner boxes).
//
// Every word or term a child answers goes into a box:
//   box 1 → see it again tomorrow, 2 → in 3 days, 3 → in a week,
//   4 → in 2 weeks, 5 → in a month.
// Right first time moves it up a box (further apart); wrong sends it back to
// box 1 (tomorrow). Later sets start with the items that are due, even from
// levels the child has already passed, so we find out if they still know them.
//
// Keys are namespaced by subject: "sp:because" (spelling), "cw:loop" (coding words).
// Pure functions — no browser code — so they're easy to test.

export interface MemItem {
  box: 1 | 2 | 3 | 4 | 5;
  /** Local date (YYYY-MM-DD) it's next due. */
  due: string;
  right: number;
  wrong: number;
  /** ISO time last answered (newest wins when two iPads merge). */
  last: string;
  /** Was the last review answer wrong? ("forgot it") */
  forgot?: boolean;
}

export type Memory = Record<string, MemItem>;

/** Days until the next review, by box. */
export const BOX_DAYS: Record<MemItem["box"], number> = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };

/** A box this high counts as "remembered well" on the report. */
export const REMEMBERED_BOX = 4;

export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * Apply one first-try answer. A brand-new item answered right starts in box 2
 * (they already knew it); wrong starts in box 1.
 */
export function updateItem(prev: MemItem | undefined, ok: boolean, now = new Date()): MemItem {
  let box: MemItem["box"];
  if (!prev) box = ok ? 2 : 1;
  else if (ok) box = Math.min(5, prev.box + 1) as MemItem["box"];
  else box = 1;
  return {
    box,
    due: dayKey(addDays(now, BOX_DAYS[box])),
    right: (prev?.right ?? 0) + (ok ? 1 : 0),
    wrong: (prev?.wrong ?? 0) + (ok ? 0 : 1),
    last: now.toISOString(),
    ...(prev && !ok ? { forgot: true } : {}),
  };
}

export function applyAnswers(mem: Memory, answers: { key: string; ok: boolean }[], now = new Date()): Memory {
  const out = { ...mem };
  for (const a of answers) out[a.key] = updateItem(out[a.key], a.ok, now);
  return out;
}

/**
 * Items due today or earlier for one subject (key prefix like "sp:"),
 * the most overdue / weakest first. Returns the part after the prefix.
 */
export function dueKeys(mem: Memory, prefix: string, now = new Date(), limit = Infinity): string[] {
  const today = dayKey(now);
  return Object.entries(mem)
    .filter(([k, m]) => k.startsWith(prefix) && m.due <= today)
    .sort(([, a], [, b]) => a.due.localeCompare(b.due) || a.box - b.box)
    .slice(0, limit)
    .map(([k]) => k.slice(prefix.length));
}

export interface MemorySummary {
  total: number;
  /** box ≥ 4: answered right on several different days. */
  remembered: number;
  learning: number;
  dueToday: number;
  /** Got right before, then wrong on a later day — listed for the parent. */
  forgotten: string[];
}

export function summarise(mem: Memory, prefix: string, now = new Date()): MemorySummary {
  const today = dayKey(now);
  const items = Object.entries(mem).filter(([k]) => k.startsWith(prefix));
  return {
    total: items.length,
    remembered: items.filter(([, m]) => m.box >= REMEMBERED_BOX).length,
    learning: items.filter(([, m]) => m.box < REMEMBERED_BOX).length,
    dueToday: items.filter(([, m]) => m.due <= today).length,
    forgotten: items
      .filter(([, m]) => m.forgot && m.box === 1)
      .sort(([, a], [, b]) => b.last.localeCompare(a.last))
      .map(([k]) => k.slice(prefix.length)),
  };
}

/** Merge two copies (two iPads): per item, the one answered most recently wins. */
export function mergeMemory(a: Memory = {}, b: Memory = {}): Memory {
  const out: Memory = { ...a };
  for (const [k, m] of Object.entries(b)) if (!out[k] || m.last > out[k].last) out[k] = m;
  return out;
}
