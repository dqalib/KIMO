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
}
