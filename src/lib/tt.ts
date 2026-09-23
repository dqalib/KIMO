// Times tables (TT) strand — levels and question generator.
// Source of truth: docs/skill-map.md section 2.

export type TTKind = "inOrder" | "mixed";
export type TTOp = "mul" | "div" | "missing";

export interface TTLevel {
  id: string;
  order: number;
  title: string;
  kind: TTKind;
  tables: number[];
  ops: TTOp[];
  setSize: number;
  secondsPerQuestion: number;
  /** MTC-style: question auto-skips (counts wrong) when time runs out. */
  hardLimit?: boolean;
  schoolYear: number;
}

export interface Question {
  key: string; // stable fact key, e.g. "7x8"
  prompt: string; // text shown to the child
  answer: number;
}

const ALL = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const TT_LEVELS: TTLevel[] = [
  { id: "TT-01", order: 1, title: "10× table", kind: "inOrder", tables: [10], ops: ["mul"], setSize: 12, secondsPerQuestion: 8, schoolYear: 2 },
  { id: "TT-02", order: 2, title: "2× table", kind: "inOrder", tables: [2], ops: ["mul"], setSize: 12, secondsPerQuestion: 8, schoolYear: 2 },
  { id: "TT-03", order: 3, title: "5× table", kind: "inOrder", tables: [5], ops: ["mul"], setSize: 12, secondsPerQuestion: 8, schoolYear: 2 },
  { id: "TT-04", order: 4, title: "2, 5 and 10 mixed", kind: "mixed", tables: [2, 5, 10], ops: ["mul"], setSize: 20, secondsPerQuestion: 6, schoolYear: 2 },
  { id: "TT-05", order: 5, title: "Dividing by 2, 5 and 10", kind: "mixed", tables: [2, 5, 10], ops: ["div"], setSize: 20, secondsPerQuestion: 8, schoolYear: 2 },
  { id: "TT-06", order: 6, title: "3× table", kind: "inOrder", tables: [3], ops: ["mul"], setSize: 12, secondsPerQuestion: 8, schoolYear: 3 },
  { id: "TT-07", order: 7, title: "4× table", kind: "inOrder", tables: [4], ops: ["mul"], setSize: 12, secondsPerQuestion: 8, schoolYear: 3 },
  { id: "TT-08", order: 8, title: "8× table", kind: "inOrder", tables: [8], ops: ["mul"], setSize: 12, secondsPerQuestion: 8, schoolYear: 3 },
  { id: "TT-09", order: 9, title: "3, 4 and 8 mixed", kind: "mixed", tables: [3, 4, 8], ops: ["mul", "div"], setSize: 20, secondsPerQuestion: 6, schoolYear: 3 },
  { id: "TT-10", order: 10, title: "6× table", kind: "inOrder", tables: [6], ops: ["mul"], setSize: 12, secondsPerQuestion: 8, schoolYear: 4 },
  { id: "TT-11", order: 11, title: "9× table", kind: "inOrder", tables: [9], ops: ["mul"], setSize: 12, secondsPerQuestion: 8, schoolYear: 4 },
  { id: "TT-12", order: 12, title: "7× table", kind: "inOrder", tables: [7], ops: ["mul"], setSize: 12, secondsPerQuestion: 8, schoolYear: 4 },
  { id: "TT-13", order: 13, title: "11× and 12× tables", kind: "mixed", tables: [11, 12], ops: ["mul"], setSize: 15, secondsPerQuestion: 8, schoolYear: 4 },
  { id: "TT-14", order: 14, title: "All tables mixed", kind: "mixed", tables: ALL, ops: ["mul"], setSize: 25, secondsPerQuestion: 6, schoolYear: 4 },
  { id: "TT-15", order: 15, title: "All tables, missing numbers and dividing", kind: "mixed", tables: ALL, ops: ["mul", "div", "missing"], setSize: 25, secondsPerQuestion: 6, schoolYear: 4 },
  { id: "TT-16", order: 16, title: "Tables Check rehearsal", kind: "mixed", tables: ALL, ops: ["mul"], setSize: 25, secondsPerQuestion: 6, hardLimit: true, schoolYear: 4 },
];

export function getLevel(id: string): TTLevel | undefined {
  return TT_LEVELS.find((l) => l.id === id);
}

export function nextLevel(id: string): TTLevel | undefined {
  const l = getLevel(id);
  return l ? TT_LEVELS.find((x) => x.order === l.order + 1) : undefined;
}

export function prevLevel(id: string): TTLevel | undefined {
  const l = getLevel(id);
  return l ? TT_LEVELS.find((x) => x.order === l.order - 1) : undefined;
}

export function defaultStartLevel(schoolYear: number): string {
  if (schoolYear >= 4) return "TT-06";
  return "TT-01";
}

/** Canonical fact key, order-independent for multiplication: 7x8 === 8x7. */
export function factKey(a: number, b: number): string {
  return a <= b ? `${a}x${b}` : `${b}x${a}`;
}

function build(op: TTOp, table: number, n: number): Question {
  const product = table * n;
  const key = factKey(table, n);
  switch (op) {
    case "mul":
      return { key, prompt: `${n} × ${table}`, answer: product };
    case "div":
      return { key, prompt: `${product} ÷ ${table}`, answer: n };
    case "missing":
      return { key, prompt: `? × ${table} = ${product}`, answer: n };
  }
}

type Rng = () => number;

/**
 * Build one practice set.
 * - inOrder: 1× to 12× of a single table, in order.
 * - mixed: random facts (×2 to ×12 — MTC never tests ×0 or ×1), no repeated
 *   prompt within a set, facts the child has got wrong before are weighted up.
 */
export function generateSet(
  level: TTLevel,
  weakFacts: Record<string, number> = {},
  rng: Rng = Math.random,
): Question[] {
  if (level.kind === "inOrder") {
    const t = level.tables[0];
    return Array.from({ length: level.setSize }, (_, i) => build("mul", t, i + 1));
  }

  // Candidate pool: every (op, table, n) combination.
  const pool: { q: Question; weight: number }[] = [];
  for (const op of level.ops) {
    for (const t of level.tables) {
      for (let n = 2; n <= 12; n++) {
        const q = build(op, t, n);
        const weight = 1 + 2 * Math.min(weakFacts[q.key] ?? 0, 3);
        pool.push({ q, weight });
      }
    }
  }

  const out: Question[] = [];
  const used = new Set<string>();
  while (out.length < level.setSize && pool.length > 0) {
    const total = pool.reduce((s, p) => s + p.weight, 0);
    let r = rng() * total;
    let idx = 0;
    for (; idx < pool.length - 1; idx++) {
      r -= pool[idx].weight;
      if (r < 0) break;
    }
    const [picked] = pool.splice(idx, 1);
    if (used.has(picked.q.prompt)) continue;
    used.add(picked.q.prompt);
    out.push(picked.q);
  }
  return out;
}
