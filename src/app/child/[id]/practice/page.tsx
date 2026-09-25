"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import NumberPractice, { type NumberQuestion } from "@/components/NumberPractice";
import type { SetResult } from "@/lib/mastery";
import { getInputMode, recordSet, useAppState, type InputMode } from "@/lib/store";
import { generateSet, getLevel, nextLevel, prevLevel } from "@/lib/tt";

export default function PracticePage() {
  const { id } = useParams<{ id: string }>();
  const state = useAppState();
  const progress = state?.tt[id];
  const level = progress && getLevel(progress.current);
  const weak = state?.weakFacts[id];

  const makeQuestions = useCallback(() => (level ? generateSet(level, weak ?? {}) : []), [level, weak]);
  const record = useCallback(
    (r: SetResult, wrong: NumberQuestion[]) => recordSet(id, level!.id, r, wrong.map((w) => ({ prompt: w.prompt, key: w.key }))),
    [id, level],
  );

  if (!state) return null;
  const child = state.children.find((c) => c.id === id);
  if (!child || !level) return null;
  // The Tables Check rehearsal is always typed, like the real check.
  const mode: InputMode = level.hardLimit ? "keypad" : getInputMode(state, id);
  return (
    <NumberPractice
      child={child}
      level={level}
      makeQuestions={makeQuestions}
      initialMode={mode}
      record={record}
      nextTitle={nextLevel(level.id)?.title}
      prevTitle={prevLevel(level.id)?.title}
      allDoneText="You've finished every times tables level. Amazing!"
      againHref={`/child/${child.id}/practice`}
    />
  );
}
