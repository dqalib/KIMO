// The level-based strands shown as cards on a child's home page and as
// level pickers on the parent page. Times tables and handwriting have their own.

import { AS_LEVELS } from "./as";
import { GP_LEVELS } from "./grammar";
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
  },
  {
    key: "sp",
    name: "Spelling",
    path: "spelling",
    icon: "Aa",
    button: "Spell ▶",
    levels: SP_LEVELS,
    shownFor: (y) => y >= 2,
    hiddenNote: "starts in Year 2",
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
