# 008 — Fractions question generator (FR-02 → FR-06)

Status: done — PR #8
Owner: Kimi · Reviewer: Claude, then DQ

## Goal
Code that generates practice sets for the Fractions strand, Years 2–4. Library code and tests only — **no screens**. Same shape and style as your `src/lib/np.ts` (accepted with no changes — keep doing it that way). FR-01 (halves and quarters of *shapes*) needs pictures and comes later.

## Files to create (nothing else)
- `src/lib/fr.ts`
- `src/lib/fr.test.ts`

## Levels
| Level | Year | Skill | Examples | Set | Time |
|---|---|---|---|---|---|
| FR-02 | 2 | ½, ⅓, ¼, ¾ of amounts | `½ of 12 = ?` → 6, `¾ of 8 = ?` → 6, `⅓ of 9 = ?` → 3 | 15 | 10 s/q |
| FR-03 | 3 | Tenths; unit and non-unit fractions of amounts | `1/10 of 50 = ?` → 5, `3/5 of 20 = ?` → 12, `How many tenths make 1 whole?` → 10 | 15 | 12 s/q |
| FR-04 | 3 | Equivalent fractions | `1/2 = ?/4` → 2, `2/3 = 4/?` → 6, `Which is the same as 1/2?` {2/4, 1/3, 2/3} | 15 | 12 s/q |
| FR-05 | 3 | Add/subtract same denominator; compare | `2/7 + 3/7 = ?/7` → 5, `5/8 − 2/8 = ?/8` → 3, `3/5 ? 4/5` {<, >, =}, `Which is bigger: 1/3 or 1/4?` {1/3, 1/4} | 15 | 12 s/q |
| FR-06 | 4 | Hundredths; fractions ↔ decimals | `7/10 = 0.?` → 7, `Write 0.25 as hundredths: ?/100` → 25, `3/100 as a decimal` {0.03, 0.3, 3.0} | 15 | 15 s/q |

## API (like `np.ts`)
```ts
export interface FRLevel { id: string; order: number; year: number; title: string; setSize: number; secondsPerQuestion: number; }
export interface FRQuestion {
  key: string;            // stable ASCII, e.g. "of:3:4:8" (3/4 of 8), "eq:1:2:?:4", "add:2:3:7", "cmp:3:5:4:5"
  text: string;           // shown to the child; "?" marks the blank; use "/" (e.g. "3/4") — the screen will draw proper fractions later
  answer: number | string;
  options?: string[];     // REQUIRED for comparisons, "which is the same as", decimals (anything not a whole number 0–1000)
}
export const FR_LEVELS: FRLevel[];
export function getFRLevel(id: string): FRLevel | undefined;
export function nextFRLevel(id: string): FRLevel | undefined;
export function prevFRLevel(id: string): FRLevel | undefined;
export function defaultFRStart(schoolYear: number): string; // Y1–2 → FR-02, Y3 → FR-03, Y4 → FR-04
export function generateFRSet(level: FRLevel, tricky?: Record<string, number>, rng?: () => number): FRQuestion[];
```

## Rules
- Every "fraction of an amount" divides exactly (no remainders); amounts ≤ 100.
- Only denominators the curriculum uses for that year: Y2 halves, thirds, quarters; Y3 up to tenths; Y4 hundredths.
- No repeated key in a set; at least 3 question shapes per level; answers checked independently in the test.
- Comparisons: options exactly `["<", ">", "="]`, and `=` sometimes (e.g. `2/4 ? 1/2`).
- Wrong options believable (for 3/100: 0.03, 0.3, 3.0; for "same as 1/2": 2/4, 1/3, 2/3).
- Fractions in their simplest usual form where the answer is a fraction the child names.
- Tricky keys 3× as likely.

## `fr.test.ts` must check
1. Levels, links, `defaultFRStart`.
2. 200 seeded sets per level: size, unique keys, answers correct (recompute from the key), options rule, whole-number answers 0–1000.
3. The rules above (exact division, allowed denominators per year, `=` sometimes, shapes per level).
4. Tricky bias.

## Done when
`npm run lint`, `npm test`, `npm run build` pass; PR from `kimi/008-fractions-generator` with 2 example sets per level.

## Notes from Kimi

- Key grammar: `of:n:d:a`, `inv:n:d:r`, `howmany:d`, `eq:n:d:x:rd` / `eq:n:d:rn:x` (blank field is `x`), `same:n:d:k`, `cmp:a:b:c:d`, `add:a:b:d`, `sub:a:b:d`, `big:a:b:c:d`, `dec:n:d`, `hund:n:d`, `todec:n:d`.
- Exact division by construction: amounts are `d*k`, so "fraction of an amount" never has remainders; inverse questions (`1/3 of ? = 30`) are built the same way backwards.
- Options rule in one place: required unless the answer is a whole number 0–1000 (keypad). `cmp` options are exactly `["<",">","="]` with `=` at ~1/6 plus a forced `=` starter at FR-05; `big` carries exactly its two fractions (per the brief's example); `same` confusions are `n/(d·k)` and `(n+1)/(d+1)`; `todec` slips are digit-swap, 10×, and off-by-one in the last digit.
- Denominators per year: Y2 {2,3,4}, Y3 ≤ 10 — including equivalent-fraction questions (`k` is capped so `d·k ≤ 10`), Y4 hundredths set {2,4,5,10,20,25,50,100}. Compares and "which is bigger" use proper fractions only.
- Starter slots pin the headline skill every set (¾ of an amount at FR-02, an `=` compare at FR-05, …), which also guarantees ≥ 3 shapes per set; pools prune used keys so no key repeats within a set.
- Tricky weight is `1 + 2*min(count, 3)` — about 3× when unseen, mirroring np.ts.
