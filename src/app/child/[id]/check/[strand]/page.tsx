"use client";

// Placement check: the first time a child opens times tables, adding &
// taking away, spelling or grammar, a short quiz finds their starting level
// (see src/lib/placement.ts). Every answer is marked straight away (right, or
// wrong with the right answer shown); the missed ones are listed again at the end.

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ChoiceGrid from "@/components/ChoiceGrid";
import FractionText, { sayFractions } from "@/components/FractionText";
import LetterKeyboard from "@/components/LetterKeyboard";
import NumberPad from "@/components/NumberPad";
import SpeakButton from "@/components/SpeakButton";
import { AS_LEVELS, defaultASStart, generateASSet, getASLevel } from "@/lib/as";
import { FR_LEVELS, defaultFRStart, generateFRSet, getFRLevel } from "@/lib/fr";
import { MT_TIME_LEVELS, defaultMTTimeStart, generateTimeSet } from "@/lib/mt-time";
import { timeToNumberQuestion } from "@/lib/time-questions";
import { GP_LEVELS, defaultGpStart, generateGpSet, getGpLevel, spokenGp } from "@/lib/grammar";
import { NP_LEVELS, defaultNPStart, generateNPSet, getNPLevel } from "@/lib/np";
import { PER_LEVEL, recordRound, startPlacement, type PlacementState } from "@/lib/placement";
import { armSfx, playRight, playWrong } from "@/lib/sfx";
import { speak } from "@/lib/speech";
import { SP_LEVELS, defaultSpStart, generateSpSet, getSpLevel, isCorrectSpelling, spokenPrompt } from "@/lib/spelling";
import { finishPlacement, useAppState, type Child, type PlacementStrand } from "@/lib/store";
import { TT_LEVELS, defaultStartLevel, generateSet, getLevel } from "@/lib/tt";

type CheckQuestion =
  | { kind: "number"; prompt: string; answer: number }
  | {
      kind: "choice";
      prompt: string;
      sentence?: string;
      say: string;
      options: string[];
      answer: number;
      stack: boolean;
    }
  | { kind: "spell"; say: string; word: string };

interface StrandCheck {
  name: string;
  path: string; // practice page under /child/[id]/
  levels: { id: string; title: string }[];
  start: (schoolYear: number) => string;
  questions: (levelId: string) => CheckQuestion[];
}

function pick<T>(xs: T[], n: number): T[] {
  return xs
    .map((x) => ({ x, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .slice(0, n)
    .map((y) => y.x);
}

const CHECKS: Partial<Record<PlacementStrand, StrandCheck>> = {
  tt: {
    name: "Times tables",
    path: "practice",
    levels: TT_LEVELS,
    start: defaultStartLevel,
    questions: (id) =>
      pick(generateSet(getLevel(id)!, {}), PER_LEVEL).map((q) => ({
        kind: "number",
        prompt: q.prompt,
        answer: q.answer,
      })),
  },
  as: {
    name: "Adding & taking away",
    path: "maths",
    levels: AS_LEVELS,
    start: defaultASStart,
    questions: (id) =>
      pick(generateASSet(getASLevel(id)!), PER_LEVEL).map((q) => ({
        kind: "number",
        prompt: q.text,
        answer: q.answer,
      })),
  },
  np: {
    name: "Numbers",
    path: "numbers",
    levels: NP_LEVELS,
    start: defaultNPStart,
    questions: (id) =>
      pick(generateNPSet(getNPLevel(id)!), PER_LEVEL).map((q) =>
        q.options
          ? {
              kind: "choice",
              prompt: q.text,
              say: q.text,
              options: q.options,
              answer: q.options.indexOf(String(q.answer)),
              stack: false,
            }
          : { kind: "number", prompt: q.text, answer: Number(q.answer) },
      ),
  },
  fr: {
    name: "Fractions",
    path: "fractions",
    levels: FR_LEVELS,
    start: defaultFRStart,
    questions: (id) =>
      pick(generateFRSet(getFRLevel(id)!), PER_LEVEL).map((q) =>
        q.options
          ? {
              kind: "choice",
              prompt: q.text,
              say: sayFractions(q.text),
              options: q.options,
              answer: q.options.indexOf(String(q.answer)),
              stack: false,
            }
          : { kind: "number", prompt: q.text, answer: Number(q.answer) },
      ),
  },
  mt: {
    name: "Telling the time",
    path: "time",
    levels: MT_TIME_LEVELS,
    start: defaultMTTimeStart,
    questions: (id) =>
      pick(generateTimeSet(id).map(timeToNumberQuestion), PER_LEVEL).map((q) =>
        q.options
          ? {
              kind: "choice",
              prompt: q.prompt,
              say: sayFractions(q.prompt),
              options: q.options,
              answer: q.options.indexOf(String(q.answer)),
              stack: false,
            }
          : { kind: "number", prompt: q.prompt, answer: Number(q.answer) },
      ),
  },
  sp: {
    name: "Spelling",
    path: "spelling",
    levels: SP_LEVELS,
    start: defaultSpStart,
    questions: (id) =>
      generateSpSet(getSpLevel(id)!)
        .slice(0, PER_LEVEL)
        .map((w) => ({ kind: "spell", say: spokenPrompt(w), word: w.word })),
  },
  gp: {
    name: "Grammar",
    path: "grammar",
    levels: GP_LEVELS,
    start: defaultGpStart,
    questions: (id) =>
      generateGpSet(getGpLevel(id)!)
        .slice(0, PER_LEVEL)
        .map((q) => ({
          kind: "choice",
          prompt: q.prompt,
          sentence: q.sentence,
          say: spokenGp(q),
          options: q.options,
          answer: q.answer,
          stack: q.style === "pick-sentence",
        })),
  },
};

export default function CheckPage() {
  const { id, strand } = useParams<{ id: string; strand: string }>();
  const state = useAppState();
  if (!state) return null;
  const child = state.children.find((c) => c.id === id);
  const check = CHECKS[strand as PlacementStrand];
  if (!child || !check) return null;
  return <Check child={child} strand={strand as PlacementStrand} check={check} />;
}

function Check({ child, strand, check }: { child: Child; strand: PlacementStrand; check: StrandCheck }) {
  const [started, setStarted] = useState(false);
  const [plan, setPlan] = useState<PlacementState>(() =>
    startPlacement(
      check.levels.map((l) => l.id),
      check.start(child.schoolYear),
    ),
  );
  const [questions, setQuestions] = useState<CheckQuestion[]>(() => check.questions(plan.levels[plan.current]));
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const [input, setInput] = useState("");
  const [asked, setAsked] = useState(0);
  const [missed, setMissed] = useState<{ prompt: string; given: string; answer: string }[]>([]);

  const q = questions[i];

  const proceed = useCallback(
    (ok: boolean, given: string) => {
      const addMissed = (m: { prompt: string; given: string; answer: string }) => setMissed((xs) => [...xs, m]);
      if (!ok && q) {
        if (q.kind === "number")
          addMissed({
            prompt: q.prompt.includes("?") || /[A-Za-z]{2,}/.test(q.prompt) ? q.prompt : `${q.prompt} =`,
            given,
            answer: String(q.answer),
          });
        else if (q.kind === "choice")
          addMissed({
            prompt: [q.prompt, q.sentence].filter(Boolean).join(" — "),
            given,
            answer: q.options[q.answer],
          });
        else addMissed({ prompt: "Spelling", given, answer: q.word });
      }
      const nowRight = right + (ok ? 1 : 0);
      setInput("");
      setAsked((n) => n + 1);
      if (i + 1 < questions.length) {
        setRight(nowRight);
        setI(i + 1);
        return;
      }
      const next = recordRound(plan, nowRight);
      setPlan(next);
      setRight(0);
      setI(0);
      if (next.result) {
        finishPlacement(strand, child.id, next.result);
        return;
      }
      const qs = check.questions(next.levels[next.current]);
      setQuestions(qs);
      // Keep audio flowing on iPad: speak inside the tap that moves on.
      if (qs[0]?.kind === "spell") void speak(qs[0].say);
    },
    [right, i, questions.length, plan, strand, child.id, check, q],
  );

  // Mark straight away: right → "Correct!" then on; wrong → show the right answer and wait for Next.
  const [fb, setFb] = useState<{
    ok: boolean;
    given: string;
    right: string;
    chosen?: number;
  } | null>(null);
  useEffect(armSfx, []);
  const answer = useCallback(
    (ok: boolean, given: string, chosen?: number) => {
      if (fb || !q) return;
      const rightText = q.kind === "number" ? String(q.answer) : q.kind === "choice" ? q.options[q.answer] : q.word;
      setFb({ ok, given, right: rightText, chosen });
      if (q.kind !== "choice") (ok ? playRight : playWrong)(); // ChoiceGrid plays its own
      if (ok)
        setTimeout(() => {
          setFb(null);
          proceed(true, given);
        }, 800);
    },
    [fb, q, proceed],
  );
  const next = useCallback(() => {
    if (!fb) return;
    const given = fb.given;
    setFb(null);
    proceed(false, given);
  }, [fb, proceed]);

  const submitNumber = useCallback(() => {
    if (!q || q.kind !== "number" || input === "") return;
    answer(Number(input) === q.answer, input);
  }, [q, input, answer]);
  const submitSpelling = useCallback(() => {
    if (!q || q.kind !== "spell" || !input.trim()) return;
    answer(isCorrectSpelling(input, q.word), input.trim());
  }, [q, input, answer]);
  const onDigit = useCallback((d: string) => setInput((v) => (v.length < 5 ? v + d : v)), []);
  const onKey = useCallback((ch: string) => setInput((v) => (v.length < 16 ? v + ch : v)), []);
  const onBack = useCallback(() => setInput((v) => v.slice(0, -1)), []);

  if (!started) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center">
        <span className="text-8xl">🧭</span>
        <p className="text-muted font-bold text-lg">{check.name}</p>
        <h1 className="text-5xl font-black max-w-2xl">Starting check: let&apos;s find your level!</h1>
        <p className="text-xl font-semibold text-muted max-w-md">
          This happens once. A few questions, getting a bit harder — just try your best, it&apos;s fine not to know some. There&apos;s no timer. You&apos;ll see
          if each answer is right straight away.
        </p>
        <button
          onClick={() => {
            if (q?.kind === "spell") void speak(q.say);
            setStarted(true);
          }}
          className="h-20 px-16 rounded-3xl text-white text-3xl font-black shadow-[0_6px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none"
          style={{ background: child.color }}
        >
          Start 🚀
        </button>
        <Link href={`/child/${child.id}`} className="text-muted underline">
          Not now
        </Link>
      </main>
    );
  }

  if (plan.result) {
    const lvl = check.levels.find((l) => l.id === plan.result);
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center animate-pop">
        <span className="text-8xl">🎉</span>
        <h1 className="text-5xl font-black">All done — well done!</h1>
        <p className="text-xl font-semibold text-muted max-w-md">You&apos;ll start {check.name.toLowerCase()} at</p>
        <p className="text-3xl font-black">
          {lvl?.id} · {lvl?.title}
        </p>
        {missed.length > 0 && (
          <div className="w-full max-w-xl rounded-3xl bg-card border-2 border-line p-4 text-left">
            <p className="font-extrabold text-lg mb-2">The ones you missed</p>
            <ul className="flex flex-col divide-y divide-line">
              {missed.map((m, k) => (
                <li key={k} className="py-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xl">
                  <span className="font-bold flex-1 min-w-40">
                    <FractionText text={m.prompt} />
                  </span>
                  <span className="text-bad">
                    ✗ <s>{m.given ? <FractionText text={m.given} /> : "no answer"}</s>
                  </span>
                  <span className="font-black text-good">
                    ✓ <FractionText text={m.answer} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex gap-4 mt-2">
          <Link href={`/child/${child.id}`} className="h-16 px-8 rounded-2xl bg-card border-2 border-line text-xl font-extrabold flex items-center">
            Later
          </Link>
          <a
            href={`/child/${child.id}/${check.path}`}
            className="h-16 px-8 rounded-2xl text-white text-xl font-extrabold flex items-center"
            style={{ background: child.color }}
          >
            Start practising ▶
          </a>
        </div>
      </main>
    );
  }

  if (!q) return null;

  return (
    <main className="flex-1 flex flex-col items-center gap-6 p-4 sm:p-6 max-w-3xl mx-auto w-full">
      <header className="w-full flex items-center gap-3">
        <Link href={`/child/${child.id}`} className="text-muted font-bold" aria-label="Stop">
          ✕
        </Link>
        <p className="font-bold text-muted">
          {check.name} · starting check · question {asked + 1}
        </p>
      </header>
      <p className="px-4 py-1 rounded-full bg-ink text-white text-lg font-extrabold">🧭 Starting check</p>

      <div key={`${plan.current}-${i}`} className="w-full flex flex-col items-center gap-6 animate-pop">
        {q.kind === "number" && (
          <>
            <div
              className={`w-full max-w-xl rounded-3xl bg-card border-4 py-10 flex flex-col items-center gap-4 ${
                fb ? (fb.ok ? "border-good" : "border-bad animate-shake") : "border-line"
              }`}
            >
              <p className={`px-4 text-center font-black tabular-nums ${/[A-Za-z]{2,}/.test(q.prompt) ? "text-4xl" : "text-6xl sm:text-7xl"}`}>
                <FractionText text={q.prompt.includes("?") || /[A-Za-z]{2,}/.test(q.prompt) ? q.prompt : `${q.prompt} =`} />
              </p>
              <p
                className={`min-h-20 min-w-40 px-6 rounded-2xl border-4 border-dashed text-6xl font-black tabular-nums flex items-center justify-center ${
                  fb ? (fb.ok ? "border-good text-good" : "border-bad text-bad line-through decoration-4") : "border-line"
                }`}
              >
                {input || " "}
              </p>
            </div>
            {!fb && <NumberPad onDigit={onDigit} onBack={onBack} onSubmit={submitNumber} submitLabel="✓" />}
          </>
        )}

        {q.kind === "choice" && (
          <>
            <SpeakButton text={q.say} label="Hear it" />
            <h1 className="text-3xl font-black text-center">
              <FractionText text={q.prompt} />
            </h1>
            {q.sentence && <p className="text-4xl font-extrabold text-center">{q.sentence.replace("___", "____")}</p>}
            <ChoiceGrid
              options={q.options}
              stack={q.stack}
              renderOption={(o) => <FractionText text={o} />}
              result={fb?.chosen !== undefined ? { chosen: fb.chosen, correct: q.answer } : undefined}
              onChoose={(o, k) => answer(k === q.answer, o, k)}
            />
          </>
        )}

        {q.kind === "spell" && (
          <>
            <SpeakButton text={q.say} label="Hear it again" size="lg" />
            <div
              className={`w-full max-w-xl min-h-24 rounded-3xl border-4 bg-card flex items-center justify-center px-4 text-6xl font-extrabold tracking-wide ${
                fb ? (fb.ok ? "border-good text-good" : "border-bad text-bad") : "border-brand"
              }`}
            >
              {input || <span className="text-line">…</span>}
            </div>
            {!fb && <LetterKeyboard onKey={onKey} onBack={onBack} onSubmit={submitSpelling} />}
          </>
        )}

        {fb?.ok && <p className="text-4xl font-black text-good animate-pop">✓ Correct!</p>}
        {fb && !fb.ok && (
          <div className="w-full max-w-xl flex flex-col items-center gap-4 animate-pop">
            <p className="text-4xl font-black text-bad">✗ Not quite</p>
            <div className="w-full rounded-3xl bg-good/10 border-4 border-good py-5 px-4 flex flex-col items-center gap-1">
              <p className="text-lg font-bold text-muted">The right answer is</p>
              <p className="text-5xl font-black text-good text-center">
                <FractionText text={fb.right} />
              </p>
            </div>
            <button
              onClick={next}
              className="h-20 px-14 rounded-3xl text-white text-3xl font-black shadow-[0_6px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none"
              style={{ background: child.color }}
            >
              Next ▶
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
