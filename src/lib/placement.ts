// Placement check: a short adaptive quiz the first time a child opens a
// strand. 3 questions per level, starting at the level for their school year:
//   3/3 right → step up a level     ≤1/3 right → step down a level
//   2/3 right → they're on the edge: start one level below
// Once they've gone up and then slip (or down and then succeed), we stop.
// Where it lands follows the skill map's "start one level below where they
// first slip" — easy enough to build confidence.

export const PER_LEVEL = 3;
export const MAX_ROUNDS = 6;

export interface Round {
  level: string;
  right: number;
}

export interface PlacementState {
  levels: string[]; // all levels of the strand, in order
  current: number; // index of the level being checked
  rounds: Round[];
  result?: string; // level to start at, once finished
}

export function startPlacement(levels: string[], startLevel: string): PlacementState {
  const i = levels.indexOf(startLevel);
  return { levels, current: i < 0 ? 0 : i, rounds: [] };
}

/** Record one level's round (`right` out of PER_LEVEL) and decide what's next. */
export function recordRound(s: PlacementState, right: number): PlacementState {
  if (s.result) return s;
  const level = s.levels[s.current];
  const rounds = [...s.rounds, { level, right }];
  const done = (index: number): PlacementState => ({ ...s, rounds, result: s.levels[Math.max(0, index)] });
  const passedBefore = (index: number) => s.rounds.some((r) => r.level === s.levels[index] && r.right >= PER_LEVEL);
  const failedAbove = s.rounds.some((r) => s.levels.indexOf(r.level) > s.current && r.right <= 1);

  if (right >= PER_LEVEL) {
    // Came down to here after slipping higher up, or nothing higher: start here.
    if (failedAbove || s.current === s.levels.length - 1 || rounds.length >= MAX_ROUNDS) return done(s.current);
    return { ...s, rounds, current: s.current + 1 };
  }
  if (right === PER_LEVEL - 1) {
    // On the edge of this level: start one below (or here if it's the first).
    return done(s.current - 1);
  }
  // Slipped: start at the level below if they passed it, else keep going down.
  if (s.current === 0) return done(0);
  if (passedBefore(s.current - 1) || rounds.length >= MAX_ROUNDS) return done(s.current - 1);
  return { ...s, rounds, current: s.current - 1 };
}
