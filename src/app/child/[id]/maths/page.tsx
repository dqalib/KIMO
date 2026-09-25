"use client";

// Addition & subtraction practice (AS levels) — same screen as times tables.

import { useParams } from "next/navigation";
import { useCallback } from "react";
import NumberPractice, { type NumberQuestion } from "@/components/NumberPractice";
import { generateASSet, getASLevel, nextASLevel, prevASLevel } from "@/lib/as";
import type { SetResult } from "@/lib/mastery";
import { getInputMode, recordStrandSet, strandProgress, strandTricky, useAppState } from "@/lib/store";

export default function MathsPage() {
  const { id } = useParams<{ id: string }>();
  const state = useAppState();
  const level = state ? getASLevel(strandProgress(state, "as", id).current) : undefined;
  const tricky = state ? strandTricky(state, "as", id) : undefined;

  const makeQuestions = useCallback(
    (): NumberQuestion[] => (level ? generateASSet(level, tricky ?? {}).map((q) => ({ key: q.key, prompt: q.text, answer: q.answer })) : []),
    [level, tricky],
  );
  const record = useCallback(
    (r: SetResult, wrong: NumberQuestion[]) =>
      recordStrandSet("as", id, level!.id, r, wrong.map((w) => w.key), nextASLevel(level!.id)?.id, prevASLevel(level!.id)?.id, wrong.map((w) => w.prompt)),
    [id, level],
  );

  if (!state) return null;
  const child = state.children.find((c) => c.id === id);
  if (!child || !level) return null;
  return (
    <NumberPractice
      child={child}
      level={level}
      makeQuestions={makeQuestions}
      initialMode={getInputMode(state, id)}
      record={record}
      nextTitle={nextASLevel(level.id)?.title}
      prevTitle={prevASLevel(level.id)?.title}
      allDoneText="You've finished every adding and taking away level. Amazing!"
      againHref={`/child/${child.id}/maths`}
    />
  );
}
