"use client";

// v0.1 storage: this device only (localStorage). Replaced by Supabase in the next step,
// so keep all reads/writes going through this file.

import { useSyncExternalStore } from "react";
import type { LevelProgress, Outcome, SetResult } from "./mastery";
import { applySet } from "./mastery";
import { defaultStartLevel, nextLevel, prevLevel } from "./tt";

export interface Child {
  id: string;
  name: string;
  schoolYear: number;
  avatar: string;
  color: string;
}

export interface Attempt {
  id: string;
  childId: string;
  levelId: string;
  finishedAt: string;
  total: number;
  correctFirstTime: number;
  durationMs: number;
  secondsPerQuestion: number;
  outcome: Outcome;
  wrong: string[]; // prompts answered wrong first time
}

export interface AppState {
  version: 1;
  parentPinHash?: string;
  children: Child[];
  tt: Record<string, LevelProgress>; // by child id
  weakFacts: Record<string, Record<string, number>>; // child id -> fact key -> count
  attempts: Attempt[];
}

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

function save(next: AppState) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage full or blocked — keep working in memory
  }
  listeners.forEach((l) => l());
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
  return Math.random().toString(36).slice(2, 10);
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
  save({ ...load(), parentPinHash: await hashPin(pin) });
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
  });
  return child;
}

export function removeChild(id: string) {
  const s = load();
  const { [id]: _tt, ...tt } = s.tt;
  const { [id]: _wf, ...weakFacts } = s.weakFacts;
  void _tt;
  void _wf;
  save({
    ...s,
    children: s.children.filter((c) => c.id !== id),
    tt,
    weakFacts,
    attempts: s.attempts.filter((a) => a.childId !== id),
  });
}

export function setCurrentLevel(childId: string, levelId: string) {
  const s = load();
  const p = s.tt[childId];
  if (!p) return;
  save({ ...s, tt: { ...s.tt, [childId]: { ...p, current: levelId, passStreak: 0, failStreak: 0, flagged: false } } });
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
    weakFacts: { ...s.weakFacts, [childId]: wf },
    attempts: [...s.attempts, attempt].slice(-2000),
  });
  return outcome;
}

export function exportJson(): string {
  return JSON.stringify(load(), null, 2);
}
