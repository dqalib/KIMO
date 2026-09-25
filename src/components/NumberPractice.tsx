"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import NumberPad from "@/components/NumberPad";
import PencilAnswer from "@/components/PencilAnswer";
import { accuracy, isPassingSet, timeTargetMs, type Outcome, type SetResult } from "@/lib/mastery";
import { PENCIL_EXTRA_SECONDS, type Child, type InputMode } from "@/lib/store";

type Phase = "ready" | "main" | "fix" | "done";
type Flash = "good" | "bad" | null;

/** What a number-answer level needs to provide. */
export interface NumberLevel {
  id: string;
  title: string;
  secondsPerQuestion: number;
  /** Tables Check style: each question auto-skips (counts wrong) when time runs out. */
  hardLimit?: boolean;
}

export interface NumberQuestion {
  key: string; // stable fact key for the tricky-facts list
  prompt: string; // shown to the child; " =" is added unless it contains "?"
  answer: number;
}

interface Props {
  child: Child;
  level: NumberLevel;
  /** Builds the set once, when the screen opens. */
  makeQuestions: () => NumberQuestion[];
  initialMode: InputMode;
  /** Save the finished set; returns what happened (passed, dropped back…). */
  record: (r: SetResult, wrong: NumberQuestion[]) => Outcome;
  nextTitle?: string;
  prevTitle?: string;
  /** Shown when the last level in the strand is passed. */
  allDoneText: string;
  /** Link for "Another set". */
  againHref: string;
}

/**
 * Number-answer practice (keypad or Apple Pencil): used by times tables and
 * addition & subtraction. Wrong answers come back at the end to fix.
 */
export default function NumberPractice({ child, level, makeQuestions, initialMode, record, nextTitle, prevTitle, allDoneText, againHref }: Props) {
  const [mode, setMode] = useState<InputMode>(initialMode);
  const [attemptNo, setAttemptNo] = useState(0); // bumps to clear the Pencil pad
  // Writing takes a little longer than tapping, so Pencil sets get extra time per question.
  const secondsPerQuestion = level.secondsPerQuestion + (mode === "pencil" && !level.hardLimit ? PENCIL_EXTRA_SECONDS : 0);
  const [questions] = useState<NumberQuestion[]>(makeQuestions);
  const [phase, setPhase] = useState<Phase>("ready");
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [flash, setFlash] = useState<Flash>(null);
  const [wrong, setWrong] = useState<NumberQuestion[]>([]);
  const [fixIndex, setFixIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [result, setResult] = useState<{ r: SetResult; outcome: Outcome } | null>(null);

  const startedAt = useRef(0);
  const mainEndedAt = useRef(0);
  const correctFirst = useRef(0);
  const wrongRef = useRef<NumberQuestion[]>([]);
  const busy = useRef(false);

  const q = phase === "fix" ? wrong[fixIndex] : questions[index];

  const finish = useCallback(() => {
    const r: SetResult = {
      total: questions.length,
      correctFirstTime: correctFirst.current,
      durationMs: mainEndedAt.current - startedAt.current,
      secondsPerQuestion,
    };
    const outcome = record(r, wrongRef.current);
    setResult({ r, outcome });
    setPhase("done");
  }, [record, questions.length, secondsPerQuestion]);

  const endMain = useCallback(() => {
    mainEndedAt.current = Date.now();
    if (wrongRef.current.length > 0) {
      setWrong([...wrongRef.current]);
      setFixIndex(0);
      setPhase("fix");
    } else finish();
  }, [finish]);

  const advanceMain = useCallback(() => {
    setInput("");
    setAttemptNo((n) => n + 1);
    setFlash(null);
    busy.current = false;
    if (index + 1 < questions.length) setIndex(index + 1);
    else endMain();
  }, [index, questions.length, endMain]);

  const markWrongMain = useCallback(() => {
    wrongRef.current.push(questions[index]);
    setFlash("bad");
    setTimeout(advanceMain, 650);
  }, [questions, index, advanceMain]);

  const submitValue = useCallback((value: string) => {
    if (busy.current || !q || value === "") return;
    busy.current = true;
    const correct = Number(value) === q.answer;

    if (phase === "main") {
      if (correct) {
        correctFirst.current++;
        setFlash("good");
        setTimeout(advanceMain, 300);
      } else markWrongMain();
      return;
    }

    // Fix phase: must get each one right before finishing.
    if (correct) {
      setFlash("good");
      setTimeout(() => {
        setFlash(null);
        setInput("");
        setAttemptNo((n) => n + 1);
        setShowAnswer(false);
        busy.current = false;
        if (fixIndex + 1 < wrong.length) setFixIndex(fixIndex + 1);
        else finish();
      }, 400);
    } else {
      setFlash("bad");
      setTimeout(() => {
        setFlash(null);
        setInput("");
        setAttemptNo((n) => n + 1);
        setShowAnswer(true);
        busy.current = false;
      }, 650);
    }
  }, [q, phase, advanceMain, markWrongMain, fixIndex, wrong.length, finish]);

  const submit = useCallback(() => submitValue(input), [submitValue, input]);
  const onPencilAnswer = useCallback(
    (text: string) => {
      setInput(text);
      submitValue(text);
    },
    [submitValue],
  );
  const onPencilUnavailable = useCallback(() => setMode("keypad"), []);

  // Tables Check rehearsal: each question has a hard time limit.
  useEffect(() => {
    if (!level.hardLimit || phase !== "main") return;
    const t = setTimeout(() => {
      if (busy.current) return;
      busy.current = true;
      markWrongMain();
    }, level.secondsPerQuestion * 1000);
    return () => clearTimeout(t);
  }, [level, phase, index, markWrongMain]);

  const onDigit = useCallback((d: string) => setInput((v) => (v.length < 3 ? v + d : v)), []);
  const onBack = useCallback(() => setInput((v) => v.slice(0, -1)), []);

  if (phase === "ready") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="text-muted font-bold text-lg">{level.id}</p>
        <h1 className="text-5xl font-black">{level.title}</h1>
        <p className="text-xl font-semibold text-muted max-w-md">
          {questions.length} questions.{" "}
          {level.hardLimit
            ? `Just like the real check — ${level.secondsPerQuestion} seconds for each one!`
            : "Take your time and get them right. Speed comes with practice."}
        </p>
        <button
          onClick={() => {
            startedAt.current = Date.now();
            setPhase("main");
          }}
          className="h-20 px-16 rounded-3xl text-white text-3xl font-black shadow-[0_6px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none"
          style={{ background: child.color }}
        >
          Go! 🚀
        </button>
        <Link href={`/child/${child.id}`} className="text-muted underline">
          Not now
        </Link>
      </main>
    );
  }

  if (phase === "done" && result)
    return <Result child={child} {...result} nextTitle={nextTitle} prevTitle={prevTitle} allDoneText={allDoneText} againHref={againHref} />;

  const total = phase === "fix" ? wrong.length : questions.length;
  const pos = phase === "fix" ? fixIndex : index;

  return (
    <main className="flex-1 flex flex-col items-center gap-6 p-4 sm:p-6 max-w-3xl mx-auto w-full">
      <header className="w-full flex items-center gap-3">
        <Link href={`/child/${child.id}`} className="text-muted font-bold" aria-label="Stop">
          ✕
        </Link>
        <div className="flex-1 flex gap-1">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className="h-3 flex-1 rounded-full"
              style={{ background: i < pos ? child.color : i === pos ? `${child.color}88` : "var(--line)" }}
            />
          ))}
        </div>
        <span className="font-bold text-muted tabular-nums">
          {pos + 1}/{total}
        </span>
      </header>

      {phase === "fix" && (
        <p className="text-xl font-extrabold text-warn">Let&apos;s fix these ones ✏️</p>
      )}

      {level.hardLimit && phase === "main" && (
        <div className="w-full max-w-sm h-3 rounded-full bg-line overflow-hidden">
          <div
            key={index}
            className="h-full bg-warn origin-left"
            style={{ animation: `shrink ${level.secondsPerQuestion}s linear forwards` }}
          />
          <style>{`@keyframes shrink { from { transform: scaleX(1) } to { transform: scaleX(0) } }`}</style>
        </div>
      )}

      <div
        className={`w-full max-w-xl rounded-3xl bg-card border-4 py-10 flex flex-col items-center gap-4 transition-colors ${
          flash === "good" ? "border-good" : flash === "bad" ? "border-bad animate-shake" : "border-line"
        }`}
      >
        <p className="text-6xl sm:text-7xl font-black tabular-nums">{q?.prompt.includes("?") ? q.prompt : `${q?.prompt} =`}</p>
        <p
          className={`min-h-20 min-w-40 px-6 rounded-2xl border-4 border-dashed text-6xl font-black tabular-nums flex items-center justify-center ${
            flash === "good" ? "text-good border-good" : flash === "bad" ? "text-bad border-bad" : "border-line"
          }`}
        >
          {input || " "}
        </p>
        {showAnswer && q && (
          <p className="text-2xl font-bold text-muted animate-pop">
            It&apos;s <span className="text-ink">{q.answer}</span> — type it in
          </p>
        )}
      </div>

      {mode === "pencil" ? (
        <PencilAnswer
          key={attemptNo}
          color={child.color}
          disabled={flash !== null}
          onAnswer={onPencilAnswer}
          onReading={setInput}
          onUnavailable={onPencilUnavailable}
        />
      ) : (
        <NumberPad onDigit={onDigit} onBack={onBack} onSubmit={submit} disabled={flash !== null} />
      )}
      {!level.hardLimit && (
        <button
          className="text-sm text-muted underline"
          onClick={() => {
            setInput("");
            setMode(mode === "pencil" ? "keypad" : "pencil");
          }}
        >
          {mode === "pencil" ? "Use the keypad instead" : "Write with the Pencil instead"}
        </button>
      )}
    </main>
  );
}

function Result({
  child,
  r,
  outcome,
  nextTitle,
  prevTitle,
  allDoneText,
  againHref,
}: {
  child: Child;
  r: SetResult;
  outcome: Outcome;
  nextTitle?: string;
  prevTitle?: string;
  allDoneText: string;
  againHref: string;
}) {
  const pct = Math.round(accuracy(r) * 100);
  const secs = Math.round(r.durationMs / 1000);
  const target = Math.round(timeTargetMs(r) / 1000);
  const fast = r.durationMs <= timeTargetMs(r);

  const headline: Record<Outcome, { emoji: string; title: string; text: string }> = {
    levelPassed: {
      emoji: "🏆",
      title: "Level passed!",
      text: nextTitle ? `Next up: ${nextTitle}` : allDoneText,
    },
    setPassed: { emoji: "⭐", title: "Great set!", text: "One more set like that and you pass this level." },
    setFailed: {
      emoji: "💪",
      title: "Good effort!",
      text: isPassingSet(r)
        ? "Keep going!"
        : pct < 90
          ? "Aim for 9 out of 10 right first time. You can do it!"
          : "Nearly! Try to be a little bit quicker.",
    },
    droppedBack: {
      emoji: "🔁",
      title: "Let's warm up",
      text: prevTitle ? `We'll practise ${prevTitle} again, then come back stronger.` : "Let's try again.",
    },
  };
  const h = headline[outcome];

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center animate-pop">
      <span className="text-8xl">{h.emoji}</span>
      <h1 className="text-5xl font-black">{h.title}</h1>
      <p className="text-xl font-semibold text-muted max-w-md">{h.text}</p>
      <div className="flex gap-4">
        <Stat label="Right first time" value={`${r.correctFirstTime}/${r.total}`} good={pct >= 90} />
        <Stat label="Time" value={`${secs}s`} sub={`target ${target}s`} good={fast} />
      </div>
      <div className="flex gap-4 mt-2">
        <Link
          href={`/child/${child.id}`}
          className="h-16 px-8 rounded-2xl bg-card border-2 border-line text-xl font-extrabold flex items-center"
        >
          Finish
        </Link>
        <a
          href={againHref}
          className="h-16 px-8 rounded-2xl text-white text-xl font-extrabold flex items-center"
          style={{ background: child.color }}
        >
          Another set ▶
        </a>
      </div>
    </main>
  );
}

function Stat({ label, value, sub, good }: { label: string; value: string; sub?: string; good: boolean }) {
  return (
    <div className={`rounded-2xl bg-card border-4 px-6 py-4 min-w-40 ${good ? "border-good" : "border-warn"}`}>
      <p className="text-4xl font-black tabular-nums">{value}</p>
      <p className="font-bold text-muted">{label}</p>
      {sub && <p className="text-sm text-muted">{sub}</p>}
    </div>
  );
}
