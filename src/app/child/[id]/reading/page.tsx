"use client";

// Reading comprehension (RC levels): one approved passage per set, then its
// questions (tap the answer). The passage stays on screen for every question,
// and can be read aloud. Wrong answers come back once at the end.

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import ChoiceGrid from "@/components/ChoiceGrid";
import SpeakButton from "@/components/SpeakButton";
import { accuracy, type Outcome, type SetResult } from "@/lib/mastery";
import { getRcLevel, nextRcLevel, pickPassage, prevRcLevel, spokenPassage, type Passage, type RcLevel, type Reviews } from "@/lib/reading";
import { passageReadCounts, recordStrandSet, strandProgress, useAppState, type Child } from "@/lib/store";

export default function ReadingPage() {
  const { id } = useParams<{ id: string }>();
  const state = useAppState();
  if (!state) return null;
  const child = state.children.find((c) => c.id === id);
  const level = getRcLevel(strandProgress(state, "rc", id).current);
  if (!child || !level) return null;
  return <Chooser child={child} level={level} reviews={state.rcReview ?? {}} readCounts={passageReadCounts(state, id)} />;
}

/** Picks the passage once per visit, so saving progress doesn't swap the story mid-way. */
function Chooser({ child, level, reviews, readCounts }: { child: Child; level: RcLevel; reviews: Reviews; readCounts: Record<string, number> }) {
  const [passage] = useState(() => pickPassage(level.id, reviews, readCounts));
  if (!passage) return <NoStories child={child} />;
  return <Session child={child} level={level} passage={passage} />;
}

type Phase = "read" | "questions" | "fix" | "done";

function Session({ child, level, passage }: { child: Child; level: RcLevel; passage: Passage }) {
  const questions = passage.questions;
  const [phase, setPhase] = useState<Phase>("read");
  const [i, setI] = useState(0);
  const [fix, setFix] = useState<number[]>([]);
  const [shown, setShown] = useState<{ chosen: number; correct: number } | null>(null);
  const [result, setResult] = useState<{ r: SetResult; outcome: Outcome } | null>(null);
  const correct = useRef(0);
  const wrong = useRef<number[]>([]);
  const startedAt = useRef(0);

  const order = phase === "fix" ? fix : questions.map((_, k) => k);
  const q = questions[order[i]];

  const finish = useCallback(() => {
    const r: SetResult = {
      total: questions.length,
      correctFirstTime: correct.current,
      durationMs: Date.now() - startedAt.current,
      secondsPerQuestion: 0,
      accuracyTarget: level.accuracyTarget,
    };
    const passed = accuracy(r) >= level.accuracyTarget;
    const outcome = recordStrandSet(
      "rc",
      child.id,
      level.id,
      r,
      passed ? [] : [passage.id],
      nextRcLevel(level.id)?.id,
      prevRcLevel(level.id)?.id,
      wrong.current.map((k) => questions[k].prompt),
      passage.id,
    );
    setResult({ r, outcome });
    setPhase("done");
  }, [child.id, level, passage.id, questions]);

  const advance = useCallback(() => {
    setShown(null);
    if (i + 1 < order.length) {
      setI(i + 1);
      return;
    }
    if (phase === "questions" && wrong.current.length) {
      setFix(wrong.current.slice());
      setI(0);
      setPhase("fix");
      return;
    }
    finish();
  }, [i, order.length, phase, finish]);

  const choose = useCallback(
    (k: number) => {
      if (shown || !q) return;
      const ok = k === q.answer;
      if (phase === "questions") {
        if (ok) correct.current++;
        else wrong.current.push(order[i]);
      }
      setShown({ chosen: k, correct: q.answer });
      setTimeout(ok ? advance : () => (phase === "fix" ? setShown(null) : advance()), ok ? 800 : 1800);
    },
    [shown, q, phase, order, i, advance],
  );

  if (phase === "done" && result) return <Result child={child} level={level} passage={passage} {...result} />;

  return (
    <main className="flex-1 flex flex-col gap-5 p-4 sm:p-6 max-w-4xl mx-auto w-full">
      <header className="w-full flex items-center gap-3">
        <Link href={`/child/${child.id}`} className="text-muted font-bold" aria-label="Stop">
          ✕
        </Link>
        <p className="font-bold text-muted">
          {level.id} · Reading{phase !== "read" && ` · question ${i + 1} of ${order.length}`}
        </p>
      </header>

      <article className="rounded-3xl bg-card border-2 border-line p-5 sm:p-7 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl sm:text-4xl font-black flex-1">{passage.title}</h1>
          <SpeakButton text={spokenPassage(passage)} label="Read to me" />
        </div>
        <div className={`flex flex-col gap-3 font-semibold leading-relaxed ${passage.wordCount < 120 ? "text-3xl" : "text-2xl"}`}>
          {passage.text.split(/\n\n+/).map((para, k) => (
            <p key={k}>{para}</p>
          ))}
        </div>
      </article>

      {phase === "read" ? (
        <button
          onClick={() => {
            startedAt.current = Date.now();
            setPhase("questions");
          }}
          className="self-center h-20 px-14 rounded-3xl text-white text-3xl font-black shadow-[0_6px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none"
          style={{ background: child.color }}
        >
          I&apos;ve read it ▶
        </button>
      ) : (
        q && (
          <section key={`${phase}-${i}`} className="flex flex-col items-center gap-4 animate-pop">
            {phase === "fix" && <p className="text-xl font-extrabold text-warn">Look back at the story and try again ✏️</p>}
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-center">{q.prompt}</h2>
              <SpeakButton text={q.prompt} label="" />
            </div>
            <ChoiceGrid options={q.options} stack={q.options.some((o) => o.length > 18)} result={shown ?? undefined} onChoose={(_, k) => choose(k)} />
          </section>
        )
      )}
    </main>
  );
}

function NoStories({ child }: { child: Child }) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center">
      <span className="text-7xl">📚</span>
      <h1 className="text-4xl font-black">No stories ready yet</h1>
      <p className="text-xl font-semibold text-muted max-w-md">A grown-up needs to check some new stories first.</p>
      <Link href={`/child/${child.id}`} className="h-16 px-8 rounded-2xl bg-card border-2 border-line text-xl font-extrabold flex items-center">
        Back
      </Link>
    </main>
  );
}

function Result({ child, level, passage, r, outcome }: { child: Child; level: RcLevel; passage: Passage; r: SetResult; outcome: Outcome }) {
  const pct = Math.round(accuracy(r) * 100);
  const next = nextRcLevel(level.id);
  const head = {
    levelPassed: { e: "🏆", t: "Level passed!", s: next ? `Next up: ${next.title}` : "You've finished every reading level!" },
    setPassed: { e: "⭐", t: "Super reading!", s: "One more story like that and you pass this level." },
    setFailed: { e: "💪", t: "Good try!", s: "Reading carefully takes practice — you'll get there." },
    droppedBack: { e: "🔁", t: "Let's warm up", s: "We'll read some easier stories, then come back stronger." },
  }[outcome];

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center animate-pop">
      <span className="text-8xl">{head.e}</span>
      <h1 className="text-5xl font-black">{head.t}</h1>
      <p className="text-xl font-semibold text-muted max-w-md">{head.s}</p>
      <div className={`rounded-2xl bg-card border-4 px-6 py-4 ${pct >= level.accuracyTarget * 100 ? "border-good" : "border-warn"}`}>
        <p className="text-4xl font-black tabular-nums">
          {r.correctFirstTime}/{r.total}
        </p>
        <p className="font-bold text-muted">right first time · {passage.title}</p>
      </div>
      <div className="flex gap-4 mt-2">
        <Link href={`/child/${child.id}`} className="h-16 px-8 rounded-2xl bg-card border-2 border-line text-xl font-extrabold flex items-center">
          Finish
        </Link>
        <a href={`/child/${child.id}/reading`} className="h-16 px-8 rounded-2xl text-white text-xl font-extrabold flex items-center" style={{ background: child.color }}>
          Another story ▶
        </a>
      </div>
    </main>
  );
}
