# Kimi briefs

Task briefs for Kimi. One file per task: `NNN-short-name.md`. Claude (lead) writes them; Kimi builds them.

## Rules for every brief
1. Read `../PROJECT_BRIEF.md`, `../docs/skill-map.md` and `../README.md` first. Next.js 16 — read `../AGENTS.md` before touching framework code.
2. Work on a branch named `kimi/NNN-short-name` and open a pull request to `main`. Never push to `main` directly.
3. **Only touch the files the brief lists.** Do not edit these (Claude owns them, and is changing them now):
   `src/lib/store.ts`, `src/lib/store-types.ts`, `src/lib/merge.ts`, `src/lib/sync.ts`, `src/lib/mastery.ts`, `src/lib/tt.ts`, `src/app/layout.tsx`, `src/app/child/**`, `src/app/parent/**`, `src/app/setup/**`, `src/components/Sync*.tsx`, `supabase/**`.
4. Before opening the PR: `npm run lint`, `npm test` and `npm run build` must all pass.
5. All content must be original or from Crown-copyright National Curriculum documents (Open Government Licence). Nothing copied from Kumon, Little Wandle, Read Write Inc. or any commercial scheme.
6. Content is for children aged 5–9: everyday, kind, UK English (colour, mum, maths). No names of real people, brands, violence, scary or rude words — including in nonsense words.
7. When done, put `Status: done — PR #N` at the top of the brief and list anything you were unsure about under **Notes from Kimi**.

## Current briefs
| # | Brief | Status |
|---|---|---|
| 001 | [Phonics word lists](001-phonics-word-lists.md) | done — reviewed, PR #1 |
| 002 | [Spelling word lists](002-spelling-word-lists.md) | ready |
| 003 | [Tap, listen and sound-button components](003-choice-and-audio-components.md) | ready |

002 and 003 are independent — do them in any order, or in parallel.

**Work only in your own clone: `C:\Users\Dayib.Qalib\Downloads\AI-Project\KIMO-kimi`. Never in the `KIMO` folder.**
