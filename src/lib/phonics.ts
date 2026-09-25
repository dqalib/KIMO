// Phonics (PH strand) — practice questions built from Kimi's word lists
// (src/content/phonics/*.json). See docs/skill-map.md section 2.
//
// Question types:
//  - "hear":    the app says a word; the child taps it among 3 words that differ by one sound.
//  - "missing": a word with one sound blanked out (ch_p), the app says the word; tap the missing sound.
//  - "real":    real word or alien (nonsense) word? (alien-word levels)
//  - "read":    the child reads the word aloud and a grown-up marks it ✓/✗ (alien words, check rehearsal).

import gpcData from "../content/phonics/gpcs.json";
import levelData from "../content/phonics/levels.json";

export interface PhWord {
  word: string;
  graphemes: string[];
  real: boolean;
  paper?: number;
  section?: number;
}

interface GpcLevel {
  level: string;
  gpcs: { grapheme: string; say: string; example: string; variant?: string }[];
}

const LEVEL_WORDS = new Map((levelData as { level: string; words: PhWord[] }[]).map((l) => [l.level, l.words]));
const GPC_LEVELS = gpcData as GpcLevel[];

export interface PhLevel {
  id: string;
  order: number;
  title: string;
  /** Question types used on this level. */
  kinds: ("hear" | "missing" | "real" | "read")[];
  setSize: number;
  /** A grown-up marks reading aloud on this level. */
  grownUp: boolean;
  /** Pass mark for a set (first-time accuracy). */
  accuracyTarget: number;
}

const TITLES: Record<string, string> = {
  "PH-01": "s a t p i n m d",
  "PH-02": "g o c k ck e u r",
  "PH-03": "h b f ff l ll ss",
  "PH-04": "Blending short words",
  "PH-05": "j v w x y z zz qu",
  "PH-06": "ch sh th ng nk",
  "PH-07": "ai ee igh oa oo",
  "PH-08": "ar or ur ow oi ear air er",
  "PH-09": "Longer words (frog, stamp)",
  "PH-10": "Alien words 1",
  "PH-11": "ay ou ie ea oy ir ue aw",
  "PH-12": "wh ph ew oe au ey",
  "PH-13": "a-e e-e i-e o-e u-e",
  "PH-14": "Sounds with two spellings",
  "PH-15": "Alien words 2",
  "PH-16": "Phonics check rehearsal",
};

export const PH_LEVELS: PhLevel[] = Array.from({ length: 16 }, (_, i) => {
  const id = `PH-${String(i + 1).padStart(2, "0")}`;
  const alien = id === "PH-10" || id === "PH-15";
  const check = id === "PH-16";
  return {
    id,
    order: i + 1,
    title: TITLES[id],
    kinds: check ? ["read"] : alien ? ["real", "read"] : ["hear", "missing"],
    setSize: check ? 40 : 10,
    grownUp: alien || check,
    // The real Year 1 check has had a pass mark of 32/40 (80%).
    accuracyTarget: check ? 0.8 : 0.9,
  };
});

export function getPhLevel(id: string) {
  return PH_LEVELS.find((l) => l.id === id);
}
export function nextPhLevel(id: string) {
  const l = getPhLevel(id);
  return l ? PH_LEVELS.find((x) => x.order === l.order + 1) : undefined;
}
export function prevPhLevel(id: string) {
  const l = getPhLevel(id);
  return l ? PH_LEVELS.find((x) => x.order === l.order - 1) : undefined;
}

export function levelWords(id: string): PhWord[] {
  return LEVEL_WORDS.get(id) ?? [];
}

/** Graphemes taught up to and including a level. */
export function taughtGraphemes(id: string): string[] {
  const order = Number(id.slice(3));
  return [...new Set(GPC_LEVELS.filter((g) => Number(g.level.slice(3)) <= order).flatMap((g) => g.gpcs.map((x) => x.grapheme)))];
}

/** Graphemes introduced on this level (empty for practice-only levels). */
export function newGraphemes(id: string): string[] {
  return [...new Set(GPC_LEVELS.find((g) => g.level === id)?.gpcs.map((x) => x.grapheme) ?? [])];
}

// ---- questions ----------------------------------------------------------------

export type PhQuestion =
  | { kind: "hear"; key: string; say: string; options: string[]; answer: number }
  | { kind: "missing"; key: string; say: string; graphemes: string[]; blank: number; options: string[]; answer: number }
  | { kind: "real"; key: string; word: PhWord; answer: boolean }
  | { kind: "read"; key: string; word: PhWord };

type Rng = () => number;

function shuffle<T>(xs: T[], rng: Rng): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** How many sounds differ between two words with the same number of sounds (∞ otherwise). */
export function soundDistance(a: PhWord, b: PhWord): number {
  if (a.graphemes.length !== b.graphemes.length) return Infinity;
  let d = 0;
  for (let i = 0; i < a.graphemes.length; i++) if (a.graphemes[i] !== b.graphemes[i]) d++;
  return d;
}

/** Pick 2 look-alike words for "hear" questions: same length, ideally one sound different. */
function lookalikes(target: PhWord, pool: PhWord[], rng: Rng): string[] {
  const others = pool.filter((w) => w.real && w.word !== target.word);
  const scored = shuffle(others, rng)
    .map((w) => ({ w, d: soundDistance(target, w), len: Math.abs(w.word.length - target.word.length) }))
    .sort((x, y) => x.d - y.d || x.len - y.len);
  return scored.slice(0, 2).map((s) => s.w.word);
}

/** Similar-looking sounds to use as wrong answers for a blanked-out sound. */
const CONFUSABLE: Record<string, string[]> = {
  b: ["d", "p"], d: ["b", "p"], p: ["b", "q"], m: ["n", "w"], n: ["m", "h"], u: ["n", "a"],
  a: ["o", "e"], e: ["i", "a"], i: ["e", "u"], o: ["a", "u"],
  sh: ["ch", "th"], ch: ["sh", "th"], th: ["sh", "ch"], ng: ["nk", "n"], nk: ["ng", "ck"],
  ai: ["ay", "ee"], ay: ["ai", "ey"], ee: ["ea", "ai"], ea: ["ee", "ai"], igh: ["ie", "i-e"], ie: ["igh", "ee"],
  oa: ["ow", "oo"], ow: ["oa", "ou"], oo: ["oa", "ue"], ar: ["or", "ur"], or: ["ar", "aw"], ur: ["ir", "er"],
  ir: ["ur", "er"], er: ["ur", "ir"], oi: ["oy", "ai"], oy: ["oi", "ay"], ou: ["ow", "oo"], ue: ["ew", "oo"],
  ew: ["ue", "oo"], aw: ["or", "au"], au: ["aw", "or"], ck: ["k", "c"], k: ["ck", "c"], c: ["k", "ck"],
};

function soundOptions(correct: string, taught: string[], rng: Rng): string[] {
  const pool = (CONFUSABLE[correct] ?? []).filter((g) => taught.includes(g) && g !== correct && !g.includes("-"));
  const sameSize = shuffle(
    taught.filter((g) => g !== correct && !g.includes("-") && (g.length > 1) === (correct.length > 1)),
    rng,
  );
  const picks: string[] = [];
  for (const g of [...shuffle(pool, rng), ...sameSize]) {
    if (picks.length >= 2) break;
    if (!picks.includes(g)) picks.push(g);
  }
  return picks;
}

function hearQ(w: PhWord, pool: PhWord[], rng: Rng): PhQuestion {
  const opts = shuffle([w.word, ...lookalikes(w, pool, rng)], rng);
  return { kind: "hear", key: w.word, say: w.word, options: opts, answer: opts.indexOf(w.word) };
}

function missingQ(w: PhWord, levelId: string, rng: Rng): PhQuestion | null {
  const taught = taughtGraphemes(levelId);
  const fresh = newGraphemes(levelId);
  // Blanking a sound in a 2-sound word ("_s") is too little to go on — use 3+ sounds.
  if (w.graphemes.length < 3) return null;
  const positions = w.graphemes.map((g, i) => ({ g, i })).filter((x) => !x.g.includes("-"));
  if (!positions.length) return null;
  // Prefer blanking this level's new sound, so the new learning gets the most practice.
  const preferred = positions.filter((x) => fresh.includes(x.g));
  const pick = (preferred.length ? preferred : positions)[Math.floor(rng() * (preferred.length || positions.length))];
  const wrong = soundOptions(pick.g, taught, rng);
  if (wrong.length < 2) return null;
  const opts = shuffle([pick.g, ...wrong], rng);
  return { kind: "missing", key: w.word, say: w.word, graphemes: w.graphemes, blank: pick.i, options: opts, answer: opts.indexOf(pick.g) };
}

/**
 * Build one practice set for a level.
 * `tricky` = words the child got wrong before (practised more often).
 */
export function generatePhSet(level: PhLevel, tricky: Record<string, number> = {}, rng: Rng = Math.random): PhQuestion[] {
  const words = levelWords(level.id);

  if (level.id === "PH-16") {
    // Alternate the two practice papers; the paper is chosen by the caller via rng.
    const paper = rng() < 0.5 ? 1 : 2;
    return words.filter((w) => w.paper === paper).map((w) => ({ kind: "read" as const, key: w.word, word: w }));
  }

  // Weighted pick without repeats: tricky words 3× as likely.
  const weighted = shuffle(words, rng)
    .map((w) => ({ w, r: rng() / (1 + 2 * Math.min(tricky[w.word] ?? 0, 3)) }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.w);

  // Look-alike words can come from this level or earlier ones (all use sounds already taught).
  const lookalikePool = [
    ...new Map(
      PH_LEVELS.filter((l) => l.order <= level.order && !l.grownUp)
        .flatMap((l) => levelWords(l.id))
        .map((w) => [w.word, w] as const),
    ).values(),
  ];

  const out: PhQuestion[] = [];
  for (const w of weighted) {
    if (out.length >= level.setSize) break;
    if (level.grownUp) {
      // Alien-word levels: mostly reading aloud, some "real or alien?" using real words from earlier levels.
      out.push({ kind: "read", key: w.word, word: w });
      continue;
    }
    const kind = level.kinds[out.length % level.kinds.length];
    const q = kind === "missing" ? missingQ(w, level.id, rng) ?? hearQ(w, lookalikePool, rng) : hearQ(w, lookalikePool, rng);
    out.push(q);
  }

  if (level.grownUp) {
    // Mix in "real or alien?" questions: half the set.
    const earlierReal = PH_LEVELS.filter((l) => l.order < level.order && !l.grownUp).flatMap((l) => levelWords(l.id)).filter((w) => w.real);
    const n = Math.floor(level.setSize / 2);
    const realPicks = shuffle(earlierReal, rng).slice(0, Math.ceil(n / 2));
    const alienPicks = shuffle(words, rng).filter((w) => !out.some((q) => q.key === w.word)).slice(0, n - realPicks.length);
    const reals: PhQuestion[] = [...realPicks, ...alienPicks].map((w) => ({ kind: "real", key: w.word, word: w, answer: w.real }));
    return shuffle([...out.slice(0, level.setSize - reals.length), ...reals], rng);
  }
  return out;
}
