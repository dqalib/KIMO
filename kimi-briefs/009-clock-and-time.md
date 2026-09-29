# 009 — Clock face component + time questions (MT-02, MT-03, MT-05)

Status: done — PR #9
Owner: Kimi · Reviewer: Claude, then DQ

## Goal
1. A reusable **analogue clock** component (SVG) for "what time does the clock show?" questions.
2. A generator for telling-the-time levels. No practice screen — Claude builds that on top (like 003).

## Files to create (nothing else)
- `src/components/ClockFace.tsx`
- `src/lib/mt-time.ts`
- `src/lib/mt-time.test.ts`
- `src/app/dev/clock/page.tsx` (hidden demo page, like `/dev/components`)

## 1. `ClockFace`
```tsx
<ClockFace hours={3} minutes={45} size={280} />
```
- Pure SVG, crisp at any size; iPad-first, matches the app's colours (`--ink`, `--line`, `--brand`, `--card`).
- Numbers 1–12, minute marks (small) and 5-minute marks (bigger); **hour hand short and thick, minute hand long and thin**, clearly different colours.
- Hour hand moves realistically between numbers (at 3:45 it's three-quarters of the way from 3 to 4).
- `aria-label` like "clock showing quarter to four".

## 2. Levels (`mt-time.ts`)
| Level | Year | Skill | Examples | Set |
|---|---|---|---|---|
| MT-02 | 1 | O'clock and half past | clock 3:00 → options {3 o'clock, half past 3, 12 o'clock}; "half past 7" → which clock? | 12 |
| MT-03 | 2 | Quarter past / to; 5-minute times | clock 4:15 → {quarter past 4, quarter to 4, quarter past 3}; clock 8:25 → "25 past 8" | 12 |
| MT-05 | 3–4 | To the minute; am/pm; 24-hour | clock 9:37 → "9:37" (digital options); "14:20 in 12-hour time" → {2:20 pm, 4:20 pm, 2:20 am}; "How many minutes from 3:45 to 4:10?" → 25 | 15 |

## API
```ts
export interface TimeQuestion {
  key: string;                       // e.g. "read:3:45", "12to24:14:20", "gap:3:45:4:10"
  prompt: string;                    // e.g. "What time does the clock show?"
  clock?: { hours: number; minutes: number };  // draw this clock when present
  answer: number | string;
  options?: string[];                // choices (required unless the answer is a whole number of minutes)
}
export const MT_TIME_LEVELS: { id: string; order: number; year: number; title: string; setSize: number; secondsPerQuestion: number }[];
export function generateTimeSet(levelId: string, tricky?: Record<string, number>, rng?: () => number): TimeQuestion[];
export function timeWords(h: number, m: number): string; // "quarter to 4", "25 past 8", "half past 7", "3 o'clock"
```
- UK wording: "quarter past", "half past", "quarter to", "25 past", "20 to"; "o'clock". No "4:15" in the words form.
- Wrong options believable (hands swapped, the hour before/after, past vs to).
- "Which clock?" questions: options are 3 `"h:mm"` strings the screen will draw as clocks — say so in a comment.

## Tests must check
Levels; unique keys; answers correct (independent recompute); options include the answer; `timeWords` for all 5-minute times of one hour (e.g. 4:00 → "4 o'clock", 4:35 → "25 to 5", 12:45 → "quarter to 1"); tricky bias.

## Demo page `/dev/clock`
A row of clocks: 3:00, 7:30, 4:15, 3:45, 8:25, 12:55, 9:37 with their `timeWords` underneath.

## Done when
`npm run lint`, `npm test`, `npm run build` pass; PR from `kimi/009-clock-and-time` with a screenshot of `/dev/clock` (portrait iPad) shown to DQ.

## Notes from Kimi

- `timeWords` folds any hour onto the 1–12 face, wraps for "to" (12:45 → "quarter to 1"), and falls back to `h:mm` for non-5-minute times — so `ClockFace`'s aria-label and MT-05 read answers share one wording function.
- Choices are always exactly 3 (correct + 2 believable wrongs): past/to flip, adjacent hour, hands-swapped reading; for digital: ±5 minutes, hour before/after, hands swapped. `gap` answers are whole numbers of minutes → keypad, no options.
- `which` options are `h:mm` strings with a comment noting the screen draws each as a clock; the question itself carries no `clock` field, `read` questions do.
- Hour hand angle is `(h % 12) * 30 + m * 0.5` — it moves between numbers, which is what makes "quarter to 4" clocks drawable correctly.
- Seconds-per-question (10/12/15) chosen per level difficulty; brief didn't specify.

## Review (Claude)
Accepted — a lovely clock, and every answer re-checked independently over 300 sets per level with no errors. Changes made in review:
- **Year 1 "which clock" wrong answers** were 5 minutes off (7:25, 7:35 for half past 7) — Year 1 only knows o'clock and half past. MT-02 now uses o'clock/half-past slips: for half past 7 → 7:00 and 8:30; for 7 o'clock → 7:30 and 6:30.
- **24-hour prompts** read "11:55 in 12-hour time?" — not clearly a 24-hour time. Now "What is 11:55 in 12-hour time?" with two-digit hours (07:50, 00:00).
- **Gaps** went up to 2 hours (82 minutes); now 5–60 minutes.
- Added `nextMTTimeLevel`, `prevMTTimeLevel`, `defaultMTTimeStart`; `ClockFace` takes `size` as a number or CSS length and imports `mt-time` relatively (tests don't resolve `@/`).
Lesson for next time: wrong options must only use what that year has been taught.

Screen: `/child/[id]/time` (numbers screen; clocks travel in the text as `[[clock:h:mm]]` and are drawn by `FractionText`), placement check, parent-report labels.
