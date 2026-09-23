"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import NumberPad from "@/components/NumberPad";
import { accuracy, isPassingSet, timeTargetMs, type Outcome, type SetResult } from "@/lib/mastery";
import { recordSet, useAppState, type Child } from "@/lib/store";
import { generateSet, getLevel, nextLevel, prevLevel, type Question, type TTLevel } from "@/lib/tt";

export default function PracticePage() {
  const { id } = useParams<{ id: string }>();
  const state = useAppState();
  if (!state) return null;
  const child = state.children.find((c) => c.id === id);
  const progress = state.tt[id];
  const level = progress && getLevel(progress.current);
  if (!child || !level) return null;
  return <Practice child={child} level={level} weak={state.weakFacts[id] ?? {}} />;
}

type Phase = "ready" | "main" | "fix" | "done";
type Flash = "good" | "bad" | null;

function Practice({ child, level, weak }: { child: Child; level: TTLevel; weak: Record<string, number> }) {
  const [questions] = useState<Question[]>(() => generateSet(level, weak));
  const [phase, setPhase] = useState<Phase>("ready");
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [flash, setFlash] = useState<Flash>(null);
  const [wrong, setWrong] = useState<Question[]>([]);
  const [fixIndex, setFixIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [result, setResult] = useState<{ r: SetResult; outcome: Outcome } | null>(null);

  const startedAt = useRef(0);
  const mainEndedAt = useRef(0);
  const correctFirst = useRef(0);
  const wrongRef = useRef<Question[]>([]);
  const busy = useRef(false);

  const q = phase === "fix" ? wrong[fixIndex] : questions[index];

  const finish = useCallback(() => {
    const r: SetResult = {
      total: questions.length,
      correctFirstTime: correctFirst.current,
      durationMs: mainEndedAt.current - startedAt.current,
      secondsPerQuestion: level.secondsPerQuestion,
    };
    const outcome = recordSet(child.id, level.id, r, wrongRef.current.map((w) => ({ prompt: w.prompt, key: w.key })));
    setResult({ r, outcome });
    setPhase("done");
  }, [child.id, level, questions.length]);

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

  const submit = useCallback(() => {
    if (busy.current || !q || input === "") return;
    busy.current = true;
    const correct = Number(input) === q.answer;

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
        setShowAnswer(true);
        busy.current = false;
      }, 650);
    }
  }, [q, input, phase, advanceMain, markWrongMain, fixIndex, wrong.length, finish]);

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

  if (phase === "done" && result) return <Result child={child} level={level} {...result} />;

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

      <NumberPad onDigit={onDigit} onBack={onBack} onSubmit={submit} disabled={flash !== null} />
    </main>
  );
}

function Result({ child, level, r, outcome }: { child: Child; level: TTLevel; r: SetResult; outcome: Outcome }) {
  const pct = Math.round(accuracy(r) * 100);
  const secs = Math.round(r.durationMs / 1000);
  const target = Math.round(timeTargetMs(r) / 1000);
  const fast = r.durationMs <= timeTargetMs(r);
  const next = nextLevel(level.id);
  const prev = prevLevel(level.id);

  const headline: Record<Outcome, { emoji: string; title: string; text: string }> = {
    levelPassed: {
      emoji: "🏆",
      title: "Level passed!",
      text: next ? `Next up: ${next.title}` : "You've finished every times tables level. Amazing!",
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
      text: prev ? `We'll practise ${prev.title} again, then come back stronger.` : "Let's try again.",
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
          href={`/child/${child.id}/practice`}
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
