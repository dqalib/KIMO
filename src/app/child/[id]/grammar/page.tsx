"use client";

// Grammar & punctuation practice (GP levels): tap the right answer.
// The question can be read aloud. A wrong answer shows a short "why";
// wrong questions come back at the end to fix (not counted).

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState, type ReactNode } from "react";
import ChoiceGrid from "@/components/ChoiceGrid";
import SetResultScreen from "@/components/SetResultScreen";
import SpeakButton from "@/components/SpeakButton";
import { generateGpSet, getGpLevel, nextGpLevel, prevGpLevel, shuffleOptions, spokenGp, type GpLevel, type GpQuestion } from "@/lib/grammar";
import type { Outcome, SetResult } from "@/lib/mastery";
import { recordStrandSet, strandProgress, strandTricky, useAppState, type Child } from "@/lib/store";

export default function GrammarPage() {
  const { id } = useParams<{ id: string }>();
  const exam = useSearchParams().get("exam") === "1";
  const state = useAppState();
  if (!state) return null;
  const child = state.children.find((c) => c.id === id);
  const level = getGpLevel(strandProgress(state, "gp", id).current);
  if (!child || !level) return null;
  return <Session child={child} level={level} tricky={strandTricky(state, "gp", id)} exam={exam} />;
}

type Phase = "ready" | "main" | "fix" | "done";

function Session({ child, level, tricky, exam }: { child: Child; level: GpLevel; tricky: Record<string, number>; exam: boolean }) {
  const [questions] = useState<GpQuestion[]>(() => generateGpSet(level, tricky));
  const [phase, setPhase] = useState<Phase>("ready");
  const [i, setI] = useState(0);
  const [fix, setFix] = useState<GpQuestion[]>([]);
  const [shown, setShown] = useState<{ chosen: number; correct: number } | null>(null);
  const [result, setResult] = useState<{ r: SetResult; outcome: Outcome } | null>(null);
  const correct = useRef(0);
  const wrong = useRef<GpQuestion[]>([]);
  const missed = useRef<{ prompt: string; given: string; answer: string }[]>([]);
  const sending = useRef(false);
  const startedAt = useRef(0);

  const list = phase === "fix" ? fix : questions;
  const q = list[i];

  const finish = useCallback(() => {
    const r: SetResult = {
      mode: exam ? "exam" : "practice",
      ...(exam ? { answers: missed.current } : {}),
      total: questions.length,
      correctFirstTime: correct.current,
      durationMs: Date.now() - startedAt.current,
      secondsPerQuestion: 0,
      accuracyTarget: level.accuracyTarget,
    };
    const outcome = recordStrandSet(
      "gp",
      child.id,
      level.id,
      r,
      wrong.current.map((w) => w.id),
      nextGpLevel(level.id)?.id,
      prevGpLevel(level.id)?.id,
      wrong.current.map((w) => w.sentence ?? w.prompt),
    );
    setResult({ r, outcome });
    setPhase("done");
  }, [child.id, level, questions.length, exam]);

  const advance = useCallback(() => {
    setShown(null);
    if (i + 1 < list.length) {
      setI(i + 1);
      return;
    }
    if (!exam && phase === "main" && wrong.current.length) {
      // Fresh option order so the fix round isn't answered by position.
      setFix(wrong.current.map((w) => shuffleOptions(w)));
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
        if (ok) correct.current++;
        else wrong.current.push(q);
      }
      if (exam) {
        // Exam: no marking shown — save it and move on.
        if (!ok) missed.current.push({ prompt: [q.prompt, q.sentence].filter(Boolean).join(" — "), given: q.options[k], answer: q.options[q.answer] });
        sending.current = true;
        setTimeout(() => {
          sending.current = false;
          advance();
        }, 250);
        return;
      }
      setShown({ chosen: k, correct: q.answer });
      if (ok) setTimeout(advance, 800);
    },
    [shown, q, phase, advance, exam],
  );

  if (phase === "ready") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="text-muted font-bold text-lg">
          {level.id} · Grammar {exam ? "📝 Exam" : "practice"}
        </p>
        <h1 className="text-5xl font-black max-w-2xl">{level.title}</h1>
        <p className="text-xl font-semibold text-muted max-w-md">
          {exam
            ? "This is the exam — no answers until the end. Get 9 out of 10 right to move up a level!"
            : "Read each one carefully, then tap the right answer. Tap 🔊 to hear it."}
        </p>
        <button
          onClick={() => {
            startedAt.current = Date.now();
            setPhase("main");
          }}
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

  if (phase === "done" && result)
    return (
      <SetResultScreen
        child={child}
        r={result.r}
        outcome={result.outcome}
        exam={exam}
        nextTitle={nextGpLevel(level.id)?.title}
        allDoneText="You've finished every grammar level!"
        practiceHref={`/child/${child.id}/grammar`}
      />
    );
  if (!q) return null;

  const wrongNow = shown && shown.chosen !== shown.correct;
  const filled = shown ? q.options[shown.correct] : null;

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

      <div key={`${phase}-${i}`} className="w-full flex flex-col items-center gap-6 animate-pop">
        <div className="flex items-center gap-4">
          <SpeakButton text={spokenGp(q)} label="Hear it" />
        </div>
        <h1 className="text-3xl font-black text-center">{q.prompt}</h1>
        {q.sentence && (
          <p className="text-4xl sm:text-5xl font-extrabold text-center leading-snug">
            <Gap sentence={q.sentence} filled={filled} good={!wrongNow} />
          </p>
        )}
        <ChoiceGrid
          options={q.options}
          size={q.style === "pick-mark" ? "lg" : "md"}
          stack={q.style === "pick-sentence"}
          result={shown ?? undefined}
          onChoose={(_, k) => choose(k)}
        />
        {shown && !wrongNow && <p className="text-4xl font-black text-good animate-pop">✓ Correct!</p>}
        {wrongNow && (
          <div className="w-full max-w-xl rounded-3xl bg-card border-4 border-warn p-5 flex flex-col items-center gap-4 animate-pop">
            <p className="text-4xl font-black text-bad">✗ Not quite</p>
            <p className="text-2xl font-semibold text-center">{bold(q.why)}</p>
            <button
              onClick={() => {
                if (phase === "fix") setShown(null); // try the same one again
                else advance();
              }}
              className="h-16 px-10 rounded-2xl text-white text-2xl font-extrabold shadow-[0_5px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none"
              style={{ background: child.color }}
            >
              {phase === "fix" ? "Try again" : "Next ▶"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

/** Sentence with its ___ gap drawn as a box (filled in once answered). */
function Gap({ sentence, filled, good }: { sentence: string; filled: string | null; good: boolean }) {
  const parts = sentence.split("___");
  if (parts.length < 2) return <>{sentence}</>;
  return (
    <>
      {parts[0]}
      <span
        className={`inline-block min-w-20 px-2 mx-1 rounded-xl border-4 border-dashed align-middle leading-tight ${
          filled ? (good ? "border-good text-good" : "border-bad text-good") : "border-brand"
        }`}
      >
        {filled ?? " "}
      </span>
      {parts[1]}
    </>
  );
}

/** *word* → bold. */
function bold(text: string): ReactNode[] {
  return text.split(/(\*[^*]+\*)/).map((part, k) =>
    part.startsWith("*") && part.endsWith("*") ? (
      <strong key={k} className="font-black">
        {part.slice(1, -1)}
      </strong>
    ) : (
      part
    ),
  );
}
