"use client";

// Spelling practice (SP levels). The app says the word, a sentence, then the
// word again; the child types it on a big on-screen keyboard.
// Wrong words come back at the end as "Look, cover, write, check" (not counted).

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import LetterKeyboard from "@/components/LetterKeyboard";
import SpeakButton from "@/components/SpeakButton";
import { accuracy, type Outcome, type SetResult } from "@/lib/mastery";
import { dueKeys } from "@/lib/memory";
import { armSfx, playRight, playWrong } from "@/lib/sfx";
import { speak } from "@/lib/speech";
import {
  generateSpSet,
  pickSpReview,
  getSpLevel,
  isCorrectSpelling,
  nextSpLevel,
  prevSpLevel,
  spokenPrompt,
  type SpLevel,
  type SpWord,
} from "@/lib/spelling";
import { childMemory, recordMemory, recordSpSet, spProgress, useAppState, type Child } from "@/lib/store";

export default function SpellingPage() {
  const { id } = useParams<{ id: string }>();
  const state = useAppState();
  if (!state) return null;
  const child = state.children.find((c) => c.id === id);
  const level = getSpLevel(spProgress(state, id).current);
  if (!child || !level) return null;
  return <Session child={child} level={level} tricky={state.spTricky?.[id] ?? {}} due={dueKeys(childMemory(state, id), "sp:")} />;
}

type Phase = "ready" | "main" | "fix" | "done";
/** typing → checking; "wrong" shows the right spelling; "look" = study it before typing (fix round). */
type Step = "look" | "typing" | "right" | "wrong";

const MAX_LEN = 16;

function Session({ child, level, tricky, due }: { child: Child; level: SpLevel; tricky: Record<string, number>; due: string[] }) {
  // Words from earlier days that are due ("Do you still remember?") come first;
  // they're saved in the memory boxes but don't count towards passing the level.
  const [{ words, reviewCount }] = useState(() => {
    const set = generateSpSet(level, tricky);
    const review = pickSpReview(due, set);
    return { words: [...review, ...set], reviewCount: review.length };
  });
  const [phase, setPhase] = useState<Phase>("ready");
  const [i, setI] = useState(0);
  const [fix, setFix] = useState<SpWord[]>([]);
  const [typed, setTyped] = useState("");
  const [step, setStep] = useState<Step>("typing");
  const [result, setResult] = useState<{ r: SetResult; outcome: Outcome; review: { total: number; remembered: number } } | null>(null);
  const correct = useRef(0);
  const wrong = useRef<SpWord[]>([]);
  const wrongReview = useRef<SpWord[]>([]);
  const remembered = useRef(0);
  const answers = useRef<{ key: string; ok: boolean }[]>([]);
  const startedAt = useRef(0);
  useEffect(armSfx, []);

  const list = phase === "fix" ? fix : words;
  const w = list[i];
  const isReview = phase === "main" && i < reviewCount;

  const finish = useCallback(() => {
    const r: SetResult = {
      total: words.length - reviewCount,
      correctFirstTime: correct.current,
      durationMs: Date.now() - startedAt.current,
      secondsPerQuestion: 0,
      accuracyTarget: level.accuracyTarget,
    };
    recordMemory(child.id, answers.current);
    const outcome = recordSpSet(child.id, level.id, r, wrong.current.map((x) => x.word), nextSpLevel(level.id)?.id, prevSpLevel(level.id)?.id);
    setResult({ r, outcome, review: { total: reviewCount, remembered: remembered.current } });
    setPhase("done");
  }, [child.id, level, words.length, reviewCount]);

  const advance = useCallback(() => {
    setTyped("");
    if (i + 1 < list.length) {
      setI(i + 1);
      setStep(phase === "fix" ? "look" : "typing");
      return;
    }
    if (phase === "main" && (wrong.current.length || wrongReview.current.length)) {
      setFix([...wrongReview.current, ...wrong.current]);
      setI(0);
      setPhase("fix");
      setStep("look");
      return;
    }
    finish();
  }, [i, list.length, phase, finish]);

  const onKey = useCallback(
    (ch: string) => {
      if (step === "typing") setTyped((t) => (t.length < MAX_LEN ? t + ch : t));
    },
    [step],
  );
  const onBack = useCallback(() => {
    if (step === "typing") setTyped((t) => t.slice(0, -1));
  }, [step]);

  const onSubmit = useCallback(() => {
    if (step !== "typing" || !typed.trim() || !w) return;
    const ok = isCorrectSpelling(typed, w.word);
    if (phase === "main") {
      answers.current.push({ key: `sp:${w.word}`, ok });
      if (isReview) {
        if (ok) remembered.current++;
        else wrongReview.current.push(w);
      } else if (ok) correct.current++;
      else wrong.current.push(w);
    }
    if (ok) {
      playRight();
      setStep("right");
      setTimeout(advance, 800);
    } else {
      playWrong();
      setStep("wrong");
    }
  }, [step, typed, w, phase, advance, isReview]);

  /** After seeing the right spelling: main round moves on; fix round has another go. */
  const afterWrong = useCallback(() => {
    if (phase === "fix") {
      setTyped("");
      setStep("look");
    } else {
      advance();
    }
  }, [phase, advance]);

  if (phase === "ready") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="text-muted font-bold text-lg">{level.id} · Spelling</p>
        <h1 className="text-5xl font-black max-w-2xl">{level.title}</h1>
        <p className="text-xl font-semibold text-muted max-w-md">Turn the sound up. Listen to the word, then type it 🔊</p>
        <button
          onClick={() => {
            // Speaking inside the tap unlocks audio on iPad for the rest of the set.
            if (words[0]) void speak(spokenPrompt(words[0]));
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
  if (!w) return null;

  const boxColour = step === "right" ? "border-good text-good" : step === "wrong" ? "border-bad text-bad" : "border-brand";

  return (
    <main className="flex-1 flex flex-col items-center gap-5 p-4 sm:p-6 max-w-3xl mx-auto w-full">
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

      {phase === "fix" && <p className="text-xl font-extrabold text-warn">Let&apos;s fix these ✏️</p>}
      {isReview && step !== "look" && (
        <p className="px-4 py-2 rounded-full bg-brand/10 text-brand text-xl font-extrabold">🧠 Do you still remember this one?</p>
      )}

      {step === "look" ? (
        <div key={`look-${i}`} className="flex-1 flex flex-col items-center justify-center gap-8 animate-pop">
          <h1 className="text-3xl font-black">Look carefully…</h1>
          <p className="text-7xl sm:text-8xl font-extrabold tracking-wide">{w.word}</p>
          <SpeakButton text={w.word} label="Hear it" size="lg" />
          <button
            onClick={() => {
              setStep("typing");
              void speak(spokenPrompt(w));
            }}
            className="h-20 px-12 rounded-3xl text-white text-2xl font-black shadow-[0_6px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none"
            style={{ background: child.color }}
          >
            Cover it and write it 🙈
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            {/* Main round: new word each time, so play it automatically (the child has already tapped). */}
            <SpeakButton key={`${phase}-${i}`} text={spokenPrompt(w)} label="Hear it again" size="lg" autoPlay={phase === "main" && i > 0} />
          </div>

          <div
            className={`w-full max-w-xl min-h-24 rounded-3xl border-4 bg-card flex items-center justify-center px-4 text-6xl font-extrabold tracking-wide ${boxColour} ${
              step === "wrong" ? "animate-shake" : ""
            }`}
            aria-live="polite"
            aria-label="Your spelling"
          >
            {typed || <span className="text-line">…</span>}
            {step === "typing" && <span className="w-1 h-14 ml-1 bg-brand rounded-full animate-pulse" aria-hidden />}
            {step === "right" && <span className="ml-3">✓</span>}
          </div>

          {step === "wrong" ? (
            <div className="flex flex-col items-center gap-5 animate-pop">
              <p className="text-2xl font-bold text-muted">It&apos;s spelled</p>
              <p className="text-7xl font-extrabold text-good tracking-wide">
                <Diff typed={typed} word={w.word} />
              </p>
              <button
                onClick={afterWrong}
                className="h-16 px-10 rounded-2xl text-white text-2xl font-extrabold shadow-[0_5px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none"
                style={{ background: child.color }}
              >
                {phase === "fix" ? "Try again" : "Next ▶"}
              </button>
            </div>
          ) : (
            <LetterKeyboard onKey={onKey} onBack={onBack} onSubmit={onSubmit} disabled={step !== "typing"} />
          )}
        </>
      )}
    </main>
  );
}

/**
 * Show the right spelling with the letters the child missed or got wrong
 * underlined, lining the two words up from both ends (catches most slips:
 * a missing, extra or swapped letter in the middle).
 */
function Diff({ typed, word }: { typed: string; word: string }) {
  const t = typed.trim().toLowerCase();
  const lw = word.toLowerCase();
  let start = 0;
  while (start < t.length && start < lw.length && t[start] === lw[start]) start++;
  let end = 0;
  while (end < t.length - start && end < lw.length - start && t[t.length - 1 - end] === lw[lw.length - 1 - end]) end++;
  const a = word.slice(0, start);
  const mid = word.slice(start, word.length - end);
  const b = word.slice(word.length - end);
  return (
    <>
      {a}
      {mid && <span className="underline decoration-warn decoration-8 underline-offset-8 text-warn">{mid}</span>}
      {b}
    </>
  );
}

function Result({ child, level, r, outcome, review }: { child: Child; level: SpLevel; r: SetResult; outcome: Outcome; review: { total: number; remembered: number } }) {
  const pct = Math.round(accuracy(r) * 100);
  const next = nextSpLevel(level.id);
  const head = {
    levelPassed: { e: "🏆", t: "Level passed!", s: next ? `Next up: ${next.title}` : "You've finished every spelling level!" },
    setPassed: { e: "⭐", t: "Super spelling!", s: "One more set like that and you pass this level." },
    setFailed: { e: "💪", t: "Good try!", s: "The words you missed will come up again soon." },
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
      {review.total > 0 && (
        <p className="text-xl font-bold">
          🧠 Remembered {review.remembered} of {review.total} word{review.total === 1 ? "" : "s"} from before
          {review.remembered === review.total ? " — amazing memory!" : ""}
        </p>
      )}
      <div className="flex gap-4 mt-2">
        <Link href={`/child/${child.id}`} className="h-16 px-8 rounded-2xl bg-card border-2 border-line text-xl font-extrabold flex items-center">
          Finish
        </Link>
        <a href={`/child/${child.id}/spelling`} className="h-16 px-8 rounded-2xl text-white text-xl font-extrabold flex items-center" style={{ background: child.color }}>
          Another set ▶
        </a>
      </div>
    </main>
  );
}
