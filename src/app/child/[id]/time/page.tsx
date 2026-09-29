"use client";

// Telling the time (MT-02, MT-03, MT-05) — the numbers screen, with clocks drawn in the
// question ("What time does the clock show?") or as the answers ("Which clock shows…?").

import { useParams } from "next/navigation";
import { useCallback } from "react";
import FractionText from "@/components/FractionText";
import NumberPractice, { type NumberQuestion } from "@/components/NumberPractice";
import type { SetResult } from "@/lib/mastery";
import { generateTimeSet, getMTTimeLevel, nextMTTimeLevel, prevMTTimeLevel } from "@/lib/mt-time";
import { timeToNumberQuestion, withoutPictures } from "@/lib/time-questions";
import { getInputMode, recordStrandSet, strandProgress, strandTricky, useAppState } from "@/lib/store";

export default function TimePage() {
  const { id } = useParams<{ id: string }>();
  const state = useAppState();
  const level = state ? getMTTimeLevel(strandProgress(state, "mt", id).current) : undefined;
  const tricky = state ? strandTricky(state, "mt", id) : undefined;

  const makeQuestions = useCallback(
    (): NumberQuestion[] => (level ? generateTimeSet(level.id, tricky ?? {}).map(timeToNumberQuestion) : []),
    [level, tricky],
  );
  const record = useCallback(
    (r: SetResult, wrong: NumberQuestion[]) =>
      recordStrandSet("mt", id, level!.id, r, wrong.map((w) => w.key), nextMTTimeLevel(level!.id)?.id, prevMTTimeLevel(level!.id)?.id, wrong.map((w) => withoutPictures(w.prompt))),
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
      nextTitle={nextMTTimeLevel(level.id)?.title}
      prevTitle={prevMTTimeLevel(level.id)?.title}
      allDoneText="You've finished every telling-the-time level. Brilliant!"
      againHref={`/child/${child.id}/time`}
      renderText={(text) => <FractionText text={text} />}
    />
  );
}
