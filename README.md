# KIMO

Kumon-style daily practice web app for Years 1–4 (maths + English). Private family use.

- Project brief: [PROJECT_BRIEF.md](PROJECT_BRIEF.md)
- Skill map (levels + mastery rules): [docs/skill-map.md](docs/skill-map.md)
- Decisions: [docs/decisions.md](docs/decisions.md)
- Tasks for Kimi: [kimi-briefs/](kimi-briefs/)

## Status — v0.2
- Times tables (TT-01 → TT-16) working end to end: practice sets, corrections, mastery gate, level-up, drop-back.
- Parent PIN, child profiles, parent dashboard (progress, tricky facts, change level, backup download).
- Cloud sync via Supabase (optional): one parent login, works offline, merges between iPads. Setup: [docs/supabase-setup.md](docs/supabase-setup.md).

## Run locally
```bash
npm install
cp .env.example .env.local   # optional: add Supabase values for sync
npm run dev      # http://localhost:3000
npm test         # unit tests (question generator + mastery gate)
npm run build
```

## Code map
| Path | What |
|---|---|
| `src/lib/tt.ts` | Times tables levels + question generator |
| `src/lib/mastery.ts` | Mastery gate (pass / fail / drop-back rules and thresholds) |
| `src/lib/store.ts` | All data reads/writes (localStorage on the device) |
| `src/lib/merge.ts` | Merges two copies of family data (device + cloud) |
| `src/lib/sync.ts` | Supabase sign-in and sync |
| `supabase/schema.sql` | Database table + security rules |
| `src/lib/letters.ts` | Handwriting: letter stroke templates + tracing checker |
| `src/lib/digits.ts` | Reads handwritten numbers from Pencil strokes (on-device) |
| `public/models/digits-v1.json` | Digit reader model (int8, ~200 KB) — retrain with `ml/digits/train.py` |
| `src/components/InkPad.tsx` | Apple Pencil canvas (pressure, palm rejection) |
| `src/components/PencilAnswer.tsx` | Write-your-answer box for maths |
| `src/lib/phonics.ts` | Phonics levels + question generator (uses `src/content/phonics`) |
| `src/lib/spelling.ts` | Spelling levels, set generator and marking (uses `src/content/spelling`) |
| `src/app/child/[id]/spelling/page.tsx`, `src/components/LetterKeyboard.tsx` | Spelling practice screen + big on-screen keyboard |
| `src/lib/grammar.ts`, `src/app/child/[id]/grammar/page.tsx` | Grammar & punctuation sets (uses `src/content/grammar`, Kimi 004) and practice screen |
| `src/lib/as.ts`, `src/app/child/[id]/maths/page.tsx` | Adding & taking away generator (Kimi 005) and practice screen |
| `src/components/NumberPractice.tsx` | Shared keypad/Pencil practice screen (times tables, adding & taking away) |
| `src/lib/reading.ts`, `src/app/child/[id]/reading/page.tsx`, `src/components/PassageReview.tsx` | Reading comprehension: approved-story picker, reading screen, parent approve/reject panel (stories from `src/content/reading`, Kimi 006) |
| `src/lib/placement.ts`, `src/app/child/[id]/check/[strand]/page.tsx` | Placement check (first visit to TT / AS / SP / GP) |
| `src/lib/strands.ts` | Which level strands show for which school year; drives home-page cards and parent level pickers |
| `src/components/ChoiceGrid.tsx`, `SpeakButton.tsx`, `SoundButtons.tsx`, `src/lib/speech.ts` | Tap-to-answer, text-to-speech and sound-button components (Kimi, brief 003) |
| `src/app/` | Screens: `/` picker, `/setup`, `/child/[id]`, `/child/[id]/practice`, `/parent` |
| `src/components/` | NumberPad, ParentGate |

Next.js 16 — read `AGENTS.md` before changing framework code.
