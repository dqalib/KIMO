# 006 — Reading comprehension passages (RC-01 → RC-06)

Status: done — PR #6
Owner: Kimi · Reviewer: Claude, then **DQ approves each passage** before the children see it

## Goal
Write the first bank of reading passages with questions for the RC strand (Years 1–4). Data and tests only — no screens. Every passage is saved as `"status": "draft"`; DQ will approve or reject each one in a review screen Claude is building.

## Files (nothing else)
- `src/content/reading/passages.json` — **already exists on `main` with an empty list** (the app reads it). Fill in the `passages` array; keep the file name and top-level shape.
- `src/content/reading/reading.test.ts` — create.

The reading screen and DQ's approve/reject panel are already built (`src/lib/reading.ts` has the `Passage` type your data must match). Pass mark per story is 75%.

## Levels (from `docs/skill-map.md` section 4)
| Level | Year | Passage | Question focus | Passages | Questions each |
|---|---|---|---|---|---|
| RC-01 | 1 | 3–5 short sentences, decodable (phonics PH-01 → PH-09 words + common tricky words) | who / what / where | 8 | 3 |
| RC-02 | 1–2 | 60–100 words, simple story | retrieval + order of events | 8 | 4 |
| RC-03 | 2 | 100–150 words, story or fact | retrieval + word meaning | 8 | 4 |
| RC-04 | 2 | 150–200 words | retrieval + simple inference (*how does she feel?*) | 8 | 5 |
| RC-05 | 3 | 200–300 words, half fiction / half non-fiction | retrieval, inference, prediction | 8 | 5 |
| RC-06 | 4 | 300–400 words, half fiction / half non-fiction | summarise, inference, author's word choice | 8 | 6 |

48 passages in total.

## Format
```json
{
  "passages": [
    {
      "id": "RC-03-004",
      "level": "RC-03",
      "title": "The Busy Beaver",
      "kind": "non-fiction",
      "theme": "animals",
      "text": "Beavers live near rivers and streams...\n\nThey use their strong teeth...",
      "wordCount": 128,
      "questions": [
        {
          "skill": "retrieval",
          "prompt": "What do beavers use to cut down trees?",
          "options": ["Their tails", "Their teeth", "Their paws"],
          "answer": 1
        },
        {
          "skill": "vocabulary",
          "prompt": "In the second paragraph, what does 'gnaw' mean?",
          "options": ["to chew", "to swim", "to sleep"],
          "answer": 0
        }
      ],
      "status": "draft"
    }
  ]
}
```
- `id`: `RC-NN-NNN`, unique. `kind`: `"fiction"` or `"non-fiction"`. `theme`: one or two words (animals, school, weather, space, food, family, sport, seaside, history, nature…) — no theme more than 5 times overall.
- `text`: paragraphs separated by `\n\n`. `wordCount` must equal the real number of words.
- `skill`: one of `retrieval`, `sequence`, `vocabulary`, `inference`, `prediction`, `summary`, `word-choice` — only the ones listed for the level (RC-01 is `retrieval` only).
- `options`: 3 short options (RC-01/02) or 3–4 (RC-03+), all different, only **one** can be defended from the text. `answer`: its index; spread answer positions (no position more than 50% within a level).
- Every retrieval answer must be findable in the text. Inference answers must be supported by a clue in the text.
- Non-fiction facts must be true and checkable (simple, well-known facts only — nothing you're unsure of).
- Content rules from `README.md` apply. Also: no brand names, no real places smaller than a country, nothing sad about pets dying, no scary endings.

## `reading.test.ts` must check
1. Exactly 8 passages per level, `id`s unique and matching their level, all `status: "draft"`.
2. `wordCount` equals the counted words in `text`, and is inside the level's range (RC-01: 3–5 sentences instead).
3. Question count per level as in the table; skills allowed for the level; RC-05/06 have 4 fiction + 4 non-fiction.
4. Options distinct and 3–4 long; `answer` in range; no answer position more than 50% of a level.
5. No theme used more than 5 times; no two passages with the same title.
6. No curly quotes or dashes other than a plain hyphen (keeps read-aloud simple).

## Done when
- `npm run lint`, `npm test`, `npm run build` pass.
- PR from `kimi/006-reading-passages`, listing titles per level in the PR description.

## Notes from Kimi
- `status: "draft"` is stored in the JSON per this brief, but the `Passage` type in `src/lib/reading.ts` has no `status` field — the data carries it ahead of the type. Suggest adding `status?: "draft"` there if the review screen reads it.
- RC-06 skills restricted to inference / summary / word-choice exactly as the level table lists; the factual questions in the four non-fiction passages are phrased as word-choice or inference rather than retrieval so the allowed set holds.
- RC-01 passages are 3-5 short sentences (~20-25 words) built from PH-01..PH-09 style words plus common tricky words; all RC-01 questions are retrieval with 3 options.
- Answer positions were rotated deliberately while authoring (RC-06 uses 4 options throughout so positions balance at 12 each); the test enforces no position over 50% of a level either way.
- Word counting is whitespace-split (`text.split(/\s+/).filter(Boolean).length`); `wordCount` was computed with the same rule, so data and test always agree.
- Non-fiction facts kept to simple, certainly-true facts only (water cycle, bees, Roman roads, space station, solar system, bread); no brands, no real places smaller than a country, no curly quotes or non-hyphen dashes anywhere (title, text, prompts, options).
