// Money, time & measures (MT) strand — telling-the-time levels and generator.
// Source of truth: docs/skill-map.md section MT. MT-04 (coins/change) and
// MT-06+ (scales, perimeter) are separate briefs.
// Mirrors the style and API shape of np.ts / fr.ts.

export interface MTTimeLevel {
  id: string;
  order: number;
  year: number;
  title: string;
  setSize: number;
  secondsPerQuestion: number;
}

export interface TimeQuestion {
  key: string; // stable ASCII, e.g. "read:3:45", "which:8:25", "12to24:14:20", "gap:3:45:4:10"
  prompt: string; // what the child sees
  clock?: { hours: number; minutes: number }; // the screen draws this clock when present
  answer: number | string;
  options?: string[]; // required unless the answer is a whole number of minutes (keypad)
}

export const MT_TIME_LEVELS: MTTimeLevel[] = [
  { id: "MT-02", order: 2, year: 1, title: "O'clock and half past", setSize: 12, secondsPerQuestion: 10 },
  { id: "MT-03", order: 3, year: 2, title: "Quarter past/to and 5-minute times", setSize: 12, secondsPerQuestion: 12 },
  { id: "MT-05", order: 5, year: 3, title: "Time to the minute, am/pm and 24-hour", setSize: 15, secondsPerQuestion: 15 },
];

export function getMTTimeLevel(id: string): MTTimeLevel | undefined {
  return MT_TIME_LEVELS.find((l) => l.id === id);
}

type Rng = () => number;
type Slot = () => TimeQuestion | undefined;

const ri = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));

/** "9:37" — hours 1-12 or 0-23, minutes always two digits. */
export function digital(h: number, m: number): string {
  return `${h}:${String(m).padStart(2, "0")}`;
}

/** "2:20 pm" from 24-hour time. */
export function to12Hour(H: number, M: number): string {
  const h = H % 12 === 0 ? 12 : H % 12;
  return `${digital(h, M)} ${H < 12 ? "am" : "pm"}`;
}

/**
 * UK wording for a time on a 12-hour clock: "3 o'clock", "quarter past 4",
 * "half past 7", "25 to 5". Wraps the hour for "to" form (12:45 → "quarter to 1").
 * Non-5-minute times fall back to digital, e.g. "9:37".
 */
export function timeWords(h: number, m: number): string {
  const hour12 = ((h + 11) % 12) + 1; // 0 or 13-23 fold onto the 1-12 face
  if (m % 5 !== 0) return digital(hour12, m); // not a sayable 5-minute time
  const next = (hour12 % 12) + 1;
  if (m === 0) return `${hour12} o'clock`;
  if (m === 15) return `quarter past ${hour12}`;
  if (m === 30) return `half past ${hour12}`;
  if (m === 45) return `quarter to ${next}`;
  if (m < 30) return `${m} past ${hour12}`;
  return `${60 - m} to ${next}`;
}

function q(key: string, prompt: string, answer: number | string, options?: string[], clock?: { hours: number; minutes: number }): TimeQuestion {
  return options ? { key, prompt, answer, options, clock } : { key, prompt, answer, clock };
}

/** Believable wrong word-times for a read question: past/to flip, adjacent hour, hands swapped. */
function wordWrongs(h: number, m: number): string[] {
  const hour12 = ((h + 11) % 12) + 1;
  const out: string[] = [];
  if (m > 0 && m < 30) out.push(timeWords(hour12, 60 - m)); // "20 past 3" read as "20 to 4"-style flip
  if (m > 30) out.push(timeWords(hour12, 60 - m));
  if (m === 0) out.push(`half past ${hour12}`);
  if (m === 30) out.push(`${hour12} o'clock`);
  out.push(timeWords((hour12 % 12) + 1, m)); // the hour after
  out.push(timeWords(((hour12 + 10) % 12) + 1, m)); // the hour before
  if (m % 5 === 0 && m !== 0) {
    // hands swapped: minute hand read as the hour, hour hand read as minutes
    out.push(timeWords(m / 5 === 0 ? 12 : m / 5, (hour12 * 5) % 60));
  }
  const correct = timeWords(h, m);
  return [...new Set(out)].filter((w) => w !== correct);
}

/** Believable wrong "h:mm" readings: off by 5 minutes, hour before/after, hands swapped. */
function digitalWrongs(h: number, m: number): string[] {
  const hour12 = ((h + 11) % 12) + 1;
  const out: string[] = [];
  if (m >= 5) out.push(digital(hour12, m - 5));
  if (m <= 54) out.push(digital(hour12, m + 5));
  out.push(digital((hour12 % 12) + 1, m));
  out.push(digital(((hour12 + 10) % 12) + 1, m));
  if (m % 5 === 0) out.push(digital(m === 0 ? 12 : m / 5, (hour12 * 5) % 60)); // hands swapped
  const correct = digital(hour12, m);
  return [...new Set(out)].filter((w) => w !== correct);
}

/** Shuffle the correct answer with up to two wrongs — the brief's choices are always 3. */
function shuffle3(rng: Rng, correct: string, wrongs: string[]): string[] {
  return shuffle(rng, [correct, ...wrongs.slice(0, 2)]);
}

function shuffle(rng: Rng, arr: string[]): string[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** read:h:m — "What time does the clock show?" with a drawn clock. */
function readQ(rng: Rng, h: number, m: number, digitalAnswer: boolean): TimeQuestion {
  const answer = digitalAnswer ? digital(h, m) : timeWords(h, m);
  const wrongs = digitalAnswer ? digitalWrongs(h, m) : wordWrongs(h, m);
  return q(`read:${h}:${m}`, "What time does the clock show?", answer, shuffle3(rng, answer, wrongs), { hours: h, minutes: m });
}

/** which:h:m — "Which clock shows X?". Options are 3 "h:mm" strings; the screen draws each as a clock. */
function whichQ(rng: Rng, h: number, m: number, digitalPrompt: boolean): TimeQuestion {
  const answer = digital(h, m);
  const label = digitalPrompt ? answer : timeWords(h, m);
  return q(`which:${h}:${m}`, `Which clock shows ${label}?`, answer, shuffle3(rng, answer, digitalWrongs(h, m)));
}

/** 12to24:H:M — "14:20 in 12-hour time?" → "2:20 pm". Wrongs: am/pm flip and off-by-one hour. */
function to12Q(rng: Rng, H: number, M: number): TimeQuestion {
  const answer = to12Hour(H, M);
  const flip = to12Hour((H + 12) % 24, M);
  const offH = H % 12 === 0 ? 12 : H % 12;
  const later = to12Hour((H + 1) % 24, M);
  const wrongs = [...new Set([flip, later, digital(offH === 12 ? 1 : offH + 1, M)])].filter((w) => w !== answer);
  return q(`12to24:${H}:${M}`, `${digital(H, M)} in 12-hour time?`, answer, shuffle3(rng, answer, wrongs));
}

/** gap:h:m:H:M — "How many minutes from 3:45 to 4:10?" → 25 (keypad, no options). */
function gapQ(h: number, m: number, H: number, M: number): TimeQuestion {
  const mins = (H * 60 + M) - (h * 60 + m);
  return q(`gap:${h}:${m}:${H}:${M}`, `How many minutes from ${digital(h, m)} to ${digital(H, M)}?`, mins);
}

export function generateTimeSet(
  levelId: string,
  tricky: Record<string, number> = {},
  rng: Rng = Math.random,
): TimeQuestion[] {
  const level = getMTTimeLevel(levelId);
  if (!level) throw new Error(`unknown level ${levelId}`);
  const weight = (key: string) => 1 + 2 * Math.min(tricky[key] ?? 0, 3);

  const used = new Set<string>();
  const out: TimeQuestion[] = [];
  const push = (qq: TimeQuestion | undefined) => {
    if (!qq || used.has(qq.key)) return false;
    used.add(qq.key);
    out.push(qq);
    return true;
  };

  // Candidate pools per shape, topped up on demand and pruned of used keys,
  // so tricky keys can be weighted up like in np.ts without repeats.
  const pools = new Map<string, TimeQuestion[]>();
  const take = (shape: string, build: () => TimeQuestion): TimeQuestion | undefined => {
    let pool = pools.get(shape);
    if (!pool) {
      pool = [];
      pools.set(shape, pool);
    }
    for (let i = pool.length - 1; i >= 0; i--) {
      if (used.has(pool[i].key)) pool.splice(i, 1);
    }
    const seen = new Set(pool.map((p) => p.key));
    for (let i = 0; i < 60 && pool.length < 60; i++) {
      const cand = build();
      if (!seen.has(cand.key) && !used.has(cand.key)) {
        seen.add(cand.key);
        pool.push(cand);
      }
    }
    if (pool.length === 0) return undefined;
    const weighted: { qq: TimeQuestion; w: number }[] = pool.map((p) => ({ qq: p, w: weight(p.key) }));
    const total = weighted.reduce((s, p) => s + p.w, 0);
    let r = rng() * total;
    let idx = 0;
    for (; idx < weighted.length - 1; idx++) {
      r -= weighted[idx].w;
      if (r < 0) break;
    }
    const [picked] = pool.splice(idx, 1);
    return picked;
  };

  const y1Time = () => { const h = ri(rng, 1, 12); return { h, m: rng() < 0.5 ? 0 : 30 }; };
  const y2Time = () => {
    const h = ri(rng, 1, 12);
    const m = 5 * ri(rng, 0, 11);
    return { h, m };
  };
  const y4Time = () => ({ h: ri(rng, 1, 12), m: ri(rng, 0, 59) });

  // Opening slots pin the headline skill every set (like np.ts starters).
  let starters: Slot[] = [];
  if (level.id === "MT-02") starters = [
    () => take("readoc", () => { const h = ri(rng, 1, 12); return readQ(rng, h, 0, false); }),
    () => take("readhp", () => { const h = ri(rng, 1, 12); return readQ(rng, h, 30, false); }),
    () => take("whichhp", () => { const h = ri(rng, 1, 12); return whichQ(rng, h, 30, false); }),
  ];
  if (level.id === "MT-03") starters = [
    () => take("readq", () => { const h = ri(rng, 1, 12); return readQ(rng, h, rng() < 0.5 ? 15 : 45, false); }),
    () => take("read5", () => { const { h, m } = y2Time(); return readQ(rng, h, m, false); }),
    () => take("whichq", () => { const h = ri(rng, 1, 12); return whichQ(rng, h, rng() < 0.5 ? 15 : 45, false); }),
  ];
  if (level.id === "MT-05") starters = [
    () => take("readdig", () => { const { h, m } = y4Time(); return readQ(rng, h, m, true); }),
    () => take("12to24", () => { const H = ri(rng, 0, 23); return to12Q(rng, H, 5 * ri(rng, 0, 11)); }),
    () => take("gap", () => { const { h, m } = y4Time(); const mins = h * 60 + m + ri(rng, 5, 120); return gapQ(h, m, Math.floor(mins / 60) % 24, mins % 60); }),
  ];

  for (const slot of starters) {
    for (let tries = 0; tries < 20 && out.length < starters.length && out.length < level.setSize; tries++) {
      if (push(slot())) break;
    }
  }

  while (out.length < level.setSize) {
    const before = out.length;
    const r = rng();
    switch (level.id) {
      case "MT-02": {
        const { h, m } = y1Time();
        if (r < 0.55) push(take("read", () => readQ(rng, h, m, false)));
        else push(take("which", () => whichQ(rng, h, m, false)));
        break;
      }
      case "MT-03": {
        const { h, m } = y2Time();
        if (r < 0.55) push(take("read", () => readQ(rng, h, m, false)));
        else push(take("which", () => whichQ(rng, h, m, false)));
        break;
      }
      case "MT-05": {
        if (r < 0.4) {
          const { h, m } = y4Time();
          push(take("read", () => readQ(rng, h, m, true)));
        } else if (r < 0.55) {
          const { h, m } = y4Time();
          push(take("which", () => whichQ(rng, h, m, true)));
        } else if (r < 0.8) {
          push(take("12to24", () => { const H = ri(rng, 0, 23); return to12Q(rng, H, ri(rng, 0, 59)); }));
        } else {
          const { h, m } = y4Time();
          const mins = h * 60 + m + ri(rng, 5, 120);
          push(take("gap", () => gapQ(h, m, Math.floor(mins / 60) % 24, mins % 60)));
        }
        break;
      }
    }
    if (out.length === before) {
      // every shape ran dry — retry the opening shapes, then give up
      for (const slot of starters) {
        if (push(slot())) break;
      }
    }
    if (out.length === before) break;
  }

  return out;
}
