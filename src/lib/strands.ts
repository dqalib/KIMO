// The level-based strands shown as cards on a child's home page and as
// level pickers on the parent page. Times tables and handwriting have their own.

import { AS_LEVELS } from "./as";
import { CW_LEVELS } from "./coding";
import { FR_LEVELS } from "./fr";
import { GP_LEVELS } from "./grammar";
import { MT_TIME_LEVELS } from "./mt-time";
import { NP_LEVELS } from "./np";
import { PH_LEVELS } from "./phonics";
import { RC_LEVELS } from "./reading";
import { SP_LEVELS } from "./spelling";
import type { Strand } from "./store";

export interface StrandInfo {
  key: Strand;
  name: string;
  /** Page under /child/[id]/ */
  path: string;
  icon: string;
  button: string;
  levels: { id: string; title: string; grownUp?: boolean }[];
  /** Shown without the parent turning it on (by school year). */
  shownFor: (schoolYear: number) => boolean;
  /** Shown to the parent when the strand is hidden by default. */
  hiddenNote: string;
  /** Has an exam (no answers shown; passing moves up a level). Phonics and reading are marked differently. */
  exam?: boolean;
}

export const STRANDS: StrandInfo[] = [
  {
    key: "ph",
    name: "Phonics",
    path: "phonics",
    icon: "🔊",
    button: "Read ▶",
    levels: PH_LEVELS,
    shownFor: (y) => y <= 2,
    hiddenNote: "for Years 1–2",
  },
  {
    key: "as",
    name: "Adding & taking away",
    path: "maths",
    icon: "➕",
    button: "Start ▶",
    levels: AS_LEVELS,
    shownFor: (y) => y <= 2,
    hiddenNote: "for Years 1–2",
    exam: true,
  },
  {
    key: "np",
    name: "Numbers",
    path: "numbers",
    icon: "🔢",
    button: "Start ▶",
    levels: NP_LEVELS,
    shownFor: () => true,
    hiddenNote: "",
    exam: true,
  },
  {
    key: "fr",
    name: "Fractions",
    path: "fractions",
    icon: "½",
    button: "Start ▶",
    levels: FR_LEVELS,
    shownFor: () => true,
    hiddenNote: "",
    exam: true,
  },
  {
    key: "mt",
    name: "Telling the time",
    path: "time",
    icon: "🕒",
    button: "Start ▶",
    levels: MT_TIME_LEVELS,
    shownFor: () => true,
    hiddenNote: "",
    exam: true,
  },
  {
    key: "sp",
    name: "Spelling",
    path: "spelling",
    icon: "Aa",
    button: "Spell ▶",
    levels: SP_LEVELS,
    // Years 1–5: Year 1 starts with the Year 1 tricky words.
    shownFor: () => true,
    hiddenNote: "",
    exam: true,
  },
  {
    key: "gp",
    name: "Grammar",
    path: "grammar",
    icon: "✏️",
    button: "Start ▶",
    levels: GP_LEVELS,
    shownFor: (y) => y >= 2,
    hiddenNote: "starts in Year 2",
    exam: true,
  },
  {
    key: "cw",
    name: "Coding words",
    path: "coding",
    icon: "💻",
    button: "Learn ▶",
    levels: CW_LEVELS,
    shownFor: () => true,
    hiddenNote: "",
    exam: true,
  },
  {
    key: "rc",
    name: "Reading",
    path: "reading",
    icon: "📚",
    button: "Read ▶",
    levels: RC_LEVELS,
    // Shown to everyone — but a child only sees the card once a grown-up has approved stories for their level.
    shownFor: () => true,
    hiddenNote: "",
  },
];
