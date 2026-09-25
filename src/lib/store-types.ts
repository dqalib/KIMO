import type { LevelProgress, Outcome } from "./mastery";

export interface Child {
  id: string;
  name: string;
  schoolYear: number;
  avatar: string;
  color: string;
}

export interface Attempt {
  id: string;
  childId: string;
  levelId: string;
  finishedAt: string;
  total: number;
  correctFirstTime: number;
  durationMs: number;
  secondsPerQuestion: number;
  outcome: Outcome;
  wrong: string[]; // prompts answered wrong first time
}

/** Handwriting progress for one letter. stage 1 = trace, 2 = trace faint guide, 3 = write alone, 4 = mastered. */
export interface LetterProgress {
  stage: 1 | 2 | 3 | 4;
  streak: number; // correct in a row at this stage
}

export type InputMode = "keypad" | "pencil";

export interface AppState {
  version: 1;
  parentPinHash?: string;
  pinUpdatedAt?: string;
  children: Child[];
  tt: Record<string, LevelProgress>; // by child id
  progressUpdatedAt?: Record<string, string>; // child id -> ISO time progress last changed
  weakFacts: Record<string, Record<string, number>>; // child id -> fact key -> count
  attempts: Attempt[];
  deletedChildren?: string[]; // ids removed on any device, so removal syncs
  hw?: Record<string, Record<string, LetterProgress>>; // child id -> letter -> progress
  inputMode?: Record<string, { mode: InputMode; at: string }>; // child id -> how they answer maths
  ph?: Record<string, LevelProgress>; // phonics progress by child id
  phUpdatedAt?: Record<string, string>;
  phTricky?: Record<string, Record<string, number>>; // child id -> word -> times wrong
  sp?: Record<string, LevelProgress>; // spelling progress by child id
  spUpdatedAt?: Record<string, string>;
  spTricky?: Record<string, Record<string, number>>; // child id -> word -> times wrong
  gp?: Record<string, LevelProgress>; // grammar & punctuation progress by child id
  gpUpdatedAt?: Record<string, string>;
  gpTricky?: Record<string, Record<string, number>>; // child id -> question id -> times wrong
  as?: Record<string, LevelProgress>; // addition & subtraction progress by child id
  asUpdatedAt?: Record<string, string>;
  asTricky?: Record<string, Record<string, number>>; // child id -> fact key -> times wrong
}
