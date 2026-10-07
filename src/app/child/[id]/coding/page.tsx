"use client";

// Coding words (CW levels): learn new computing words on picture cards, then
// tap the right answer. Right/wrong shows straight away (with a sound); a wrong
// answer shows what the word means. Words come back on later days
// ("Do you still remember?") until they're remembered well.

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import ChoiceGrid from "@/components/ChoiceGrid";
import SetResultScreen from "@/components/SetResultScreen";
import SpeakButton from "@/components/SpeakButton";
import { cwLevelTerms, generateCwSet, getCwLevel, getTerm, nextCwLevel, prevCwLevel, spokenTerm, type CwLevel, type CwQuestion, type CwTerm } from "@/lib/coding";
import type { Outcome, SetResult } from "@/lib/mastery";
import { dueKeys } from "@/lib/memory";
import { speak } from "@/lib/speech";
import { childMemory, recordMemory, recordStrandSet, strandProgress, strandTricky, useAppState, type Child } from "@/lib/store";

export default function CodingPage() {
  const { id } = useParams<{ id: string }>();
  const exam = useSearchParams().get("exam") === "1";
  const state = useAppState();
  if (!state) return null;
  const child = state.children.find((c) => c.id === id);
  const level = getCwLevel(strandProgress(state, "cw", id).current);
  if (!child || !level) return null;
  const mem = childMemory(state, id);
  const seen = new Set(
    Object.keys(mem)
      .filter((k) => k.startsWith("cw:"))
      .map((k) => k.slice(3)),
  );
  // Exam: every word in the level, no learn cards and no earlier-day review words.
  if (exam) return <Session child={child} level={level} seen={new Set(cwLevelTerms(level.id).map((t) => t.id))} due={[]} tricky={{}} exam />;
  return <Session child={child} level={level} seen={seen} due={dueKeys(mem, "cw:")} tricky={strandTricky(state, "cw", id)} exam={false} />;
}

type Phase = "ready" | "learn" | "main" | "fix" | "done";

/** Fresh option order for the fix round, so it isn't answered by position. */
function reshuffle(q: CwQuestion): CwQuestion {
  const order = q.options.map((_, i) => i).sort(() => Math.random() - 0.5);
  return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
}

function Session({
  child,
  level,
  seen,
  due,
  tricky,
  exam,
}: {
  child: Child;
  level: CwLevel;
  seen: Set<string>;
  due: string[];
  tricky: Record<string, number>;
  exam: boolean;
}) {
  const [set] = useState(() => generateCwSet(level, seen, due, tricky));
  const reviewCount = set.questions.filter((q) => q.review).length;
  const [phase, setPhase] = useState<Phase>("ready");
  const [card, setCard] = useState(0);
  const [i, setI] = useState(0);
  const [fix, setFix] = useState<CwQuestion[]>([]);
  const [shown, setShown] = useState<{ chosen: number; correct: number } | null>(null);
  const [result, setResult] = useState<{ r: SetResult; outcome: Outcome; remembered: number } | null>(null);
  const correct = useRef(0);
  const remembered = useRef(0);
  const wrong = useRef<CwQuestion[]>([]);
  const termOk = useRef(new Map<string, boolean>());
  const missed = useRef<{ prompt: string; given: string; answer: string }[]>([]);
  const sending = useRef(false);
  const startedAt = useRef(0);

  const list = phase === "fix" ? fix : set.questions;
  const q = list[i];

  const finish = useCallback(() => {
    const main = set.questions.filter((x) => !x.review);
    const r: SetResult = {
      mode: exam ? "exam" : "practice",
      ...(exam ? { answers: missed.current } : {}),
      total: main.length,
      correctFirstTime: correct.current,
      durationMs: Date.now() - startedAt.current,
      secondsPerQuestion: 0,
      accuracyTarget: level.accuracyTarget,
    };
    // One memory update per word per set: remembered only if every question about it was right.
    recordMemory(
      child.id,
      [...termOk.current].map(([t, ok]) => ({ key: `cw:${t}`, ok })),
    );
    const levelWrong = wrong.current.filter((w) => !w.review);
    const outcome = recordStrandSet(
      "cw",
      child.id,
      level.id,
      r,
      levelWrong.map((w) => w.id),
      nextCwLevel(level.id)?.id,
      prevCwLevel(level.id)?.id,
      levelWrong.map((w) => (w.termId ? getTerm(w.termId)?.term ?? w.id : w.prompt)),
    );
    setResult({ r, outcome, remembered: remembered.current });
    setPhase("done");
  }, [child.id, level, set.questions, exam]);

  const advance = useCallback(() => {
    setShown(null);
    if (i + 1 < list.length) {
      setI(i + 1);
      return;
    }
    if (!exam && phase === "main" && wrong.current.length) {
      setFix(wrong.current.map(reshuffle));
      setI(0);
      setPhase("fix");
      return;
    }
    finish();
  }, [i, list.length, phase, finish, exam]);

  const choose = useCallback(
    (k: number) => {
      if (shown || !q || sending.current) return;
      const ok = k === q.answer;
      if (phase === "main") {
        if (q.termId) termOk.current.set(q.termId, (termOk.current.get(q.termId) ?? true) && ok);
        if (q.review) {
          if (ok) remembered.current++;
        } else if (ok) correct.current++;
        if (!ok) wrong.current.push(q);
      }
      if (exam) {
        // Exam: no marking shown — save it and move on.
        if (!ok) missed.current.push({ prompt: q.prompt, given: q.options[k], answer: q.options[q.answer] });
        sending.current = true;
        setTimeout(() => {
          sending.current = false;
          advance();
        }, 250);
        return;
      }
      setShown({ chosen: k, correct: q.answer });
      if (ok) setTimeout(advance, 900);
    },
    [shown, q, phase, advance, exam],
  );

  function start() {
    startedAt.current = Date.now();
    if (set.learn.length) {
      // Speaking inside the tap unlocks audio on iPad.
      void speak(spokenTerm(set.learn[0]));
      setPhase("learn");
    } else setPhase("main");
  }

  if (phase === "ready") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="text-muted font-bold text-lg">
          {level.id} · Coding words {exam ? "📝 Exam" : "practice"}
        </p>
        <h1 className="text-5xl font-black max-w-2xl">{level.title}</h1>
        <p className="text-xl font-semibold text-muted max-w-md">
          {exam
            ? "This is the exam — no answers until the end. Get 9 out of 10 right to move up a level!"
            : `${set.learn.length ? `${set.learn.length} new word${set.learn.length === 1 ? "" : "s"} to learn, then ` : ""}tap the right answers. Tap 🔊 to hear it.`}
        </p>
        <button
          onClick={start}
          className="h-20 px-16 rounded-3xl text-white text-3xl font-black shadow-[0_6px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none"
          style={{ background: child.color }}
        >
          {exam ? "Start the exam 📝" : "Go! 🚀"}
        </button>
        <Link href={`/child/${child.id}`} className="text-muted underline">
          Not now
        </Link>
      </main>
    );
  }

  if (phase === "learn") {
    const t = set.learn[card];
    return (
      <LearnCard
        key={t.id}
        term={t}
        n={card + 1}
        of={set.learn.length}
        child={child}
        onNext={() => {
          if (card + 1 < set.learn.length) {
            void speak(spokenTerm(set.learn[card + 1]));
            setCard(card + 1);
          } else setPhase("main");
        }}
      />
    );
  }

  if (phase === "done" && result)
    return (
      <SetResultScreen
        child={child}
        r={result.r}
        outcome={result.outcome}
        exam={exam}
        review={{ total: reviewCount, remembered: result.remembered }}
        nextTitle={nextCwLevel(level.id)?.title}
        allDoneText="You know every coding word — you're a computer expert!"
        practiceHref={`/child/${child.id}/coding`}
      />
    );
  if (!q) return null;

  const wrongNow = shown && shown.chosen !== shown.correct;
  const longOptions = q.options.some((o) => o.length > 18);

  return (
    <main className="flex-1 flex flex-col items-center gap-6 p-4 sm:p-6 max-w-3xl mx-auto w-full">
      <header className="w-full flex items-center gap-3">
        <Link href={`/child/${child.id}`} className="text-muted font-bold" aria-label="Stop">
          ✕
        </Link>
        <div className="flex-1 flex gap-1">
          {list.map((_, k) => (
            <span key={k} className="h-3 flex-1 rounded-full" style={{ background: k < i ? child.color : k === i ? `${child.color}88` : "var(--line)" }} />
          ))}
        </div>
        <span className="font-bold text-muted tabular-nums">
          {i + 1}/{list.length}
        </span>
      </header>

      {exam && <p className="px-4 py-1 rounded-full bg-ink text-white text-lg font-extrabold">📝 Exam — answers at the end</p>}
      {phase === "fix" && <p className="text-xl font-extrabold text-warn">Let&apos;s try these again ✏️</p>}
      {phase === "main" && q.review && <p className="px-4 py-2 rounded-full bg-brand/10 text-brand text-xl font-extrabold">🧠 Do you still remember?</p>}

      <div key={`${phase}-${i}`} className="w-full flex items-start gap-4 animate-pop">
        <h1 className="flex-1 text-3xl sm:text-4xl font-black leading-snug">{q.prompt}</h1>
        <SpeakButton text={q.prompt} label="" />
      </div>

      <ChoiceGrid
        key={`${phase}-${i}-grid`}
        options={q.options}
        stack={longOptions}
        result={shown ?? undefined}
        onChoose={(_, k) => choose(k)}
      />

      {shown && !wrongNow && <p className="text-3xl font-black text-good animate-pop">✓ Correct!</p>}
      {wrongNow && (
        <div className="w-full flex flex-col items-center gap-4 animate-pop">
          <p className="text-3xl font-black text-bad">✗ Not quite</p>
          <p className="w-full rounded-2xl bg-card border-2 border-line p-4 text-xl font-semibold">💡 {q.why}</p>
          <button
            onClick={advance}
            className="h-16 px-10 rounded-2xl text-white text-2xl font-extrabold shadow-[0_5px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none"
            style={{ background: child.color }}
          >
            Next ▶
          </button>
        </div>
      )}
    </main>
  );
}

function LearnCard({ term, n, of, child, onNext }: { term: CwTerm; n: number; of: number; child: Child; onNext: () => void }) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center max-w-2xl mx-auto w-full animate-pop">
      <p className="font-bold text-muted text-lg">
        New word {n} of {of}
      </p>
      <span className="text-8xl" aria-hidden>
        {term.emoji}
      </span>
      <h1 className="text-6xl font-black">{term.term}</h1>
      <p className="text-2xl font-bold leading-snug">{term.meaning}</p>
      <p className="text-xl text-muted font-semibold italic">“{term.example}”</p>
      <div className="flex gap-6 items-center">
        <SpeakButton text={spokenTerm(term)} label="Hear it" size="lg" />
        <SpeakButton text={term.example} label="Example" />
      </div>
      <button
        onClick={onNext}
        className="h-20 px-14 rounded-3xl text-white text-2xl font-black shadow-[0_6px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none"
        style={{ background: child.color }}
      >
        {n < of ? "Got it ▶" : "Got it — quiz me! ▶"}
      </button>
    </main>
  );
}
