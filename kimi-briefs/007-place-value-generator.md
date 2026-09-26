# 007 — Number & place value question generator (NP-01 → NP-09)

Status: done — PR #7
Owner: Kimi · Reviewer: Claude, then DQ

## Goal
Code that generates practice sets for the Number & Place Value strand (Years 1–4). Library code and tests only — **no screens**. Follow the style of `src/lib/as.ts` (your 005 — accepted with no changes, nice work) and `src/lib/tt.ts`.

## Files to create (nothing else)
- `src/lib/np.ts`
- `src/lib/np.test.ts`

## Levels
| Level | Year | Skill | Examples | Set | Time target |
|---|---|---|---|---|---|
| NP-01 | 1 | Numbers to 20: what comes next / before, write the number | `What comes after 13?` → 14, `6 tens and 0 ones`… (keep ≤ 20) | 15 | 8 s/q |
| NP-02 | 1 | One more / one less to 100 | `1 more than 39` → 40, `1 less than 70` → 69 | 15 | 8 s/q |
| NP-03 | 1 | Counting in 2s, 5s, 10s | `2, 4, 6, ?` → 8, `35, 40, ?, 50` → 45 | 15 | 10 s/q |
| NP-04 | 2 | Tens and ones to 100; compare | `4 tens and 7 ones` → 47, `63 ? 36` → `>` | 15 | 10 s/q |
| NP-05 | 3 | Counting in 3s, 4s, 8s, 50s, 100s | `24, 28, ?, 36` → 32, `150, 200, ?` → 250 | 15 | 10 s/q |
| NP-06 | 3 | Hundreds, tens, ones to 1,000; compare & order | `5 hundreds, 0 tens, 8 ones` → 508, `10 more than 395` → 405, `412 ? 421` → `<` | 15 | 12 s/q |
| NP-07 | 4 | Thousands to 10,000; 1,000 more / less | `1,000 more than 4,350` → 5,350, `What is the 7 worth in 7,204?` → 7000 | 15 | 12 s/q |
| NP-08 | 4 | Rounding to nearest 10, 100, 1,000 | `Round 347 to the nearest 10` → 350 | 15 | 12 s/q |
| NP-09 | 4 | Negative numbers; Roman numerals to 100 | `What is 3 less than 1?` → `-2`, `XIV = ?` → 14, `29 in Roman numerals` → `XXIX` | 15 | 15 s/q |

## API
```ts
export interface NPLevel { id: string; order: number; year: number; title: string; setSize: number; secondsPerQuestion: number; }
export interface NPQuestion {
  key: string;        // stable, ASCII, e.g. "after:13", "cmp:63:36", "round10:347"
  text: string;       // what the child sees. Use "?" for the blank. Numbers ≥ 1,000 with a comma: "4,350"
  answer: number | string;
  options?: string[]; // REQUIRED when the answer is not a whole number 0–10,000 typed on a keypad:
                      // comparisons ("<", ">", "="), negative answers, Roman numerals.
                      // 3–4 options, all different, including String(answer).
}
export const NP_LEVELS: NPLevel[];
export function getNPLevel(id: string): NPLevel | undefined;
export function nextNPLevel(id: string): NPLevel | undefined;
export function prevNPLevel(id: string): NPLevel | undefined;
export function defaultNPStart(schoolYear: number): string; // Y1 → NP-01, Y2 → NP-02, Y3 → NP-04, Y4 → NP-06
export function generateNPSet(level: NPLevel, tricky?: Record<string, number>, rng?: () => number): NPQuestion[];
```

## Rules
- No repeated `key` within a set. At least 3 different question shapes per level (e.g. NP-06: build from H/T/O, 10/100 more or less, compare).
- Keypad answers are whole numbers 0–10,000 (no commas in `answer`).
- Comparison questions: options exactly `["<", ">", "="]` and `=` is the answer sometimes (about 1 in 6).
- Counting sequences: blank in any position (not only last); never start at 0 every time.
- NP-02/06/07: include crossing a boundary (39 → 40, 395 + 10 → 405, 9,500 + 1,000 → 10,500 is too big — keep answers ≤ 10,000).
- NP-08: include halfway cases (345 → 350, 250 → 300 to the nearest 100) — UK rule: halfway rounds up.
- NP-09: negatives from −20 to 20 (temperatures are fine: `It is 2°C. It gets 5 degrees colder.`), Roman numerals I–C only, written correctly (IV, IX, XL, XC).
- Wrong options (where used) are believable: for Roman 14 → `XIV`, `XVI`, `IVX`; for −2 → `-2`, `2`, `-4`.
- Tricky keys 3× as likely, like `as.ts`.

## `np.test.ts` must check
1. Levels, order, years, `next`/`prev`, `defaultNPStart`.
2. Over 200 seeded sets per level: set size, no repeated keys, every answer correct (compute it independently in the test, don't reuse the generator's working), options rule above, keypad answers 0–10,000.
3. Each rule above holds (shapes per level, `=` sometimes, halfway cases appear, Roman numerals valid and round-trip).
4. Tricky bias works.

## Done when
- `npm run lint`, `npm test`, `npm run build` pass.
- PR from `kimi/007-place-value-generator` with 2 example sets per level in the PR description.

## Notes from Kimi
- Architecture reuses `as.ts` verbatim in spirit: `take` (used-aware pool top-up) + `push` + fixed opening slots; tricky keys weighted `1 + 2·min(count,3)`.
- Keys are self-describing so tests recompute answers independently without touching the generator's working: `after:13`, `cmp:63:36`, `m10:395`, `hto:5:0:8`, `2s:4:1` (step, start index, blank slot), `r100:250`, `digit:7:7204`, `roman:XIV`, `toroman:29`, `neg:3:1`.
- Opening slots guarantee the per-set rules: NP-02 boundary crossing (…9 → next ten, …0 → prev ten), NP-06 boundary crossing with 10 and 100, NP-07 thousands rollover (kept ≤ 10,000), NP-08 halfway cases (n ending 5 / 50 / 500, UK half-up), an `=` compare at NP-04/06/07, and all three NP-09 shapes every set.
- Roman options: `roman:` (numeral → number) options are close numbers (14 → `16, 12`); `toroman:` (number → numeral) options are believable numerals — neighbours plus the additive no-subtractive form a child might write (14 → `XVI, XIII, XIIII`).
- NP-07 `digit:` questions only use digits that appear once in the number, so "What is the 7 worth in 7,204?" is never ambiguous.
- NP-05/03 sequences: 4 terms, blank in any position (not only last), start index usually above 0; the test asserts all four blank positions occur and most sequences do not start at 0.
- Numbers ≥ 1,000 get a comma in `text` only (`4,350`); `answer` is always comma-free, and options follow `String(answer)`.
- Scope tests beyond the list: NP-01/02/03 answers ≤ 100, NP-04 ≤ 100, NP-07 answers ≤ 10,000, NP-09 negatives in −20..−1 and Roman round-trip 1↔100 checked in the test with an independent parser.
