"use client";

// End-of-set screen for spelling, grammar and coding words — practice or exam.
// Exam: score, pass / not yet, then the questions missed with the right answers
// (only now, once the exam is over).

import Link from "next/link";
import { accuracy, type Outcome, type SetResult } from "@/lib/mastery";
import type { Child } from "@/lib/store";

interface Props {
  child: Child;
  r: SetResult;
  outcome: Outcome;
  exam: boolean;
  /** "Do you still remember?" words in this set (practice). */
  review?: { total: number; remembered: number };
  nextTitle?: string;
  allDoneText: string;
  /** The practice page; the exam is the same with ?exam=1. */
  practiceHref: string;
}

export default function SetResultScreen({ child, r, outcome, exam, review, nextTitle, allDoneText, practiceHref }: Props) {
  const pct = Math.round(accuracy(r) * 100);
  const target = Math.round((r.accuracyTarget ?? 0.9) * 100);

  const head = exam
    ? {
        levelPassed: { e: "🏆", t: "Exam passed!", s: nextTitle ? `You've moved up! Next: ${nextTitle}` : allDoneText },
        setPassed: { e: "⭐", t: "Well done!", s: "Great score." },
        setFailed: { e: "💪", t: "Not passed yet", s: `You need ${target}% to pass. Practise the ones below, then try again.` },
        droppedBack: { e: "🔁", t: "Let's warm up", s: "We'll go back a level, then come back stronger." },
      }[outcome]
    : {
        levelPassed: { e: "🏆", t: "Level passed!", s: nextTitle ? `Next up: ${nextTitle}` : allDoneText },
        setPassed: { e: "⭐", t: "Great practice!", s: "When you feel ready, take the exam to move up a level 📝" },
        setFailed: { e: "💪", t: "Good try!", s: "The ones you missed will come up again soon. Keep practising!" },
        droppedBack: { e: "🔁", t: "Let's warm up", s: "We'll go back a level, then come back stronger." },
      }[outcome];

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center animate-pop">
      <span className="text-8xl">{head.e}</span>
      <h1 className="text-5xl font-black">{head.t}</h1>
      <p className="text-xl font-semibold text-muted max-w-md">{head.s}</p>
      <div className={`rounded-2xl bg-card border-4 px-6 py-4 ${pct >= target ? "border-good" : "border-warn"}`}>
        <p className="text-4xl font-black tabular-nums">
          {r.correctFirstTime}/{r.total}
        </p>
        <p className="font-bold text-muted">{exam ? "exam score" : "right first time"}</p>
      </div>
      {!exam && review && review.total > 0 && (
        <p className="text-xl font-bold">
          🧠 Remembered {review.remembered} of {review.total} from before
          {review.remembered === review.total ? " — amazing memory!" : ""}
        </p>
      )}

      {exam && r.answers && r.answers.length > 0 && (
        <div className="w-full max-w-2xl rounded-3xl bg-card border-2 border-line p-4 text-left">
          <p className="font-extrabold text-lg mb-2">The ones you missed</p>
          <ul className="flex flex-col divide-y divide-line">
            {r.answers.map((a, k) => (
              <li key={k} className="py-3 flex flex-col gap-1">
                {a.prompt && <span className="text-muted font-semibold">{a.prompt}</span>}
                <span className="flex flex-wrap items-baseline gap-x-4 text-2xl">
                  <span className="text-bad">✗ <s>{a.given || "no answer"}</s></span>
                  <span className="font-black text-good">✓ {a.answer}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-4 mt-2">
        <Link href={`/child/${child.id}`} className="h-16 px-8 rounded-2xl bg-card border-2 border-line text-xl font-extrabold flex items-center">
          Finish
        </Link>
        <a href={practiceHref} className="h-16 px-8 rounded-2xl text-white text-xl font-extrabold flex items-center" style={{ background: child.color }}>
          {exam ? "Practise ▶" : "Another set ▶"}
        </a>
        {!exam && outcome !== "droppedBack" && (
          <a href={`${practiceHref}?exam=1`} className="h-16 px-8 rounded-2xl bg-ink text-white text-xl font-extrabold flex items-center">
            Take the exam 📝
          </a>
        )}
      </div>
    </main>
  );
}
