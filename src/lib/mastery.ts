// Mastery gate — docs/skill-map.md section 1.
// All thresholds here so they can be tuned in one place.

export const MASTERY = {
  accuracyTarget: 0.9, // first-time accuracy
  setsToPass: 2, // consecutive passing sets
  failsBeforeDropBack: 3, // consecutive failing sets
};

export interface SetResult {
  total: number;
  correctFirstTime: number;
  durationMs: number;
  secondsPerQuestion: number;
}

export interface LevelProgress {
  current: string;
  passed: string[];
  passStreak: number;
  failStreak: number;
  flagged: boolean; // shown on the parent dashboard
}

export function accuracy(r: SetResult): number {
  return r.total === 0 ? 0 : r.correctFirstTime / r.total;
}

export function timeTargetMs(r: SetResult): number {
  return r.total * r.secondsPerQuestion * 1000;
}

export function isPassingSet(r: SetResult): boolean {
  return accuracy(r) >= MASTERY.accuracyTarget && r.durationMs <= timeTargetMs(r);
}

export type Outcome = "levelPassed" | "setPassed" | "setFailed" | "droppedBack";

/**
 * Apply one finished set to a child's progress on a strand.
 * `next` / `prev` are the neighbouring level ids (undefined at either end).
 */
export function applySet(
  p: LevelProgress,
  levelId: string,
  result: SetResult,
  next: string | undefined,
  prev: string | undefined,
): { progress: LevelProgress; outcome: Outcome } {
  // Practising a level other than the current one (e.g. revision) doesn't move progress.
  if (levelId !== p.current) {
    return { progress: p, outcome: isPassingSet(result) ? "setPassed" : "setFailed" };
  }

  if (isPassingSet(result)) {
    const passStreak = p.passStreak + 1;
    if (passStreak >= MASTERY.setsToPass) {
      return {
        outcome: "levelPassed",
        progress: {
          current: next ?? p.current,
          passed: p.passed.includes(levelId) ? p.passed : [...p.passed, levelId],
          passStreak: 0,
          failStreak: 0,
          flagged: false,
        },
      };
    }
    return { outcome: "setPassed", progress: { ...p, passStreak, failStreak: 0 } };
  }

  const failStreak = p.failStreak + 1;
  if (failStreak >= MASTERY.failsBeforeDropBack && prev) {
    return {
      outcome: "droppedBack",
      progress: { ...p, current: prev, passStreak: 0, failStreak: 0, flagged: true },
    };
  }
  return {
    outcome: "setFailed",
    progress: { ...p, passStreak: 0, failStreak, flagged: failStreak >= MASTERY.failsBeforeDropBack },
  };
}
