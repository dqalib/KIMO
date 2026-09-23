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
| `src/app/` | Screens: `/` picker, `/setup`, `/child/[id]`, `/child/[id]/practice`, `/parent` |
| `src/components/` | NumberPad, ParentGate |

Next.js 16 — read `AGENTS.md` before changing framework code.
