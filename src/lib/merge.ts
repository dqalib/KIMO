// Merges two copies of the family's data (e.g. this iPad and the cloud copy).
// Pure function — no browser or network code — so it's easy to test.
//
// Rules:
// - Children: union by id; a child removed on either side stays removed (tombstone).
// - Times tables progress: per child, the most recently changed copy wins.
// - Attempts: union by id (append-only history), newest 2,000 kept.
// - Tricky facts: per fact, the higher count wins.
// - Phonics, spelling, grammar, addition/subtraction: most recently changed progress wins per child; tricky-word counts take the higher.
// - Handwriting: per letter, the further stage wins (then the longer streak).
// - Answer input (keypad/Pencil) per child: the most recently changed copy wins.
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

  const inputMode: NonNullable<AppState["inputMode"]> = {};
  for (const c of liveChildren) {
    const ia = a.inputMode?.[c.id];
    const ib = b.inputMode?.[c.id];
    const pick = !ib ? ia : !ia ? ib : ia.at >= ib.at ? ia : ib;
    if (pick) inputMode[c.id] = pick;
  }

  // Phonics and spelling: like times tables, most recently changed progress wins; tricky words take the max.
  const ph = mergeWordStrand(liveChildren, a.ph, b.ph, a.phUpdatedAt, b.phUpdatedAt, a.phTricky, b.phTricky);
  const sp = mergeWordStrand(liveChildren, a.sp, b.sp, a.spUpdatedAt, b.spUpdatedAt, a.spTricky, b.spTricky);
  const gp = mergeWordStrand(liveChildren, a.gp, b.gp, a.gpUpdatedAt, b.gpUpdatedAt, a.gpTricky, b.gpTricky);
  const as = mergeWordStrand(liveChildren, a.as, b.as, a.asUpdatedAt, b.asUpdatedAt, a.asTricky, b.asTricky);

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
    ...(Object.keys(inputMode).length ? { inputMode } : {}),
    ...(Object.keys(ph.progress).length ? { ph: ph.progress, phUpdatedAt: ph.updatedAt, phTricky: ph.tricky } : {}),
    ...(Object.keys(sp.progress).length ? { sp: sp.progress, spUpdatedAt: sp.updatedAt, spTricky: sp.tricky } : {}),
    ...(Object.keys(gp.progress).length ? { gp: gp.progress, gpUpdatedAt: gp.updatedAt, gpTricky: gp.tricky } : {}),
    ...(Object.keys(as.progress).length ? { as: as.progress, asUpdatedAt: as.updatedAt, asTricky: as.tricky } : {}),
  };
}

/** True when two states hold the same data (used to skip pointless uploads). */
export function sameState(a: AppState, b: AppState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

type Progress = NonNullable<AppState["ph"]>;
type Stamps = Record<string, string>;
type Tricky = Record<string, Record<string, number>>;

/** Merge one word-based strand (phonics or spelling) for every live child. */
function mergeWordStrand(
  children: { id: string }[],
  pa: Progress | undefined,
  pb: Progress | undefined,
  ta: Stamps | undefined,
  tb: Stamps | undefined,
  ka: Tricky | undefined,
  kb: Tricky | undefined,
) {
  const progress: Progress = {};
  const updatedAt: Stamps = {};
  const tricky: Tricky = {};
  for (const c of children) {
    const x = pa?.[c.id];
    const y = pb?.[c.id];
    const pick = !y ? "a" : !x ? "b" : later(ta?.[c.id], tb?.[c.id]);
    const p = pick === "a" ? x : y;
    if (p) progress[c.id] = p;
    const t = pick === "a" ? ta?.[c.id] : tb?.[c.id];
    if (t) updatedAt[c.id] = t;
    const tr: Record<string, number> = { ...(ka?.[c.id] ?? {}) };
    for (const [w, n] of Object.entries(kb?.[c.id] ?? {})) tr[w] = Math.max(tr[w] ?? 0, n);
    if (Object.keys(tr).length) tricky[c.id] = tr;
  }
  return { progress, updatedAt, tricky };
}
