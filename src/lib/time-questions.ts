// Turns telling-the-time questions into the numbers screen's shape. Clocks travel
// inside the text as [[clock:h:mm]] tokens, drawn by src/components/FractionText.tsx.

import type { NumberQuestion } from "../components/NumberPractice";
import type { TimeQuestion } from "./mt-time";

const clockToken = (hm: string) => `[[clock:${hm}]]`;

export function timeToNumberQuestion(q: TimeQuestion): NumberQuestion {
  const prompt = q.clock ? `${q.prompt} ${clockToken(`${q.clock.hours}:${q.clock.minutes}`)}` : q.prompt;
  if (q.key.startsWith("which:") && q.options) {
    // "Which clock shows…?" — each answer button is a clock
    return { key: q.key, prompt, answer: clockToken(String(q.answer)), options: q.options.map(clockToken) };
  }
  return { key: q.key, prompt, answer: q.answer, options: q.options };
}

/** The question without its pictures (for the tricky list). */
export const withoutPictures = (text: string) => text.replace(/\s*\[\[[^\]]+\]\]/g, "");
