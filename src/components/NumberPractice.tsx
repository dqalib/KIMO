"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import ChoiceGrid from "@/components/ChoiceGrid";
import NumberPad from "@/components/NumberPad";
import PencilAnswer from "@/components/PencilAnswer";
import SpeakButton from "@/components/SpeakButton";
import { armSfx, playRight, playWrong } from "@/lib/sfx";
import { spokenMaths } from "@/lib/speech";
import { accuracy, timeTargetMs, type Outcome, type SetResult } from "@/lib/mastery";
import { PENCIL_EXTRA_SECONDS, type Child, type InputMode } from "@/lib/store";

type Phase = "ready" | "main" | "fix" | "done";
/** good = right; bad = wrong (practice shows the answer); sent = exam answer saved (no marking shown). */
type Flash = "good" | "bad" | "sent" | null;

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
  prompt: string; // shown to the child; " =" is added to plain sums (no "?" and no words)
  answer: number | string;
  /** Tap-to-answer choices (e.g. "<", ">", "=", Roman numerals, negative numbers) instead of the keypad. */
  options?: string[];
}

/** Word questions ("Round 605 to the nearest 10") get smaller text and no " =". */
const isWordy = (prompt: string) => /[A-Za-z]{2,}/.test(prompt);
const shownPrompt = (prompt: string) => (prompt.includes("?") || isWordy(prompt) ? prompt : `${prompt} =`);

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
  /** Link for "Another set" (practice). The exam is the same link with ?exam=1. */
  againHref: string;
  /** Draw prompts/options differently (fractions stack 3 over 4). */
  renderText?: (text: string) => ReactNode;
  /** Exam: no marking or answers until the end; passing moves up a level. */
  exam?: boolean;
}

/**
 * Number-answer screen (keypad, Apple Pencil or tap): times tables, adding &
 * taking away, numbers, fractions, time.
 * Practice: right/wrong shows straight away; a wrong answer shows the right one
 *   and waits for "Next"; wrong ones come back at the end to fix.
 * Exam: answers are saved without marking; the score and the missed questions
 *   (with the right answers) are shown at the end.
 */
export default function NumberPractice({ child, level, makeQuestions, initialMode, record, nextTitle, prevTitle, allDoneText, againHref, renderText, exam = false }: Props) {
  const [mode, setMode] = useState<InputMode>(initialMode);
  const [attemptNo, setAttemptNo] = useState(0); // bumps to clear the Pencil pad
  // Writing takes a little longer than tapping, so Pencil sets get extra time per question.
  // (0 = no time target at all, e.g. Year 1 fractions — the Pencil must not add one.)
  const secondsPerQuestion = level.secondsPerQuestion + (mode === "pencil" && !level.hardLimit && level.secondsPerQuestion > 0 ? PENCIL_EXTRA_SECONDS : 0);
  const [questions] = useState<NumberQuestion[]>(makeQuestions);
  const [phase, setPhase] = useState<Phase>("ready");
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [flash, setFlash] = useState<Flash>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [wrong, setWrong] = useState<NumberQuestion[]>([]);
  const [fixIndex, setFixIndex] = useState(0);
  // Tap-to-answer: colour the tapped button (green/red) and reveal the right one (practice only).
  const [picked, setPicked] = useState<{ chosen: number; correct: number } | null>(null);
  const [result, setResult] = useState<{ r: SetResult; outcome: Outcome } | null>(null);

  const startedAt = useRef(0);
  const mainEndedAt = useRef(0);
  const correctFirst = useRef(0);
  const wrongRef = useRef<NumberQuestion[]>([]);
  const missed = useRef<{ prompt: string; given: string; answer: string }[]>([]);
  const busy = useRef(false);

  const q = phase === "fix" ? wrong[fixIndex] : questions[index];

  const finish = useCallback(() => {
    const r: SetResult = {
      mode: exam ? "exam" : "practice",
      total: questions.length,
      correctFirstTime: correctFirst.current,
      durationMs: mainEndedAt.current - startedAt.current,
      secondsPerQuestion,
      ...(exam ? { answers: missed.current } : {}),
    };
    const outcome = record(r, wrongRef.current);
    setResult({ r, outcome });
    setPhase("done");
  }, [record, questions.length, secondsPerQuestion, exam]);

  const endMain = useCallback(() => {
    mainEndedAt.current = Date.now();
    if (!exam && wrongRef.current.length > 0) {
      setWrong([...wrongRef.current]);
      setFixIndex(0);
      setPhase("fix");
    } else finish();
  }, [finish, exam]);

  const clear = useCallback(() => {
    setInput("");
    setAttemptNo((n) => n + 1);
    setFlash(null);
    setPicked(null);
    setTimedOut(false);
    busy.current = false;
  }, []);

  const advanceMain = useCallback(() => {
    clear();
    if (index + 1 < questions.length) setIndex(index + 1);
    else endMain();
  }, [index, questions.length, endMain, clear]);

  /** A wrong first try in the main round (typed, tapped or out of time). */
  const markWrongMain = useCallback(
    (given: string) => {
      const cur = questions[index];
      wrongRef.current.push(cur);
      if (exam) {
        missed.current.push({ prompt: shownPrompt(cur.prompt), given: given || "—", answer: String(cur.answer) });
        setFlash("sent");
        setTimeout(advanceMain, 250);
        return;
      }
      // Practice: show the right answer and wait for the child to tap Next.
      setFlash("bad");
    },
    [questions, index, advanceMain, exam],
  );

  const submitValue = useCallback(
    (value: string) => {
      if (busy.current || !q || value === "") return;
      busy.current = true;
      const correct = typeof q.answer === "number" ? Number(value) === q.answer : value === q.answer;
      if (q.options && !exam) setPicked({ chosen: q.options.indexOf(value), correct: q.options.indexOf(String(q.answer)) });

      if (phase === "main") {
        if (correct) {
          correctFirst.current++;
          if (exam) {
            setFlash("sent");
            setTimeout(advanceMain, 250);
          } else {
            setFlash("good");
            setTimeout(advanceMain, q.options ? 800 : 600);
          }
        } else markWrongMain(value);
        return;
      }

      // Fix round (practice only): must get each one right before finishing.
      if (correct) {
        setFlash("good");
        setTimeout(() => {
          clear();
          if (fixIndex + 1 < wrong.length) setFixIndex(fixIndex + 1);
          else finish();
        }, 600);
      } else setFlash("bad");
    },
    [q, phase, advanceMain, markWrongMain, fixIndex, wrong.length, finish, exam, clear],
  );

  /** "Next" after a wrong answer (practice): main round moves on; fix round has another go. */
  const afterWrong = useCallback(() => {
    if (phase === "main") advanceMain();
    else clear();
  }, [phase, advanceMain, clear]);

  const submit = useCallback(() => submitValue(input), [submitValue, input]);
  const onPencilAnswer = useCallback(
    (text: string) => {
      setInput(text);
      submitValue(text);
    },
    [submitValue],
  );
  const onPencilUnavailable = useCallback(() => setMode("keypad"), []);

  // Instant right / wrong sound in practice (tap-answer questions get theirs from ChoiceGrid).
  useEffect(armSfx, []);
  useEffect(() => {
    if (exam || q?.options) return;
    if (flash === "good") playRight();
    else if (flash === "bad") playWrong();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the flash changes
  }, [flash]);

  // Enter = Next after a wrong answer (laptop / keyboard case).
  useEffect(() => {
    if (flash !== "bad") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") afterWrong();
    };
    const t = setTimeout(() => window.addEventListener("keydown", onKey), 300);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [flash, afterWrong]);

  // Tables Check rehearsal: each question has a hard time limit.
  useEffect(() => {
    if (!level.hardLimit || phase !== "main") return;
    const t = setTimeout(() => {
      if (busy.current) return;
      busy.current = true;
      setTimedOut(true);
      markWrongMain("");
    }, level.secondsPerQuestion * 1000);
    return () => clearTimeout(t);
  }, [level, phase, index, markWrongMain]);

  const onDigit = useCallback((d: string) => setInput((v) => (v.length < 5 ? v + d : v)), []);
  const onBack = useCallback(() => setInput((v) => v.slice(0, -1)), []);

  if (phase === "ready") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="text-muted font-bold text-lg">
          {level.id} · {exam ? "📝 Exam" : "Practice"}
        </p>
        <h1 className="text-5xl font-black">{level.title}</h1>
        <p className="text-xl font-semibold text-muted max-w-md">
          {questions.length} questions.{" "}
          {exam
            ? `This is the exam — no answers until the end. Get 9 out of 10 right${secondsPerQuestion > 0 ? " in time" : ""} to move up a level!`
            : level.hardLimit
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
      <Result
        child={child}
        {...result}
        exam={exam}
        renderText={renderText}
        nextTitle={nextTitle}
        prevTitle={prevTitle}
        allDoneText={allDoneText}
        againHref={againHref}
      />
    );

  const total = phase === "fix" ? wrong.length : questions.length;
  const pos = phase === "fix" ? fixIndex : index;
  const show = (text: string) => (renderText ? renderText(text) : text);
  const isBad = flash === "bad";
  const isGood = flash === "good";

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

      {exam && <p className="px-4 py-1 rounded-full bg-ink text-white text-lg font-extrabold">📝 Exam — answers at the end</p>}
      {phase === "fix" && <p className="text-xl font-extrabold text-warn">Let&apos;s fix these ones ✏️</p>}

      {level.hardLimit && phase === "main" && !flash && (
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
          isGood ? "border-good" : isBad ? "border-bad animate-shake" : "border-line"
        }`}
      >
        <p
          className={`px-4 text-center font-black tabular-nums ${
            q && isWordy(q.prompt) ? (q.prompt.length > 40 ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl") : "text-6xl sm:text-7xl"
          }`}
        >
          {q && show(shownPrompt(q.prompt))}
        </p>
        {/* Word questions can be read aloud (British voice). */}
        {q && isWordy(q.prompt) && <SpeakButton key={q.key} text={spokenMaths(q.prompt)} label="Hear it" />}
        {!q?.options && (
          <p
            className={`min-h-20 min-w-40 px-6 rounded-2xl border-4 border-dashed text-6xl font-black tabular-nums flex items-center justify-center ${
              isGood ? "text-good border-good" : isBad ? "text-bad border-bad line-through decoration-4" : "border-line"
            }`}
          >
            {input || " "}
          </p>
        )}
        {isGood && <p className="text-4xl font-black text-good animate-pop">✓ Correct!</p>}
      </div>

      {isBad && q ? (
        // Practice, wrong: big and clear, with the right answer, and wait for Next.
        <div className="w-full max-w-xl flex flex-col items-center gap-4 animate-pop">
          <p className="text-4xl font-black text-bad">{timedOut ? "⏰ Out of time!" : "✗ Not quite"}</p>
          <div className="w-full rounded-3xl bg-good/10 border-4 border-good py-5 px-4 flex flex-col items-center gap-1">
            <p className="text-lg font-bold text-muted">The right answer is</p>
            <p className="text-5xl sm:text-6xl font-black text-good tabular-nums text-center">
              {q.options ? show(String(q.answer)) : <>{show(shownPrompt(q.prompt))} {show(String(q.answer))}</>}
            </p>
          </div>
          <button
            onClick={afterWrong}
            className="h-20 px-14 rounded-3xl text-white text-3xl font-black shadow-[0_6px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none"
            style={{ background: child.color }}
          >
            {phase === "fix" ? "Try again" : "Next ▶"}
          </button>
        </div>
      ) : q?.options ? (
        <ChoiceGrid
          key={`${phase}-${phase === "fix" ? fixIndex : index}-${attemptNo}`}
          options={q.options}
          size="lg"
          renderOption={renderText}
          result={picked ?? undefined}
          disabled={flash !== null}
          onChoose={(option) => submitValue(option)}
        />
      ) : mode === "pencil" ? (
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
      {!level.hardLimit && !q?.options && !isBad && (
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

/** The exam link for a practice page ("/child/x/maths" → "/child/x/maths?exam=1"). */
export const examHref = (href: string) => `${href}?exam=1`;

function Result({
  child,
  r,
  outcome,
  exam,
  renderText,
  nextTitle,
  prevTitle,
  allDoneText,
  againHref,
}: {
  child: Child;
  r: SetResult;
  outcome: Outcome;
  exam: boolean;
  renderText?: (text: string) => ReactNode;
  nextTitle?: string;
  prevTitle?: string;
  allDoneText: string;
  againHref: string;
}) {
  const pct = Math.round(accuracy(r) * 100);
  const secs = Math.round(r.durationMs / 1000);
  const target = Math.round(timeTargetMs(r) / 1000);
  const timed = r.secondsPerQuestion > 0;
  const fast = !timed || r.durationMs <= timeTargetMs(r);
  const show = (text: string) => (renderText ? renderText(text) : text);

  const h = exam
    ? {
        levelPassed: { emoji: "🏆", title: "Exam passed!", text: nextTitle ? `You've moved up! Next: ${nextTitle}` : allDoneText },
        setPassed: { emoji: "⭐", title: "Well done!", text: "Great score." },
        setFailed: {
          emoji: "💪",
          title: "Not passed yet",
          text: pct < 90 ? "You need 9 out of 10. Practise the ones below, then try again." : "Right answers — now a little quicker. Practise, then try again.",
        },
        droppedBack: { emoji: "🔁", title: "Let's warm up", text: prevTitle ? `We'll practise ${prevTitle} again, then come back stronger.` : "Let's try again." },
      }[outcome]
    : {
        levelPassed: { emoji: "🏆", title: "Level passed!", text: nextTitle ? `Next up: ${nextTitle}` : allDoneText },
        setPassed: { emoji: "⭐", title: "Great practice!", text: "When you feel ready, take the exam to move up a level 📝" },
        setFailed: { emoji: "💪", title: "Good effort!", text: pct < 90 ? "Keep practising — aim for 9 out of 10 right first time." : "Nearly! Try to be a little bit quicker." },
        droppedBack: { emoji: "🔁", title: "Let's warm up", text: prevTitle ? `We'll practise ${prevTitle} again, then come back stronger.` : "Let's try again." },
      }[outcome];

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center animate-pop">
      <span className="text-8xl">{h.emoji}</span>
      <h1 className="text-5xl font-black">{h.title}</h1>
      <p className="text-xl font-semibold text-muted max-w-md">{h.text}</p>
      <div className="flex gap-4">
        <Stat label={exam ? "Score" : "Right first time"} value={`${r.correctFirstTime}/${r.total}`} good={pct >= 90} />
        {timed && <Stat label="Time" value={`${secs}s`} sub={`target ${target}s`} good={fast} />}
      </div>

      {exam && r.answers && r.answers.length > 0 && (
        <div className="w-full max-w-xl rounded-3xl bg-card border-2 border-line p-4 text-left">
          <p className="font-extrabold text-lg mb-2">The ones you missed</p>
          <ul className="flex flex-col divide-y divide-line">
            {r.answers.map((a, k) => (
              <li key={k} className="py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xl">
                <span className="font-bold flex-1 min-w-40">{show(a.prompt)}</span>
                <span className="text-bad line-through">{a.given === "—" ? "no answer" : show(a.given)}</span>
                <span className="font-black text-good">{show(a.answer)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-4 mt-2">
        <Link href={`/child/${child.id}`} className="h-16 px-8 rounded-2xl bg-card border-2 border-line text-xl font-extrabold flex items-center">
          Finish
        </Link>
        <a href={againHref} className="h-16 px-8 rounded-2xl text-white text-xl font-extrabold flex items-center" style={{ background: child.color }}>
          {exam ? "Practise ▶" : "Another set ▶"}
        </a>
        {!exam && outcome !== "droppedBack" && (
          <a href={examHref(againHref)} className="h-16 px-8 rounded-2xl bg-ink text-white text-xl font-extrabold flex items-center">
            Take the exam 📝
          </a>
        )}
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
