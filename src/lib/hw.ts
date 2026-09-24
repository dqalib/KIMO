import { LETTERS, type Letter } from "./letters";
import { letterProgress, type AppState } from "./store";

/** The letter a child should practise now: the first one not yet mastered. */
export function currentLetter(s: AppState, childId: string): Letter | undefined {
  return LETTERS.find((l) => letterProgress(s, childId, l.char).stage < 4);
}

/** How many letters a child has mastered. */
export function lettersMastered(s: AppState, childId: string): number {
  return LETTERS.filter((l) => letterProgress(s, childId, l.char).stage === 4).length;
}
