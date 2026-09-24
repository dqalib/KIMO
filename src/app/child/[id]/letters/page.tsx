"use client";

// Handwriting practice: trace → trace a faint guide → write alone, one letter at a time.
// Each letter needs 3 correct in a row at a stage to move on. A session is 8 tries.

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import InkPad, { type InkPadHandle, type InkStroke } from "@/components/InkPad";
import {
  FAMILIES,
  TOLERANCE,
  checkLetter,
  layout,
  resample,
  strokeLength,
  type Letter,
  type Problem,
  type Pt,
} from "@/lib/letters";
import { currentLetter } from "@/lib/hw";
import {
  getState,
  HW_CORRECT_TO_ADVANCE,
  letterProgress,
  recordLetter,
  recordLetterSession,
  useAppState,
  type AppState,
  type Child,
} from "@/lib/store";

const TRIES = 8;

export default function LettersPage() {
  const { id } = useParams<{ id: string }>();
  const state = useAppState();
  if (!state) return null;
  const child = state.children.find((c) => c.id === id);
  if (!child) return null;
  return <Session child={child} initial={state} />;
}

type Feedback = { ok: true; text: string } | { ok: false; text: string } | null;

function Session({ child, initial }: { child: Child; initial: AppState }) {
  const state = useAppState() ?? initial;
  const [tries, setTries] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(0);
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  const levelAtStart = useRef(currentLetter(initial, child.id)?.family);

  const letter = currentLetter(state, child.id);
  const prog = letter ? letterProgress(state, child.id, letter.char) : null;
  const stage = (prog?.stage ?? 3) as 1 | 2 | 3;

  const finish = useCallback(
    (t: number, c: number, w: string[]) => {
      const fam = FAMILIES.find((f) => f.id === levelAtStart.current) ?? FAMILIES[0];
      const s = getState();
      const famDone = [...fam.letters].every((ch) => letterProgress(s, child.id, ch).stage === 4);
      recordLetterSession(child.id, fam.levelId, t, c, Date.now() - startedAt.current, w, famDone);
      setDone(true);
    },
    [child.id],
  );

  function onResult(ok: boolean, problem?: Problem) {
    if (!letter) return;
    const before = letterProgress(state, child.id, letter.char);
    const after = recordLetter(child.id, letter.char, ok);
    const t = tries + 1;
    const c = correct + (ok ? 1 : 0);
    const w = ok ? wrong : [...wrong, letter.char];
    setTries(t);
    setCorrect(c);
    setWrong(w);

    if (ok) {
      const moved = after.stage > before.stage;
      setFeedback({
        ok: true,
        text: after.stage === 4 && moved ? `You've learned “${letter.char}”! 🏆` : moved ? "Level up! ⭐" : "Brilliant!",
      });
    } else setFeedback({ ok: false, text: problemText(problem, letter) });

    setTimeout(() => {
      setFeedback(null);
      setRound((r) => r + 1);
      if (t >= TRIES || !currentLetter(getState(), child.id)) finish(t, c, w);
    }, ok ? 1100 : 1900);
  }

  if (done || !letter) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center animate-pop">
        <span className="text-8xl">{!letter ? "🏆" : correct >= tries * 0.75 ? "⭐" : "💪"}</span>
        <h1 className="text-5xl font-black">{!letter ? "Every letter learned!" : "Great writing!"}</h1>
        {tries > 0 && (
          <p className="text-xl font-semibold text-muted">
            {correct} out of {tries} letters just right
          </p>
        )}
        <div className="flex gap-4">
          <Link href={`/child/${child.id}`} className="h-16 px-8 rounded-2xl bg-card border-2 border-line text-xl font-extrabold flex items-center">
            Finish
          </Link>
          {letter && (
            <a href={`/child/${child.id}/letters`} className="h-16 px-8 rounded-2xl text-white text-xl font-extrabold flex items-center" style={{ background: child.color }}>
              More letters ▶
            </a>
          )}
        </div>
      </main>
    );
  }

  const stageLabel = { 1: "Trace the letter", 2: "Trace the faint letter", 3: "Now write it on your own" }[stage];
  const fam = FAMILIES.find((f) => f.id === letter.family)!;

  return (
    <main className="flex-1 flex flex-col gap-4 p-4 sm:p-6 max-w-4xl mx-auto w-full">
      <header className="flex items-center gap-3">
        <Link href={`/child/${child.id}`} className="text-muted font-bold" aria-label="Stop">
          ✕
        </Link>
        <div className="flex-1 flex gap-1">
          {Array.from({ length: TRIES }, (_, i) => (
            <span key={i} className="h-3 flex-1 rounded-full" style={{ background: i < tries ? child.color : "var(--line)" }} />
          ))}
        </div>
      </header>

      <div className="flex items-end gap-4">
        <div className="w-20 h-20 rounded-2xl bg-card border-2 border-line flex items-center justify-center text-6xl font-black" aria-hidden>
          {letter.char}
        </div>
        <div className="flex-1">
          <p className="text-muted font-bold">
            {fam.name} · {fam.hint}
          </p>
          <h1 className="text-3xl font-black">{stageLabel}</h1>
        </div>
        <Stars filled={prog!.streak} />
      </div>

      <LetterPad key={`${letter.char}-${stage}-${round}`} letter={letter} stage={stage} color={child.color} feedback={feedback} onResult={onResult} />
    </main>
  );
}

function Stars({ filled }: { filled: number }) {
  return (
    <div className="flex gap-1 text-3xl" aria-label={`${filled} of ${HW_CORRECT_TO_ADVANCE} correct in a row`}>
      {Array.from({ length: HW_CORRECT_TO_ADVANCE }, (_, i) => (
        <span key={i} className={i < filled ? "" : "grayscale opacity-25"}>
          ⭐
        </span>
      ))}
    </div>
  );
}

function problemText(p: Problem | undefined, l: Letter): string {
  switch (p) {
    case "start":
      return "Start at the green dot 🟢";
    case "path":
      return "Nearly! Try to stay on the letter";
    case "unfinished":
      return "Keep going all the way to the end";
    case "strokes":
      return l.strokes.length > 1
        ? l.char === "i" || l.char === "j"
          ? "Don't forget the dot!"
          : "Don't forget the line across!"
        : "Try it without lifting your pencil";
    default:
      return "Let's try again";
  }
}

function LetterPad({
  letter,
  stage,
  color,
  feedback,
  onResult,
}: {
  letter: Letter;
  stage: 1 | 2 | 3;
  color: string;
  feedback: Feedback;
  onResult: (ok: boolean, problem?: Problem) => void;
}) {
  const pad = useRef<InkPadHandle>(null);
  const size = useRef({ w: 0, h: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [checked, setChecked] = useState(false);

  const check = useCallback(() => {
    if (checked) return;
    const strokes = pad.current?.strokes() ?? [];
    if (!strokes.length) return;
    const L = layout(letter, size.current.w, size.current.h);
    const units = strokes.map((s: InkStroke) => s.map((p): Pt => L.toUnits(p.x, p.y)));
    const r = checkLetter(letter, units, TOLERANCE[stage]);
    setChecked(true);
    onResult(r.ok, r.problem);
  }, [checked, letter, stage, onResult]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const drawBackground = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      size.current = { w, h };
      const L = layout(letter, w, h);
      const lineAt = (y: number, style: string, dash: number[]) => {
        const [, py] = L.toPx([0, y]);
        ctx.save();
        ctx.strokeStyle = style;
        ctx.lineWidth = 2;
        ctx.setLineDash(dash);
        ctx.beginPath();
        ctx.moveTo(16, py);
        ctx.lineTo(w - 16, py);
        ctx.stroke();
        ctx.restore();
      };
      lineAt(-1, "#d8d3c8", [4, 8]); // top of tall letters
      lineAt(0, "#c9c3b6", [12, 8]); // top of small letters
      lineAt(1, "#8a8478", []); // baseline
      lineAt(1.7, "#d8d3c8", [4, 8]); // bottom of tails

      if (stage < 3) {
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = stage === 1 ? "#d9d4ca" : "#ece8e0";
        ctx.lineWidth = L.scale * (stage === 1 ? 0.26 : 0.16);
        for (const s of letter.strokes) {
          ctx.beginPath();
          s.forEach((p, i) => {
            const [x, y] = L.toPx(p);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        }
        ctx.restore();
      }

      // Start dots (numbered if more than one stroke) and a direction arrow on stage 1.
      letter.strokes.forEach((s, i) => {
        if (stage === 3 && i > 0) return; // writing alone: only show where to begin
        const [x, y] = L.toPx(s[0]);
        ctx.save();
        ctx.fillStyle = "#16a34a";
        ctx.beginPath();
        ctx.arc(x, y, 13, 0, Math.PI * 2);
        ctx.fill();
        if (letter.strokes.length > 1) {
          ctx.fillStyle = "#fff";
          ctx.font = "bold 16px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(i + 1), x, y + 1);
        }
        if (stage === 1 && strokeLength(s) >= 0.3) {
          const r = resample(s, 0.05);
          const k = Math.min(r.length - 3, Math.max(2, Math.round(r.length * 0.15)));
          const [ax, ay] = L.toPx(r[k + 2]);
          const [bx, by] = L.toPx(r[k]);
          const ang = Math.atan2(ay - by, ax - bx);
          ctx.strokeStyle = "#16a34a";
          ctx.fillStyle = "#16a34a";
          ctx.lineWidth = 4;
          // arrow placed beside the path so it doesn't block tracing
          const off = 26;
          const nx = -Math.sin(ang) * off;
          const ny = Math.cos(ang) * off;
          const sx = bx + nx;
          const sy = by + ny;
          const ex = sx + Math.cos(ang) * 30;
          const ey = sy + Math.sin(ang) * 30;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex - Math.cos(ang - 0.5) * 12, ey - Math.sin(ang - 0.5) * 12);
          ctx.lineTo(ex - Math.cos(ang + 0.5) * 12, ey - Math.sin(ang + 0.5) * 12);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      });
    },
    [letter, stage],
  );

  function onStrokeEnd(strokes: InkStroke[]) {
    clearTimeout(timer.current);
    // Check automatically once enough strokes are down (short pause allows for a dot or cross).
    if (strokes.length >= letter.strokes.length) timer.current = setTimeout(check, 650);
  }

  const border = feedback ? (feedback.ok ? "border-good" : "border-bad animate-shake") : "border-line";

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <InkPad
          ref={pad}
          className={`w-full h-[min(62vh,560px)] rounded-3xl bg-card border-4 ${border}`}
          ink={color}
          width={7}
          drawBackground={drawBackground}
          onStrokeEnd={onStrokeEnd}
        />
        {feedback && (
          <div
            className={`absolute inset-x-0 bottom-4 mx-auto w-fit px-6 py-3 rounded-2xl text-2xl font-black text-white animate-pop ${
              feedback.ok ? "bg-good" : "bg-bad"
            }`}
          >
            {feedback.text}
          </div>
        )}
      </div>
      <div className="flex gap-3">
        <button
          className="h-14 px-6 rounded-2xl bg-card border-2 border-line text-xl font-extrabold"
          disabled={checked}
          onClick={() => {
            clearTimeout(timer.current);
            pad.current?.clear();
          }}
        >
          ↺ Start again
        </button>
        <button
          className="ml-auto h-14 px-8 rounded-2xl text-white text-xl font-extrabold disabled:opacity-40"
          style={{ background: color }}
          disabled={checked}
          onClick={check}
        >
          Done ✓
        </button>
      </div>
    </div>
  );
}
