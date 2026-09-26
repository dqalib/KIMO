// Everything the app can say, collected in one place so scripts/make-audio.ts
// can pre-make a professional recording of each. When a screen starts speaking
// something new, add it here too (the test checks the main ones are covered).

import { GP_LEVELS, gpQuestions, spokenGp } from "./grammar";
import { PH_LEVELS, levelWords } from "./phonics";
import { PASSAGES, spokenPassage } from "./reading";
import { SP_LEVELS, spLevelWords, spokenPrompt } from "./spelling";

export interface Phrase {
  text: string;
  /** Where it's used — for the script's summary only. */
  source: "phonics" | "spelling" | "grammar" | "reading";
}

export function allPhrases(): Phrase[] {
  const out: Phrase[] = [];
  // Phonics: whole real words ("hear it" and "missing sound" questions). Alien
  // words are never spoken — the child reads those to a grown-up.
  for (const l of PH_LEVELS) for (const w of levelWords(l.id)) if (w.real) out.push({ text: w.word, source: "phonics" });
  // Spelling: "word. sentence. word." plus the word alone (look-cover-write-check).
  for (const l of SP_LEVELS)
    for (const w of spLevelWords(l.id)) {
      out.push({ text: spokenPrompt(w), source: "spelling" });
      out.push({ text: w.word, source: "spelling" });
    }
  // Grammar: question + sentence (gap read as "blank").
  for (const l of GP_LEVELS) for (const q of gpQuestions(l.id)) out.push({ text: spokenGp(q), source: "grammar" });
  // Reading: the whole story, and each question.
  for (const p of PASSAGES) {
    out.push({ text: spokenPassage(p), source: "reading" });
    for (const q of p.questions) out.push({ text: q.prompt, source: "reading" });
  }
  return out;
}
