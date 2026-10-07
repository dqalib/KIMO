"use client";

// Fractions practice (FR levels) — fractions are drawn stacked (3 over 4) — same screen as numbers.

import { useParams, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import FractionText from "@/components/FractionText";
import NumberPractice, { type NumberQuestion } from "@/components/NumberPractice";
import { generateFRSet, getFRLevel, nextFRLevel, prevFRLevel } from "@/lib/fr";
import type { SetResult } from "@/lib/mastery";
import { getInputMode, recordStrandSet, strandProgress, strandTricky, useAppState } from "@/lib/store";

export default function FractionsPage() {
  const { id } = useParams<{ id: string }>();
  const exam = useSearchParams().get("exam") === "1";
  const state = useAppState();
  const level = state ? getFRLevel(strandProgress(state, "fr", id).current) : undefined;
  const tricky = state ? strandTricky(state, "fr", id) : undefined;

  const makeQuestions = useCallback(
    (): NumberQuestion[] => (level ? generateFRSet(level, tricky ?? {}).map((q) => ({ key: q.key, prompt: q.text, answer: q.answer, options: q.options })) : []),
    [level, tricky],
  );
  const record = useCallback(
    (r: SetResult, wrong: NumberQuestion[]) =>
      recordStrandSet("fr", id, level!.id, r, wrong.map((w) => w.key), nextFRLevel(level!.id)?.id, prevFRLevel(level!.id)?.id, wrong.map((w) => w.prompt)),
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
      nextTitle={nextFRLevel(level.id)?.title}
      prevTitle={prevFRLevel(level.id)?.title}
      allDoneText="You've finished every fractions level. Amazing!"
      exam={exam}
      againHref={`/child/${child.id}/fractions`}
      renderText={(text) => <FractionText text={text} />}
    />
  );
}
