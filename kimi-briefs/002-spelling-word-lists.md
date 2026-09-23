# 002 — Spelling word lists (SP-01 → SP-09)

Status: ready
Owner: Kimi · Reviewer: Claude, then DQ

## Goal
Create the spelling data for the SP strand (Years 1–4). The app will say the word, say it in a sentence, then the child types it. Data only — no screens.

## Source
The statutory spelling lists and rules in the **National Curriculum in England: English programmes of study, Appendix 1 (Spelling)** — GOV.UK, Crown copyright, Open Government Licence. Use the word lists exactly as published. Add the document URL in the file's `source` field.

## Files to create (nothing else)
- `src/content/spelling/levels.json`
- `src/content/spelling/spelling.test.ts`

## Levels (from `docs/skill-map.md` section 4)
| Level | Content |
|---|---|
| SP-01 | Year 1 common exception words (all of them) |
| SP-02 | Year 1 suffixes: -s / -es plurals, -ing, -ed, -er (on root words with no spelling change) — 30 words |
| SP-03 | Year 2 common exception words (all of them) |
| SP-04 | Year 2 suffixes -ly, -ment, -ness, -ful, -less, plus contractions (*can't, didn't, it's*) — 40 words |
| SP-05 | Years 3–4 statutory word list, first half alphabetically (*accident(ally)* → about half-way) |
| SP-06 | Prefixes un-, dis-, mis-, re-, in-, il-, im-, ir- — 40 words |
| SP-07 | Suffixes -ation, -ous, -tion, -sion, -ssion, -cian — 40 words |
| SP-08 | Year 3–4 homophones from Appendix 1 (e.g. *accept/except, knot/not, meet/meat*) — all pairs listed there |
| SP-09 | Years 3–4 statutory word list, second half |

For SP-02, 04, 06, 07 choose everyday words a child that age would know.

## Format
```json
{
  "source": "https://www.gov.uk/...",
  "levels": [
    {
      "level": "SP-01",
      "year": 1,
      "words": [
        { "word": "said", "sentence": "Mum said it was time for tea." }
      ]
    },
    {
      "level": "SP-08",
      "year": 3,
      "words": [
        { "word": "meat", "sentence": "We had meat and rice for dinner.", "homophoneOf": ["meet"] }
      ]
    }
  ]
}
```
- `sentence`: an original, short (5–10 words), friendly sentence containing the word exactly once, spelled the same way. It's read aloud to make the meaning clear — so it matters most for homophones.
- Where Appendix 1 gives a word with an optional ending, e.g. `accident(ally)`, include both as separate entries: `accident`, `accidentally`.

## `spelling.test.ts` must check
1. All nine levels exist with the right `year`.
2. No duplicate words within a level; SP-05 and SP-09 together contain the full Years 3–4 list with no overlap.
3. Every sentence contains its word exactly once (case-insensitive, whole word).
4. Every word is lowercase letters, apostrophes or hyphens only.
5. Every `homophoneOf` word also exists in SP-08.

## Done when
- `npm test`, `npm run lint`, `npm run build` pass.
- PR from `kimi/002-spelling-word-lists` with word counts per level.

## Notes from Kimi
(fill in)
