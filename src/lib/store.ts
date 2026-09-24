"use client";

// All reads/writes of family data go through this file.
// Data lives in localStorage on each device; src/lib/sync.ts copies it to/from Supabase.

import { useSyncExternalStore } from "react";
import type { Outcome, SetResult } from "./mastery";
import { applySet } from "./mastery";
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

