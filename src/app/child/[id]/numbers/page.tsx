"use client";

// Number & place value practice (NP levels) — same screen as times tables.

import { useParams, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import NumberPractice, { type NumberQuestion } from "@/components/NumberPractice";
import { generateNPSet, getNPLevel, nextNPLevel, prevNPLevel } from "@/lib/np";
import type { SetResult } from "@/lib/mastery";
import { getInputMode, recordStrandSet, strandProgress, strandTricky, useAppState } from "@/lib/store";

export default function NumbersPage() {
  const { id } = useParams<{ id: string }>();
  const exam = useSearchParams().get("exam") === "1";
  const state = useAppState();
  const level = state ? getNPLevel(strandProgress(state, "np", id).current) : undefined;
  const tricky = state ? strandTricky(state, "np", id) : undefined;

  const makeQuestions = useCallback(
    (): NumberQuestion[] => (level ? generateNPSet(level, tricky ?? {}).map((q) => ({ key: q.key, prompt: q.text, answer: q.answer, options: q.options })) : []),
    [level, tricky],
  );
  const record = useCallback(
    (r: SetResult, wrong: NumberQuestion[]) =>
      recordStrandSet("np", id, level!.id, r, wrong.map((w) => w.key), nextNPLevel(level!.id)?.id, prevNPLevel(level!.id)?.id, wrong.map((w) => w.prompt)),
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
      nextTitle={nextNPLevel(level.id)?.title}
      prevTitle={prevNPLevel(level.id)?.title}
      allDoneText="You've finished every numbers level. Amazing!"
      exam={exam}
      againHref={`/child/${child.id}/numbers`}
    />
  );
}
