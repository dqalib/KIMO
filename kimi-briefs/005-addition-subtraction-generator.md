# 005 — Addition & subtraction question generator (AS-01 → AS-05)

Status: ready
Owner: Kimi · Reviewer: Claude, then DQ

## Goal
Code that generates practice sets for the first five Addition & Subtraction levels (Years 1–2). Library code and tests only — **no screens** (Claude will build the screen on top, reusing the times-tables practice page).

Read `src/lib/tt.ts` and `src/lib/tt.test.ts` first and **match their style and API shape** (level list, `getLevel` / `next` / `prev`, `defaultStartLevel`, `generateSet` with an injectable random number function, bias towards facts the child got wrong before).

## Files to create (nothing else)
- `src/lib/as.ts`
- `src/lib/as.test.ts`

## Levels
| Level | Skill | Examples | Set | Time target |
|---|---|---|---|---|
| AS-01 | Number bonds to 10 | 3 + ? = 10, 10 − 6 = ?, 4 + 6 = ? | 15 q | 6 s/q |
| AS-02 | Add/subtract within 20 (bonds to 20) | 13 + 5 = ?, 17 − 9 = ?, ? + 12 = 20 | 20 q | 7 s/q |
| AS-03 | Missing numbers within 20 | 7 = ? − 9, ? + 8 = 15, 14 − ? = 6 | 15 q | 10 s/q |
| AS-04 | 2-digit ± 1-digit, and 2-digit ± tens | 47 + 6 = ?, 83 − 5 = ?, 36 + 40 = ? | 20 q | 10 s/q |
| AS-05 | Two 2-digit numbers; bonds to 100 | 34 + 25 = ?, 62 − 27 = ?, 45 + ? = 100 | 15 q | 15 s/q |

## API
```ts
export interface ASLevel { id: string; order: number; year: number; title: string; setSize: number; secondsPerQuestion: number; }
export interface ASQuestion {
  key: string;      // stable fact key for the "tricky facts" list, e.g. "3+7", "17-9", "?+8=15"
  text: string;     // what the child sees, e.g. "? + 8 = 15" — use "−" (U+2212) and "?" for the blank
  answer: number;   // always a whole number 0–100
}
export const AS_LEVELS: ASLevel[];
export function getASLevel(id: string): ASLevel | undefined;
export function nextASLevel(id: string): ASLevel | undefined;
export function prevASLevel(id: string): ASLevel | undefined;
export function defaultASStart(schoolYear: number): string; // Y1 → AS-01, Y2 → AS-02, Y3+ → AS-04
export function generateASSet(level: ASLevel, tricky?: Record<string, number>, rng?: () => number): ASQuestion[];
```

## Rules
- No repeated `key` within a set.
- Answers and every number shown are whole numbers from 0 to 100; no negative results.
- AS-01: bonds use both orders (3 + 7 and 7 + 3 are different keys) and include 0 + 10 / 10 + 0 at most once per set.
- AS-02: at least a third of questions cross 10 (8 + 5, 15 − 7).
- AS-03: the blank appears in every position (first number, second number, and answer-on-the-left like `7 = ? − 9`) across a set.
- AS-04: at least half the questions cross a tens boundary (47 + 6, 83 − 5).
- AS-05: about a third are bonds to 100 (`45 + ? = 100`); subtractions need exchanging at least some of the time (62 − 27).
- Mix + and − roughly half and half (± 20%) on every level.
- Tricky facts 3× as likely, like `tt.ts`.

## `as.test.ts` must check
1. Levels, order, years and `next`/`prev` links are right; `defaultASStart` as above.
2. For each level, over 200 seeded sets: set size right, no repeated keys, every answer correct (evaluate the text!), all numbers 0–100.
3. Each rule above (crossing 10 / tens, blank positions, bonds to 100, + and − mix) holds on average over those sets.
4. Tricky keys appear more often than without the bias.

## Done when
- `npm run lint`, `npm test`, `npm run build` pass.
- PR from `kimi/005-addition-subtraction-generator` with 3 example sets per level pasted in the PR description.

## Notes from Kimi
(write here when done)
