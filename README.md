# KIMO

Kumon-style daily practice web app for Years 1–4 (maths + English). Private family use.

- Project brief: [PROJECT_BRIEF.md](PROJECT_BRIEF.md)
- Skill map (levels + mastery rules): [docs/skill-map.md](docs/skill-map.md)
- Decisions: [docs/decisions.md](docs/decisions.md)
- Tasks for Kimi: [kimi-briefs/](kimi-briefs/)

## Status — v0.1
- Times tables (TT-01 → TT-16) working end to end: practice sets, corrections, mastery gate, level-up, drop-back.
- Parent PIN, child profiles, parent dashboard (progress, tricky facts, change level, backup download).
- Progress is stored **on the device** (browser storage). Supabase sync comes next.

## Run locally
```bash
npm install
npm run dev      # http://localhost:3000
npm test         # unit tests (question generator + mastery gate)
npm run build
```

## Code map
| Path | What |
|---|---|
| `src/lib/tt.ts` | Times tables levels + question generator |
| `src/lib/mastery.ts` | Mastery gate (pass / fail / drop-back rules and thresholds) |
| `src/lib/store.ts` | All data reads/writes (localStorage now, Supabase later) |
| `src/app/` | Screens: `/` picker, `/setup`, `/child/[id]`, `/child/[id]/practice`, `/parent` |
| `src/components/` | NumberPad, ParentGate |

Next.js 16 — read `AGENTS.md` before changing framework code.
