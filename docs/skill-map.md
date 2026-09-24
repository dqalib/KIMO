# KIMO Skill Map — Years 1–4

Version 0.1 · 2026-09-23 · Owner: Claude (lead) · Review: DQ

This is the backbone of the app. Every question the app shows belongs to exactly one **level**. A child moves through levels in order, and only advances after passing the **mastery gate**.

---

## 1. How it works

### Strands
| Code | Subject | Strand | Years |
|---|---|---|---|
| **TT** | Maths | Times tables & division facts | Y2–Y4 |
| **NP** | Maths | Number & place value | Y1–Y4 |
| **AS** | Maths | Addition & subtraction | Y1–Y4 |
| **FR** | Maths | Fractions | Y1–Y4 |
| **MT** | Maths | Money, time & measures | Y1–Y4 |
| **PH** | English | Phonics (sounds → reading words) | Y1–Y2 |
| **SP** | English | Spelling | Y1–Y4 |
| **GP** | English | Grammar & punctuation | Y1–Y4 |
| **RC** | English | Reading comprehension | Y1–Y4 |
| **HW** | English | Handwriting — letter formation (Apple Pencil) | Y1–Y2 |

Level IDs are `STRAND-NN` (e.g. `TT-07`). These are our own names — nothing borrowed from Kumon.

### A practice session
- One **set** = 10–25 questions from a single level, shown one at a time.
- Wrong answers are shown again at the end of the set for correction (Kumon-style "fix before finish").
- Daily session = 1–2 sets per subject, ~10–15 minutes per child.

### Mastery gate (default rule)
A level is **passed** when the child scores **≥ 90% first-time accuracy** AND finishes **within the target time** on **2 sets in a row**.
- Fluency levels (TT, number bonds, phonics sounds) use strict time targets.
- Understanding levels (FR, GP, RC) use accuracy only, with a generous time cap.
- Fail 3 sets in a row on a level → app drops back one level for review and flags it on the parent dashboard.
- Parent can override: pass, repeat or skip any level.

All thresholds live in config, not code, so we can tune them during the first month of use.

### Placement test
- 5-minute adaptive test per strand: starts at the child's school-year level, steps down after mistakes and up after successes.
- Child starts **one level below** where they first slip — Kumon's "start easy, build confidence" idea.

### Question types (iPad-first)
| Type | Used for |
|---|---|
| Number pad | Maths facts, calculations |
| Tap choice (2–4 big buttons) | Phonics, grammar, fractions, comprehension |
| Drag to order / match | Place value, sentence building, sorting |
| Listen & choose | Phonics (hear a sound or word, tap the match) |
| Read aloud (parent-marked) | Phonics blending — child reads, parent taps ✓ / ✗ |
| Type word (on-screen keyboard) | Spelling (word is spoken, child types it) |

---

## 2. Release 1 — build first

### TT · Times tables (Yaqub, Yonis)
Target: Year 4 **Multiplication Tables Check** — 25 questions, 6 seconds each, tables up to 12×12.

| Level | Skill | Example | Set | Time target |
|---|---|---|---|---|
| TT-01 | 10× table (in order) | 3 × 10 = ? | 12 q | 8s/q |
| TT-02 | 2× table (in order) | 7 × 2 = ? | 12 q | 8s/q |
| TT-03 | 5× table (in order) | 6 × 5 = ? | 12 q | 8s/q |
| TT-04 | 2, 5, 10 mixed | 9 × 5 = ? | 20 q | 6s/q |
| TT-05 | Division facts for 2, 5, 10 | 35 ÷ 5 = ? | 20 q | 8s/q |
| TT-06 | 3× table | 8 × 3 = ? | 12 q | 8s/q |
| TT-07 | 4× table (double the 2s) | 7 × 4 = ? | 12 q | 8s/q |
| TT-08 | 8× table (double the 4s) | 6 × 8 = ? | 12 q | 8s/q |
| TT-09 | 3, 4, 8 mixed + division | 32 ÷ 4 = ? | 20 q | 6s/q |
| TT-10 | 6× table | 7 × 6 = ? | 12 q | 8s/q |
| TT-11 | 9× table | 8 × 9 = ? | 12 q | 8s/q |
| TT-12 | 7× table | 7 × 8 = ? | 12 q | 8s/q |
| TT-13 | 11× and 12× tables | 12 × 6 = ? | 15 q | 8s/q |
| TT-14 | All tables mixed | 9 × 7 = ? | 25 q | 6s/q |
| TT-15 | All tables + missing factor & division | ? × 6 = 42 | 25 q | 6s/q |
| TT-16 | **MTC rehearsal** (exact format) | 25 random, 3 practice first | 25 q | 6s/q hard limit |

Year 3 = TT-01 → TT-09 · Year 4 = TT-10 → TT-16.
Question generator rules: no repeated question within a set; ×0 and ×1 never tested (MTC excludes them); bias 2× towards facts the child has got wrong before.

### PH · Phonics (Shirwa)
Target: Year 1 **Phonics Screening Check** — 40 words (real and "alien" nonsense words), read aloud to the teacher.

Sound order follows the common DfE-validated progression. **Configurable**: once we know Shirwa's school scheme (Little Wandle, Read Write Inc., etc.) we reorder the list to match it — no code change needed.

| Level | Content | Example tasks |
|---|---|---|
| PH-01 | Review: s a t p i n m d | Hear sound → tap letter |
| PH-02 | Review: g o c k ck e u r | Hear sound → tap letter |
| PH-03 | Review: h b f ff l ll ss | Hear sound → tap letter |
| PH-04 | Blend CVC words with above | Read *pin, dog, huff* → parent ✓ |
| PH-05 | j v w x y z zz qu | Sound + word |
| PH-06 | Digraphs: ch sh th ng nk | *ship, thin, sing* |
| PH-07 | Vowel digraphs: ai ee igh oa oo(long) oo(short) | *rain, feet, night* |
| PH-08 | ar or ur ow oi ear air er | *car, fork, coin* |
| PH-09 | Adjacent consonants (CVCC / CCVC) | *frog, tent, stamp* |
| PH-10 | Alien words (pseudo-words) set 1 | *vap, shom, quib* |
| PH-11 | ay ou ie ea oy ir ue aw | *play, out, pie* |
| PH-12 | wh ph ew oe au ey | *when, phone, blew* |
| PH-13 | Split digraphs: a-e e-e i-e o-e u-e | *cake, these, bike* |
| PH-14 | Alternative spellings/pronunciations | *ow* in *snow* vs *cow* |
| PH-15 | Alien words set 2 (all GPCs) | *strom, blaim, zike* |
| PH-16 | **PSC rehearsal** (exact format) | 40 words: 20 real + 20 alien, parent marks |

Audio note: text-to-speech is poor at pure phonics sounds ("sss" not "suh"). Plan is to **record the ~44 sounds once** (DQ, 15 minutes on a phone) and use TTS only for whole words.

### HW · Handwriting (Shirwa) — Apple Pencil
Lowercase letter formation, plain print (no lead-ins), taught in the usual letter families:

| Level | Family | Letters |
|---|---|---|
| HW-01 | Long ladder | l i t u j y |
| HW-02 | Curly caterpillar | c a d o q g e s f |
| HW-03 | One-armed robot | r n m h b p k |
| HW-04 | Zig-zag | v w x z |

Each letter goes through 3 stages — **trace** (thick guide, start dot, arrow) → **trace faint** (thin guide, start dot) → **write alone** (lines + start dot only). **3 correct in a row** moves to the next stage; after stage 3 the letter is learned. The app checks the start point, direction, stroke order and that the letter is finished — not just the final shape — so a backwards *c* or a missing dot on *i* is caught. Sessions are 8 tries.

### Placement starting guesses (placement test will confirm)
| Child | Strand | Expected start |
|---|---|---|
| Yaqub (Y4) | TT | Placement from TT-06 |
| Yonis (Y3) | TT | Placement from TT-01 |
| Shirwa (Y1) | PH | Placement from PH-01 |

---

## 3. Release 2 — rest of maths

### NP · Number & place value
| Level | Skill | Year |
|---|---|---|
| NP-01 | Count, read and write numbers to 20 | Y1 |
| NP-02 | One more / one less to 100 | Y1 |
| NP-03 | Count in 2s, 5s, 10s | Y1 |
| NP-04 | Tens and ones to 100; compare with < > = | Y2 |
| NP-05 | Count in 3s, 4s, 8s, 50s, 100s | Y3 |
| NP-06 | Hundreds, tens, ones to 1,000; compare & order | Y3 |
| NP-07 | Thousands to 10,000; 1,000 more/less | Y4 |
| NP-08 | Round to nearest 10, 100, 1,000 | Y4 |
| NP-09 | Negative numbers; Roman numerals to 100 | Y4 |

### AS · Addition & subtraction
| Level | Skill | Year |
|---|---|---|
| AS-01 | Number bonds to 10 | Y1 |
| AS-02 | Number bonds to 20; add/subtract within 20 | Y1 |
| AS-03 | Missing number problems (7 = ? − 9) | Y1 |
| AS-04 | Add/subtract 2-digit and 1-digit | Y2 |
| AS-05 | Add/subtract two 2-digit numbers; bonds to 100 | Y2 |
| AS-06 | Mental: 3-digit ± ones, tens, hundreds | Y3 |
| AS-07 | Column addition & subtraction, 3 digits | Y3 |
| AS-08 | Column methods, 4 digits | Y4 |
| AS-09 | Estimate and check with inverse | Y3–Y4 |

### FR · Fractions
| Level | Skill | Year |
|---|---|---|
| FR-01 | Recognise ½ and ¼ of shapes and quantities | Y1 |
| FR-02 | ⅓, ¼, ²⁄₄, ¾; find fractions of amounts | Y2 |
| FR-03 | Tenths; unit and non-unit fractions | Y3 |
| FR-04 | Equivalent fractions (visual) | Y3 |
| FR-05 | Add/subtract same denominator; compare | Y3 |
| FR-06 | Hundredths; fractions ↔ decimals (tenths, hundredths) | Y4 |

### MT · Money, time & measures
| Level | Skill | Year |
|---|---|---|
| MT-01 | Recognise coins and notes | Y1 |
| MT-02 | Tell time: o'clock, half past | Y1 |
| MT-03 | Quarter past/to; 5-minute intervals | Y2 |
| MT-04 | Combine coins; find change | Y2 |
| MT-05 | Time to the minute; am/pm; 24-hour | Y3–Y4 |
| MT-06 | Length, mass, capacity: read scales | Y2–Y3 |
| MT-07 | Perimeter; convert units | Y3–Y4 |

---

## 4. Release 3 — rest of English

### SP · Spelling
| Level | Content | Year |
|---|---|---|
| SP-01 | Year 1 common exception words (e.g. *the, said, was*) | Y1 |
| SP-02 | -s / -es plurals; -ing, -ed, -er | Y1 |
| SP-03 | Year 2 common exception words | Y2 |
| SP-04 | -ly, -ment, -ness, -ful, -less; contractions | Y2 |
| SP-05 | Y3/4 statutory word list, part 1 (50 words) | Y3 |
| SP-06 | Prefixes: un-, dis-, mis-, re-, in-, il-, im-, ir- | Y3–Y4 |
| SP-07 | Suffixes: -ation, -ous, -sion/-tion/-cian | Y3–Y4 |
| SP-08 | Homophones (*their/there, whose/who's*) | Y3–Y4 |
| SP-09 | Y3/4 statutory word list, part 2 (50 words) | Y4 |

Word lists come from the National Curriculum English Appendix 1 (public, Crown copyright, Open Government Licence).

### GP · Grammar & punctuation
| Level | Skill | Year |
|---|---|---|
| GP-01 | Capital letters, full stops, finger spaces | Y1 |
| GP-02 | Question marks, exclamation marks; *and* | Y1 |
| GP-03 | Nouns, verbs, adjectives | Y2 |
| GP-04 | Conjunctions: *or, but, when, if, that, because* | Y2 |
| GP-05 | Past/present tense; apostrophes for contraction | Y2 |
| GP-06 | Commas in lists; apostrophe for possession (singular) | Y2 |
| GP-07 | *a* vs *an*; word families; prefixes | Y3 |
| GP-08 | Inverted commas (speech marks) | Y3 |
| GP-09 | Present perfect; conjunctions/adverbs for time and cause | Y3 |
| GP-10 | Fronted adverbials + comma; noun phrases | Y4 |
| GP-11 | Plural possession (*the girls' coats*); pronouns vs nouns | Y4 |
| GP-12 | Standard English (*we were*, not *we was*) | Y4 |

### RC · Reading comprehension
Passages are **AI-drafted, parent-approved** in the admin panel before a child sees them.

| Level | Passage | Question focus | Year |
|---|---|---|---|
| RC-01 | 3–5 decodable sentences | Who / what / where (retrieval) | Y1 |
| RC-02 | 60–100 words, simple story | Retrieval + sequencing | Y1–Y2 |
| RC-03 | 100–150 words, story or fact | Vocabulary in context | Y2 |
| RC-04 | 150–200 words | Simple inference (*how does she feel?*) | Y2 |
| RC-05 | 200–300 words, fiction + non-fiction | Retrieval, inference, prediction | Y3 |
| RC-06 | 300–400 words | Summarise; author's word choice | Y4 |

Each passage stores: reading band, word count, theme, questions + answer key, approval status, approved-by, date.

---

## 5. Data model (sketch)

```
strand(code, subject, name)
level(id, strand, order, title, year, question_type, generator, set_size,
      accuracy_target, time_target_s, sets_to_pass)
child(id, name, school_year, avatar, pin_hash)
placement(child_id, strand, start_level, date)
progress(child_id, level_id, status[locked|active|passed], passed_at)
attempt(id, child_id, level_id, started_at, finished_at, correct, total, duration_s)
answer(attempt_id, question_json, given, correct, time_ms)
passage(id, level_id, text, questions_json, status[draft|approved|rejected])
settings(key, value)   -- mastery thresholds, phonics order, daily goals
```

---

## 6. Open questions for DQ
1. **Shirwa's phonics scheme** — ask school or check the reading-book cover (Little Wandle / Read Write Inc. / other). Until then we use the default order above.
2. **Record the phonics sounds** — ~15 minutes, when we reach PH audio.
3. Mastery thresholds (90%, 2 sets) — happy to start there and tune after 2 weeks?
