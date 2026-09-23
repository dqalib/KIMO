# 001 — Phonics word lists (PH-01 → PH-16)

Status: ready
Owner: Kimi · Reviewer: Claude, then DQ

## Goal
Create the word data the phonics levels will use (for Shirwa, Year 1). Data only — no screens.

## Files to create (nothing else)
- `src/content/phonics/gpcs.json` — the sounds taught, in order
- `src/content/phonics/levels.json` — words for each level
- `src/content/phonics/phonics.test.ts` — validation tests (vitest)

## 1. `gpcs.json`
The grapheme–phoneme correspondences (GPCs) in teaching order, grouped by the level that introduces them. Use exactly the order in `docs/skill-map.md` section 2 (PH table).

```json
[
  { "level": "PH-01", "gpcs": [
    { "grapheme": "s", "say": "sss", "example": "sun" },
    { "grapheme": "a", "say": "a (as in ant)", "example": "ant" }
  ]}
]
```
- `say`: how an adult should pronounce it for the recording session (pure sound, no "uh").
- `example`: one simple, picturable word starting with or containing that sound.
- Include levels that introduce new GPCs: PH-01, 02, 03, 05, 06, 07, 08, 11, 12, 13, 14. (PH-04, 09, 10, 15, 16 introduce no new GPCs.)
- PH-07 needs both long `oo` (moon) and short `oo` (book) — use graphemes `"oo"` with `"variant": "long"` / `"short"`.
- PH-13 split digraphs are written `"a-e"`, `"e-e"`, `"i-e"`, `"o-e"`, `"u-e"`.
- PH-14 alternative pronunciations: list the grapheme with a `"variant"` label (e.g. `ow` as in snow vs cow; `ie` as in pie vs field; `ea` as in sea vs head; `ou`, `y`, `ch`, `c`, `g`, `a` (as in was), `o` (as in son)). Aim for 10–14 items.

## 2. `levels.json`
```json
[
  {
    "level": "PH-04",
    "words": [
      { "word": "pin", "graphemes": ["p", "i", "n"], "real": true },
      { "word": "huff", "graphemes": ["h", "u", "ff"], "real": true }
    ]
  },
  {
    "level": "PH-10",
    "words": [
      { "word": "vap", "graphemes": ["v", "a", "p"], "real": false }
    ]
  }
]
```

Every PH level (01 → 16) gets an entry.

| Level | What to include | Count |
|---|---|---|
| PH-01, 02, 03 | Real 2–3 letter words using only GPCs taught so far (e.g. *at, sat, pin*) | 20 each |
| PH-04 | CVC real words, all GPCs from PH-01 to PH-03 | 40 |
| PH-05 → PH-08 | Real words, each using at least one of that level's new GPCs | 30 each |
| PH-09 | Real CVCC / CCVC / CCVCC words (*frog, tent, stamp*) using PH-01→08 GPCs | 40 |
| PH-10 | **Nonsense ("alien") words** using PH-01→09 GPCs | 40 |
| PH-11 → PH-14 | Real words, each using at least one of that level's new GPCs | 30 each |
| PH-15 | **Nonsense words** using all GPCs | 40 |
| PH-16 | **Two check-style practice papers**, see below | 2 × 40 |

### PH-16 (check rehearsal)
Mirror the *structure* of the Year 1 Phonics Screening Check — do **not** copy words from real past papers.
- Two papers: `"paper": 1` and `"paper": 2` on each word.
- Each paper = 40 words: **section 1** (words 1–20) simpler GPCs and CVC/CCVC; **section 2** (words 21–40) harder GPCs, split digraphs, 2-syllable words.
- In each section: 8–10 nonsense words, the rest real. Put nonsense words first in each section.
- Add `"section": 1 | 2` to each word.

### Word rules
- `graphemes` joined together must spell the word, **except** split digraphs: `cake` = `["c", "a-e", "k"]` (the `e` is part of `a-e`, not a separate grapheme).
- Every grapheme in a word must be taught at that level or earlier (by `gpcs.json`).
- No duplicate words within a level. A word shouldn't appear in more than 2 levels.
- Nonsense words must be pronounceable, use only taught GPCs, and must not be real English words or sound like rude/unkind words when read aloud. Two-syllable nonsense words are fine in PH-15/16.
- Real words should be ones a 5–6 year old knows or can picture.

## 3. `phonics.test.ts`
Vitest tests that fail if the data breaks the rules. At minimum:
1. Every level PH-01 → PH-16 exists in `levels.json`, with the counts above.
2. Every grapheme used is in `gpcs.json` at the same level or earlier.
3. Graphemes rebuild the word (with the split-digraph rule).
4. No duplicates within a level.
5. PH-10 and PH-15 are all `real: false`; PH-16 has 2 papers × 40, sections of 20, 8–10 nonsense per section.
6. No word appears in more than 2 levels.

## Done when
- The three files exist and `npm test`, `npm run lint` and `npm run build` pass.
- PR opened from `kimi/001-phonics-word-lists` with a short summary: total words, total nonsense words, anything you weren't sure about.

## Notes from Kimi
(fill in)
