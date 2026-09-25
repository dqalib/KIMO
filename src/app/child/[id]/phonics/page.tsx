"use client";

// Phonics practice (PH levels). Question types — see src/lib/phonics.ts.
// Wrong answers come back at the end to fix (not counted), like times tables.

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import ChoiceGrid from "@/components/ChoiceGrid";
import SoundButtons from "@/components/SoundButtons";
import SpeakButton from "@/components/SpeakButton";
import { accuracy, type Outcome, type SetResult } from "@/lib/mastery";
import { generatePhSet, getPhLevel, nextPhLevel, prevPhLevel, type PhLevel, type PhQuestion } from "@/lib/phonics";
import { speak } from "@/lib/speech";
import { phProgress, recordPhSet, useAppState, type Child } from "@/lib/store";

export default function PhonicsPage() {
  const { id } = useParams<{ id: string }>();
  const state = useAppState();
  if (!state) return null;
  const child = state.children.find((c) => c.id === id);
  const level = getPhLevel(phProgress(state, id).current);
  if (!child || !level) return null;
  return <Session child={child} level={level} tricky={state.phTricky?.[id] ?? {}} />;
}

type Phase = "ready" | "main" | "fix" | "done";

function Session({ child, level, tricky }: { child: Child; level: PhLevel; tricky: Record<string, number> }) {
  const [questions] = useState<PhQuestion[]>(() => generatePhSet(level, tricky));
  const [phase, setPhase] = useState<Phase>("ready");
  const [i, setI] = useState(0);
  const [fix, setFix] = useState<PhQuestion[]>([]);
  const [shown, setShown] = useState<{ chosen: number; correct: number } | null>(null);
  const [result, setResult] = useState<{ r: SetResult; outcome: Outcome } | null>(null);
  const correct = useRef(0);
  const wrong = useRef<PhQuestion[]>([]);
  const startedAt = useRef(0);
  const busy = useRef(false); // ignore extra taps while moving to the next question

  const list = phase === "fix" ? fix : questions;
  const q = list[i];

  const finish = useCallback(() => {
    const r: SetResult = {
      total: questions.length,
      correctFirstTime: correct.current,
      durationMs: Date.now() - startedAt.current,
      secondsPerQuestion: 0,
      accuracyTarget: level.accuracyTarget,
    };
    const outcome = recordPhSet(child.id, level.id, r, wrong.current.map((w) => w.key), nextPhLevel(level.id)?.id, prevPhLevel(level.id)?.id);
    setResult({ r, outcome });
    setPhase("done");
  }, [child.id, level, questions.length]);

  const advance = useCallback(() => {
    busy.current = false;
    setShown(null);
    if (i + 1 < list.length) {
      setI(i + 1);
      return;
    }
    if (phase === "main") {
      const toFix = wrong.current.filter((w) => w.kind !== "read");
      if (toFix.length) {
        setFix(toFix);
        setI(0);
        setPhase("fix");
        return;
      }
    }
    finish();
  }, [i, list.length, phase, finish]);

  /** Record an answer. In the fix round, a wrong answer is simply tried again. */
  const answer = useCallback(
    (ok: boolean, chosen?: number, correctIdx?: number) => {
      if (busy.current) return;
      busy.current = true;
      if (phase === "main") {
        if (ok) correct.current++;
        else wrong.current.push(q);
      }
      if (chosen !== undefined && correctIdx !== undefined) setShown({ chosen, correct: correctIdx });
      if (phase === "fix" && !ok) {
        setTimeout(() => {
          setShown(null);
          busy.current = false;
        }, 1400);
        return;
      }
      // Grown-up marking has nothing to show, so move straight on.
      const delay = q.kind === "read" ? 250 : ok ? 700 : 1500;
      setTimeout(advance, delay);
    },
    [phase, q, advance],
  );

  if (phase === "ready") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="text-muted font-bold text-lg">{level.id} · Phonics</p>
        <h1 className="text-5xl font-black">{level.title}</h1>
        <p className="text-xl font-semibold text-muted max-w-md">
          {level.grownUp
            ? "You'll need a grown-up next to you for this one — they'll listen to you read."
            : "Turn the sound up and listen carefully 🔊"}
        </p>
        <button
          onClick={() => {
            // Speaking inside the tap unlocks audio on iPad for the rest of the set.
            const first = questions[0];
            if (first && (first.kind === "hear" || first.kind === "missing")) void speak(first.say);
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
  if (!q) return null;

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

      {phase === "fix" && <p className="text-xl font-extrabold text-warn">Let&apos;s try these again ✏️</p>}

      <Question key={`${phase}-${i}`} q={q} shown={shown} onAnswer={answer} />
    </main>
  );
}

function Question({
  q,
  shown,
  onAnswer,
}: {
  q: PhQuestion;
  shown: { chosen: number; correct: number } | null;
  onAnswer: (ok: boolean, chosen?: number, correct?: number) => void;
}) {
  if (q.kind === "hear") {
    return (
      <div className="w-full flex flex-col items-center gap-8">
        <h1 className="text-3xl font-black">Which word did you hear?</h1>
        <SpeakButton text={q.say} label="Hear it again" size="lg" autoPlay />
        <ChoiceGrid size="lg" options={q.options} result={shown ?? undefined} onChoose={(_, k) => onAnswer(k === q.answer, k, q.answer)} />
      </div>
    );
  }

  if (q.kind === "missing") {
    return (
      <div className="w-full flex flex-col items-center gap-8">
        <h1 className="text-3xl font-black">Which sound is missing?</h1>
        <SpeakButton text={q.say} label="Hear the word" size="lg" autoPlay />
        <p className="flex items-end gap-2 text-7xl font-extrabold" aria-label="word with a missing sound">
          {q.graphemes.map((g, k) =>
            k === q.blank ? (
              <span
                key={k}
                className={`inline-block min-w-24 h-20 rounded-2xl border-4 border-dashed text-center leading-[4.5rem] ${
                  shown ? (shown.chosen === shown.correct ? "border-good text-good" : "border-bad text-good") : "border-brand"
                }`}
              >
                {shown ? g : ""}
              </span>
            ) : (
              <span key={k}>{g.includes("-") ? g[0] : g}</span>
            ),
          )}
          {q.graphemes.some((g) => g.includes("-")) && <span>e</span>}
        </p>
        <ChoiceGrid size="lg" options={q.options} result={shown ?? undefined} onChoose={(_, k) => onAnswer(k === q.answer, k, q.answer)} />
      </div>
    );
  }

  if (q.kind === "real") {
    const correctIdx = q.answer ? 0 : 1;
    return (
      <div className="w-full flex flex-col items-center gap-8">
        <h1 className="text-3xl font-black">Real word or alien word?</h1>
        <SoundButtons graphemes={q.word.graphemes} />
        <ChoiceGrid
          size="lg"
          options={["Real ✓", "Alien 👽"]}
          result={shown ?? undefined}
          onChoose={(_, k) => onAnswer(k === correctIdx, k, correctIdx)}
        />
      </div>
    );
  }

  // Read aloud, grown-up marks it.
  const isCheck = q.word.paper !== undefined;
  return (
    <div className="w-full flex flex-col items-center gap-8">
      <h1 className="text-3xl font-black">Read this word out loud</h1>
      <div className="flex items-center gap-6 min-h-40">
        {!q.word.real && <span className="text-6xl" title="alien word">👽</span>}
        {isCheck ? (
          <span className="text-8xl font-extrabold">{q.word.word}</span>
        ) : (
          <SoundButtons graphemes={q.word.graphemes} />
        )}
      </div>
      <div className="w-full max-w-xl rounded-3xl bg-card border-2 border-line p-4 flex flex-col gap-3">
        <p className="text-center font-bold text-muted">Grown-up: did they read it right?</p>
        <div className="grid grid-cols-2 gap-3">
          <button className="h-20 rounded-2xl bg-good text-white text-2xl font-extrabold" onClick={() => onAnswer(true)}>
            ✓ Yes
          </button>
          <button className="h-20 rounded-2xl bg-card border-2 border-line text-2xl font-extrabold" onClick={() => onAnswer(false)}>
            ✗ Not yet
          </button>
        </div>
      </div>
    </div>
  );
}

function Result({ child, level, r, outcome }: { child: Child; level: PhLevel; r: SetResult; outcome: Outcome }) {
  const pct = Math.round(accuracy(r) * 100);
  const next = nextPhLevel(level.id);
  const head = {
    levelPassed: { e: "🏆", t: "Level passed!", s: next ? `Next up: ${next.title}` : "You've finished every phonics level!" },
    setPassed: { e: "⭐", t: "Great reading!", s: "One more set like that and you pass this level." },
    setFailed: { e: "💪", t: "Good try!", s: "Keep practising — you're getting there." },
    droppedBack: { e: "🔁", t: "Let's warm up", s: "We'll go back a level, then come back stronger." },
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
        <p className="font-bold text-muted">right first time</p>
      </div>
      {level.id === "PH-16" && (
        <p className="text-muted max-w-md">
          In the real Year 1 check, the pass mark has been 32 out of 40.
          {r.correctFirstTime >= 32 ? " That's a pass! 🎉" : ""}
        </p>
      )}
      <div className="flex gap-4 mt-2">
        <Link href={`/child/${child.id}`} className="h-16 px-8 rounded-2xl bg-card border-2 border-line text-xl font-extrabold flex items-center">
          Finish
        </Link>
        <a href={`/child/${child.id}/phonics`} className="h-16 px-8 rounded-2xl text-white text-xl font-extrabold flex items-center" style={{ background: child.color }}>
          Another set ▶
        </a>
      </div>
    </main>
  );
}
