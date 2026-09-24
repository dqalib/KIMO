// Merges two copies of the family's data (e.g. this iPad and the cloud copy).
// Pure function — no browser or network code — so it's easy to test.
//
// Rules:
// - Children: union by id; a child removed on either side stays removed (tombstone).
// - Times tables progress: per child, the most recently changed copy wins.
// - Attempts: union by id (append-only history), newest 2,000 kept.
// - Tricky facts: per fact, the higher count wins.
// - Handwriting: per letter, the further stage wins (then the longer streak).
// - Parent PIN: the most recently changed copy wins.

import type { AppState, LetterProgress } from "./store-types";

const MAX_ATTEMPTS = 2000;

function later(a?: string, b?: string): "a" | "b" {
  if (!a) return b ? "b" : "a";
  if (!b) return "a";
  return a >= b ? "a" : "b";
}

export function mergeStates(a: AppState, b: AppState): AppState {
  const deleted = Array.from(new Set([...(a.deletedChildren ?? []), ...(b.deletedChildren ?? [])]));
  const gone = new Set(deleted);

  const children = [...a.children];
  for (const c of b.children) if (!children.some((x) => x.id === c.id)) children.push(c);
  const liveChildren = children.filter((c) => !gone.has(c.id));

  const tt: AppState["tt"] = {};
  const progressUpdatedAt: Record<string, string> = {};
  for (const c of liveChildren) {
    const pa = a.tt[c.id];
    const pb = b.tt[c.id];
    const ta = a.progressUpdatedAt?.[c.id];
    const tb = b.progressUpdatedAt?.[c.id];
    const pick = !pb ? "a" : !pa ? "b" : later(ta, tb);
    const p = pick === "a" ? pa : pb;
    if (p) tt[c.id] = p;
    const t = pick === "a" ? ta : tb;
    if (t) progressUpdatedAt[c.id] = t;
  }

  const byId = new Map<string, AppState["attempts"][number]>();
  for (const at of [...a.attempts, ...b.attempts]) if (!gone.has(at.childId)) byId.set(at.id, at);
  const attempts = [...byId.values()].sort((x, y) => x.finishedAt.localeCompare(y.finishedAt)).slice(-MAX_ATTEMPTS);

  const weakFacts: AppState["weakFacts"] = {};
  for (const c of liveChildren) {
    const wa = a.weakFacts[c.id] ?? {};
    const wb = b.weakFacts[c.id] ?? {};
    const merged: Record<string, number> = { ...wa };
    for (const [k, n] of Object.entries(wb)) merged[k] = Math.max(merged[k] ?? 0, n);
    if (Object.keys(merged).length) weakFacts[c.id] = merged;
  }

  const hw: NonNullable<AppState["hw"]> = {};
  for (const c of liveChildren) {
    const ha = a.hw?.[c.id] ?? {};
    const hb = b.hw?.[c.id] ?? {};
    const merged: Record<string, LetterProgress> = { ...ha };
    for (const [ch, pb] of Object.entries(hb)) {
      const pa = merged[ch];
      if (!pa || pb.stage > pa.stage || (pb.stage === pa.stage && pb.streak > pa.streak)) merged[ch] = pb;
    }
    if (Object.keys(merged).length) hw[c.id] = merged;
  }

  const pinFrom = later(a.pinUpdatedAt, b.pinUpdatedAt) === "a" ? a : b;
  const parentPinHash = pinFrom.parentPinHash ?? a.parentPinHash ?? b.parentPinHash;
  const pinUpdatedAt = pinFrom.pinUpdatedAt;

  return {
    version: 1,
    ...(parentPinHash ? { parentPinHash } : {}),
    ...(pinUpdatedAt ? { pinUpdatedAt } : {}),
    children: liveChildren,
    tt,
    progressUpdatedAt,
    weakFacts,
    attempts,
    deletedChildren: deleted,
    ...(Object.keys(hw).length ? { hw } : {}),
  };
}

/** True when two states hold the same data (used to skip pointless uploads). */
export function sameState(a: AppState, b: AppState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
