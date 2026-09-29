# 010 — Coins, notes + money questions (MT-01, MT-04)

Status: ready
Owner: Kimi · Reviewer: Claude, then DQ

## Goal
1. A reusable **coin/note picture** component (SVG), like `ClockFace`.
2. A generator for the two money levels. No practice screen — Claude builds that (as for 008 and 009).

## Files to create (nothing else)
- `src/components/MoneyPicture.tsx`
- `src/lib/mt-money.ts`
- `src/lib/mt-money.test.ts`
- `src/app/dev/money/page.tsx` (hidden demo page, like `/dev/clock`)

## 1. `MoneyPicture`
```tsx
<MoneyPicture value={50} size="3em" />   // 50p coin; value in pence: 1,2,5,10,20,50,100,200 coins; 500,1000,2000 notes
```
- Pure SVG, **original simple drawings** — no copying of real coin designs, portraits or Bank of England artwork. Recognisable by shape, colour and the big value text: copper for 1p/2p, silver for 5p–50p, 50p and 20p **seven-sided**, £1 gold twelve-sided, £2 gold centre with silver ring; notes as coloured rectangles (£5 turquoise, £10 orange, £20 purple) with "£5" etc.
- Sizes relative to each other roughly like real coins (1p smaller than 2p, 5p smallest silver…).
- `size` is a number or CSS length (like `ClockFace`). `aria-label` like "50p coin", "£5 note".

## 2. Levels (`mt-money.ts`)
| Level | Year | Skill | Examples | Set | Time |
|---|---|---|---|---|---|
| MT-01 | 1 | Recognise coins and notes; count 1p/2p/5p/10p coins | picture of a 20p → options {20p, 2p, 50p}; "Which is the £1 coin?" (options are coin values the screen draws); 3 × 10p → "How much?" → 30 | 10 | none (0) |
| MT-04 | 2 | Combine coins; totals to £1; change from 50p / £1 | 20p + 10p + 5p → 35; "You pay 50p for a 35p apple. Change?" → 15; "Which coins make 25p?" options are coin groups | 12 | 0 |

## API
```ts
export interface MoneyQuestion {
  key: string;            // e.g. "name:20", "which:100", "count:10:3", "total:20+10+5", "change:50:35", "make:25"
  prompt: string;
  coins?: number[];       // draw these coins/notes in the question (pence)
  answer: number | string; // whole pence for the keypad, or an option string
  options?: string[];     // for pictures, use "[[coin:20]]" (one coin) or "[[coins:20+5]]" (a group) — the screen draws them
}
export const MT_MONEY_LEVELS: { id: string; order: number; year: number; title: string; setSize: number; secondsPerQuestion: number }[];
export function generateMoneySet(levelId: string, tricky?: Record<string, number>, rng?: () => number): MoneyQuestion[];
export function moneyWords(pence: number): string; // 35 → "35p", 100 → "£1", 250 → "£2.50", 500 → "£5"
```
## Rules
- Answers in pence for the keypad; totals ≤ 100 at MT-04, ≤ 50 at MT-01; change only from 50p or £1, never negative.
- Wrong options use what that year knows: coin mix-ups (2p/20p, 5p/50p, 10p/£1), counting slips (±1 coin). No amounts above £1 at MT-04.
- "Which coins make 25p?": exactly one group is right; wrong groups are close (20p+2p+2p, 10p+10p+10p).
- No repeated key in a set; at least 3 question shapes per level; tricky keys 3× as likely.

## Tests must check
Levels; unique keys; answers correct (recompute from the key); options include the answer; `moneyWords` for 1, 35, 100, 150, 205, 500, 2000; tricky bias.

## Demo page `/dev/money`
Every coin and note in a row with `moneyWords` underneath.

## Done when
`npm run lint`, `npm test`, `npm run build` pass; PR from `kimi/010-money` with a screenshot of `/dev/money` (portrait iPad).

## Notes from Kimi
(write here when done)
