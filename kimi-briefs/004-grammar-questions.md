# 004 — Grammar & punctuation questions (GP-01 → GP-12)

Status: ready
Owner: Kimi · Reviewer: Claude, then DQ

## Goal
Write the question bank for the GP strand (Years 1–4). Every question is **tap the right answer** (2–4 big buttons, shown with the existing `ChoiceGrid` component). Data and tests only — no screens.

## Source
Skills come from the **National Curriculum in England: English Appendix 2 (Vocabulary, grammar and punctuation)** — GOV.UK, Crown copyright, Open Government Licence. Put the URL in the file's `source` field. All sentences are **your own** — never copied from SATs papers, textbooks or any commercial scheme.

## Files to create (nothing else)
- `src/content/grammar/levels.json`
- `src/content/grammar/grammar.test.ts`

## Levels (from `docs/skill-map.md` section 4)
| Level | Year | Skill |
|---|---|---|
| GP-01 | 1 | Capital letters, full stops, finger spaces |
| GP-02 | 1 | Question marks, exclamation marks; joining with *and* |
| GP-03 | 2 | Nouns, verbs, adjectives |
| GP-04 | 2 | Conjunctions: *or, but, when, if, that, because* |
| GP-05 | 2 | Past/present tense; apostrophes for contraction |
| GP-06 | 2 | Commas in lists; apostrophe for possession (singular) |
| GP-07 | 3 | *a* vs *an*; word families; prefixes |
| GP-08 | 3 | Inverted commas (speech marks) |
| GP-09 | 3 | Present perfect; conjunctions/adverbs for time and cause |
| GP-10 | 4 | Fronted adverbials + comma; expanded noun phrases |
| GP-11 | 4 | Plural possession (*the girls' coats*); pronouns vs nouns |
| GP-12 | 4 | Standard English (*we were*, not *we was*) |

**30 questions per level** (360 total). Mix at least 3 question styles per level from the list below.

## Format
```json
{
  "source": "https://www.gov.uk/...",
  "levels": [
    {
      "level": "GP-03",
      "year": 2,
      "title": "Nouns, verbs, adjectives",
      "questions": [
        {
          "id": "GP-03-001",
          "style": "pick-word",
          "prompt": "Which word is a verb?",
          "sentence": "The small dog ran home.",
          "options": ["small", "dog", "ran", "home"],
          "answer": 2,
          "why": "A verb is a doing word. The dog *ran*."
        }
      ]
    }
  ]
}
```
- `id`: `GP-NN-NNN`, unique.
- `style`: one of
  - `pick-word` — which word in the sentence is a … (options are words from the sentence)
  - `pick-sentence` — which sentence is punctuated / written correctly? (options are whole sentences)
  - `fill-gap` — sentence with `___`; options fill the gap (e.g. `a` / `an`, `and` / `but` / `because`)
  - `pick-mark` — which punctuation mark goes at the end / in the box? (options like `.` `?` `!`)
  - `true-false` — options exactly `["Yes", "No"]`
- `sentence`: optional (not needed for `pick-sentence`). For `fill-gap` it must contain `___` exactly once.
- `options`: 2–4 strings, all different; `answer`: index of the right one.
- `why`: one short, kind sentence a child can understand, shown after a wrong answer. Words wrapped in `*asterisks*` will be shown in bold.
- Year 1–2 levels: sentences of 4–8 words, words a 5–7-year-old reads easily. Year 3–4: up to 14 words.
- Only one answer can be right. For `pick-sentence`, the wrong options must each have exactly one clear mistake.
- Content rules from `README.md` apply (UK spelling, kind, everyday topics, no real people or brands).

## `grammar.test.ts` must check
1. All 12 levels exist, in order, with the right `year`, each with exactly 30 questions.
2. `id`s are unique and match `GP-NN-NNN` for their level.
3. Every question has a valid `style`, 2–4 distinct options, and `answer` in range; `true-false` options are exactly `["Yes", "No"]`.
4. `fill-gap` sentences contain `___` exactly once; `pick-word` options all appear in the sentence (whole words).
5. No two questions in a level have the same `prompt` + `sentence` + `options`.
6. Each level uses at least 3 different styles, and no single answer position is used for more than 50% of that level's questions.
7. No curly quotes except inside GP-08 (speech marks) — keeps typing and TTS simple.

## Done when
- `npm run lint`, `npm test`, `npm run build` pass.
- PR from `kimi/004-grammar-questions`, with a count of styles per level in the PR description.

## Notes from Kimi
(write here when done)
