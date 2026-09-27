# 009 — Clock face component + time questions (MT-02, MT-03, MT-05)

Status: ready
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
(write here when done)
