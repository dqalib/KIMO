"use client";

// All reads/writes of family data go through this file.
// Data lives in localStorage on each device; src/lib/sync.ts copies it to/from Supabase.

import { useSyncExternalStore } from "react";
import type { LevelProgress, Outcome, SetResult } from "./mastery";
import { applySet } from "./mastery";
import { defaultASStart } from "./as";
import { defaultGpStart } from "./grammar";
import { defaultRcStart, type ReviewStatus } from "./reading";
import { defaultSpStart } from "./spelling";
import { defaultStartLevel, nextLevel, prevLevel } from "./tt";

export type { AppState, Attempt, Child, InputMode, LetterProgress } from "./store-types";
import type { AppState, Attempt, Child, InputMode, LetterProgress } from "./store-types";

const KEY = "kimo:v1";
const EMPTY: AppState = { version: 1, children: [], tt: {}, weakFacts: {}, attempts: [] };

let cache: AppState | null = null;
const listeners = new Set<() => void>();

function load(): AppState {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache!;
}

type SaveListener = (s: AppState) => void;
const saveListeners = new Set<SaveListener>();

/** Called after every local change (used by sync to upload). */
export function onLocalSave(l: SaveListener) {
  saveListeners.add(l);
  return () => saveListeners.delete(l);
}

function save(next: AppState, fromSync = false) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage full or blocked — keep working in memory
  }
  listeners.forEach((l) => l());
  if (!fromSync) saveListeners.forEach((l) => l(next));
}

/** Replace local data with a merged copy from sync. Does not trigger an upload. */
export function replaceFromSync(next: AppState) {
  save(next, true);
}

function now() {
  return new Date().toISOString();
}

function touched(s: AppState, childId: string): Record<string, string> {
  return { ...(s.progressUpdatedAt ?? {}), [childId]: now() };
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Returns null during server render / first paint, then the stored state. */
export function useAppState(): AppState | null {
  return useSyncExternalStore(subscribe, load, () => null);
}

export function getState(): AppState {
  return load();
}

function uid() {
  // randomUUID only exists on https/localhost; fall back elsewhere (e.g. testing over the home network).
  if (typeof globalThis.crypto?.randomUUID === "function") return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`kimo:${pin}`);
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `plain:${pin}`; // non-secure context fallback (local dev over LAN)
}

// Lets first-run setup add several children without re-entering the PIN.
let setupUnlocked = false;
export function unlockSetup() {
  setupUnlocked = true;
}
export function isSetupUnlocked() {
  return setupUnlocked;
}

export async function setParentPin(pin: string) {
  save({ ...load(), parentPinHash: await hashPin(pin), pinUpdatedAt: now() });
}

export async function checkParentPin(pin: string): Promise<boolean> {
  const s = load();
  return !!s.parentPinHash && s.parentPinHash === (await hashPin(pin));
}

export const AVATARS = ["🦁", "🐯", "🦊", "🐼", "🐸", "🐙", "🦖", "🚀", "⚽", "🤖"];
export const COLORS = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#db2777", "#0891b2"];

export function addChild(input: Omit<Child, "id">, startLevel?: string) {
  const s = load();
  const child: Child = { ...input, id: uid() };
  save({
    ...s,
    children: [...s.children, child],
    tt: {
      ...s.tt,
      [child.id]: {
        current: startLevel ?? defaultStartLevel(input.schoolYear),
        passed: [],
        passStreak: 0,
        failStreak: 0,
        flagged: false,
      },
    },
    progressUpdatedAt: touched(s, child.id),
  });
  return child;
}

export function removeChild(id: string) {
  const s = load();
  const { [id]: _tt, ...tt } = s.tt;
  const { [id]: _wf, ...weakFacts } = s.weakFacts;
  const { [id]: _pu, ...progressUpdatedAt } = s.progressUpdatedAt ?? {};
  void _tt;
  void _wf;
  void _pu;
  const { [id]: _hw, ...hw } = s.hw ?? {};
  void _hw;
  save({
    ...s,
    children: s.children.filter((c) => c.id !== id),
    tt,
    progressUpdatedAt,
    hw,
    weakFacts,
    attempts: s.attempts.filter((a) => a.childId !== id),
    deletedChildren: [...(s.deletedChildren ?? []), id],
  });
}

export function setCurrentLevel(childId: string, levelId: string) {
  const s = load();
  const p = s.tt[childId];
  if (!p) return;
  save({
    ...s,
    tt: { ...s.tt, [childId]: { ...p, current: levelId, passStreak: 0, failStreak: 0, flagged: false } },
    progressUpdatedAt: touched(s, childId),
    // Choosing a level by hand replaces the placement check.
    placed: { ...(s.placed ?? {}), [childId]: { ...(s.placed?.[childId] ?? {}), tt: s.placed?.[childId]?.tt ?? now() } },
  });
}

export function recordSet(
  childId: string,
  levelId: string,
  result: SetResult,
  wrong: { prompt: string; key: string }[],
): Outcome {
  const s = load();
  const p = s.tt[childId];
  const { progress, outcome } = applySet(p, levelId, result, nextLevel(levelId)?.id, prevLevel(levelId)?.id);

  const wf = { ...(s.weakFacts[childId] ?? {}) };
  for (const w of wrong) wf[w.key] = (wf[w.key] ?? 0) + 1;

  const attempt: Attempt = {
    id: uid(),
    childId,
    levelId,
    finishedAt: new Date().toISOString(),
    ...result,
    outcome,
    wrong: wrong.map((w) => w.prompt),
  };

  save({
    ...s,
    tt: { ...s.tt, [childId]: progress },
    progressUpdatedAt: touched(s, childId),
    weakFacts: { ...s.weakFacts, [childId]: wf },
    attempts: [...s.attempts, attempt].slice(-2000),
  });
  return outcome;
}

export function exportJson(): string {
  return JSON.stringify(load(), null, 2);
}

// ---- handwriting --------------------------------------------------------------

export const HW_CORRECT_TO_ADVANCE = 3;

export function letterProgress(s: AppState, childId: string, ch: string): LetterProgress {
  return s.hw?.[childId]?.[ch] ?? { stage: 1, streak: 0 };
}

/** Record one letter attempt. 3 correct in a row moves the letter to the next stage. */
export function recordLetter(childId: string, ch: string, ok: boolean): LetterProgress {
  const s = load();
  const cur = letterProgress(s, childId, ch);
  let next: LetterProgress;
  if (!ok) next = { stage: cur.stage, streak: 0 };
  else if (cur.streak + 1 >= HW_CORRECT_TO_ADVANCE && cur.stage < 4)
    next = { stage: (cur.stage + 1) as LetterProgress["stage"], streak: 0 };
  else next = { stage: cur.stage, streak: cur.stage === 4 ? 0 : cur.streak + 1 };
  save({ ...s, hw: { ...(s.hw ?? {}), [childId]: { ...(s.hw?.[childId] ?? {}), [ch]: next } } });
  return next;
}

/** Log a finished handwriting session so it counts for streaks and shows on the dashboard. */
export function recordLetterSession(childId: string, levelId: string, tries: number, correct: number, durationMs: number, wrong: string[], levelPassed: boolean) {
  const s = load();
  const attempt: Attempt = {
    id: uid(),
    childId,
    levelId,
    finishedAt: new Date().toISOString(),
    total: tries,
    correctFirstTime: correct,
    durationMs,
    secondsPerQuestion: 0,
    outcome: levelPassed ? "levelPassed" : correct / Math.max(tries, 1) >= 0.9 ? "setPassed" : "setFailed",
    wrong,
  };
  save({ ...s, attempts: [...s.attempts, attempt].slice(-2000) });
}

/** Parent override: set a letter's stage directly (e.g. mark as known). */
export function setLetterStage(childId: string, ch: string, stage: LetterProgress["stage"]) {
  const s = load();
  save({ ...s, hw: { ...(s.hw ?? {}), [childId]: { ...(s.hw?.[childId] ?? {}), [ch]: { stage, streak: 0 } } } });
}

// ---- answer input (keypad or Apple Pencil) ---------------------------------------

/** Extra seconds per question allowed when answering with the Pencil (writing is slower than tapping). */
export const PENCIL_EXTRA_SECONDS = 2;

export function getInputMode(s: AppState, childId: string): InputMode {
  return s.inputMode?.[childId]?.mode ?? "keypad";
}

export function setInputMode(childId: string, mode: InputMode) {
  const s = load();
  save({ ...s, inputMode: { ...(s.inputMode ?? {}), [childId]: { mode, at: now() } } });
}

// ---- level strands: phonics, spelling, grammar, addition & subtraction ----------
// Each strand keeps, per child: level progress, when it last changed (for sync),
// and a "tricky" count per word / question / fact the child got wrong.

export type Strand = "ph" | "sp" | "gp" | "as" | "rc";

const START: Record<Strand, (schoolYear: number) => string> = {
  ph: () => "PH-01",
  sp: defaultSpStart,
  gp: defaultGpStart,
  as: defaultASStart,
  rc: defaultRcStart,
};

export function strandProgress(s: AppState, strand: Strand, childId: string): LevelProgress {
  const existing = s[strand]?.[childId];
  if (existing) return existing;
  const year = s.children.find((c) => c.id === childId)?.schoolYear ?? 1;
  return { current: START[strand](year), passed: [], passStreak: 0, failStreak: 0, flagged: false };
}

export function strandTricky(s: AppState, strand: Strand, childId: string): Record<string, number> {
  return s[`${strand}Tricky`]?.[childId] ?? {};
}

/** True once the child has done (or been moved to) any level in this strand. */
export function strandStarted(s: AppState, strand: Strand, childId: string): boolean {
  return !!s[strand]?.[childId];
}

export function recordStrandSet(
  strand: Strand,
  childId: string,
  levelId: string,
  result: SetResult,
  wrongKeys: string[],
  next?: string,
  prev?: string,
  wrongLabels: string[] = wrongKeys,
  item?: string,
): Outcome {
  const s = load();
  const { progress, outcome } = applySet(strandProgress(s, strand, childId), levelId, result, next, prev);
  const tricky = { ...strandTricky(s, strand, childId) };
  for (const k of wrongKeys) tricky[k] = (tricky[k] ?? 0) + 1;
  const attempt: Attempt = {
    id: uid(),
    childId,
    levelId,
    finishedAt: new Date().toISOString(),
    ...result,
    outcome,
    wrong: wrongLabels,
    ...(item ? { item } : {}),
  };
  save({
    ...s,
    [strand]: { ...(s[strand] ?? {}), [childId]: progress },
    [`${strand}UpdatedAt`]: { ...(s[`${strand}UpdatedAt`] ?? {}), [childId]: now() },
    [`${strand}Tricky`]: { ...(s[`${strand}Tricky`] ?? {}), [childId]: tricky },
    attempts: [...s.attempts, attempt].slice(-2000),
  });
  return outcome;
}

export function setStrandLevel(strand: Strand, childId: string, levelId: string) {
  const s = load();
  const p = strandProgress(s, strand, childId);
  save({
    ...s,
    [strand]: { ...(s[strand] ?? {}), [childId]: { ...p, current: levelId, passStreak: 0, failStreak: 0, flagged: false } },
    [`${strand}UpdatedAt`]: { ...(s[`${strand}UpdatedAt`] ?? {}), [childId]: now() },
  });
}

// Shorthands used by the phonics and spelling screens.
export const phProgress = (s: AppState, childId: string) => strandProgress(s, "ph", childId);
export const spProgress = (s: AppState, childId: string) => strandProgress(s, "sp", childId);
export const setPhLevel = (childId: string, levelId: string) => setStrandLevel("ph", childId, levelId);
export const setSpLevel = (childId: string, levelId: string) => setStrandLevel("sp", childId, levelId);
export const recordPhSet = (childId: string, levelId: string, r: SetResult, wrong: string[], next?: string, prev?: string) =>
  recordStrandSet("ph", childId, levelId, r, wrong, next, prev);
export const recordSpSet = (childId: string, levelId: string, r: SetResult, wrong: string[], next?: string, prev?: string) =>
  recordStrandSet("sp", childId, levelId, r, wrong, next, prev);

// ---- reading: grown-up review of passages ---------------------------------------

export function reviewPassage(passageId: string, status: ReviewStatus | null) {
  const s = load();
  const rcReview = { ...(s.rcReview ?? {}) };
  if (status) rcReview[passageId] = { status, at: now() };
  else delete rcReview[passageId];
  save({ ...s, rcReview });
}

/** How many times each passage has been read by this child. */
export function passageReadCounts(s: AppState, childId: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of s.attempts) if (a.childId === childId && a.item && a.levelId.startsWith("RC-")) out[a.item] = (out[a.item] ?? 0) + 1;
  return out;
}

// ---- placement checks -----------------------------------------------------------

export type PlacementStrand = "tt" | Strand;

/**
 * Should this strand open with the placement check? Only the first time:
 * not yet placed, never practised, and the parent hasn't picked a level.
 */
export function needsPlacement(s: AppState, strand: PlacementStrand, childId: string): boolean {
  if (s.placed?.[childId]?.[strand]) return false;
  if (strand === "tt") return !s.attempts.some((a) => a.childId === childId && a.levelId.startsWith("TT-"));
  return !strandStarted(s, strand, childId);
}

/** Save the level a placement check chose (or mark it skipped when levelId is omitted). */
export function finishPlacement(strand: PlacementStrand, childId: string, levelId?: string) {
  if (levelId) {
    if (strand === "tt") setCurrentLevel(childId, levelId);
    else setStrandLevel(strand, childId, levelId);
  }
  const s = load();
  save({ ...s, placed: { ...(s.placed ?? {}), [childId]: { ...(s.placed?.[childId] ?? {}), [strand]: now() } } });
}

// ---- daily goal ---------------------------------------------------------------

export function setDailyGoal(childId: string, sets: number) {
  const s = load();
  save({ ...s, dailyGoal: { ...(s.dailyGoal ?? {}), [childId]: { sets, at: now() } } });
}
