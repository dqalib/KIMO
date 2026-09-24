"use client";

// Apple Pencil test page — /dev/pencil (not linked from the app).
// Checks, on DQ's real iPad:
//  1. Scribble: does the iPad turn handwritten numbers in a text box into text, and how fast?
//     Three box variants, because the keyboard setting may change Scribble's behaviour.
//  2. InkPad: does our own writing canvas feel right (smooth, pressure, palm rejection)?
// Results can be copied and pasted back to Claude.

import Link from "next/link";
import { useRef, useState } from "react";
import InkPad, { type InkPadHandle, type InkStroke } from "@/components/InkPad";

const TARGETS = ["7", "24", "56", "81", "108", "42", "9", "63"];

type Variant = "text" | "numeric" | "none";
const VARIANTS: { id: Variant; label: string; note: string }[] = [
  { id: "text", label: "A · normal text box", note: "keyboard: normal" },
  { id: "numeric", label: "B · number box", note: "keyboard: numbers" },
  { id: "none", label: "C · no-keyboard box", note: "keyboard: hidden" },
];

interface Trial {
  variant: Variant;
  target: string;
  got: string;
  ms: number | null;
}

export default function PencilTestPage() {
  const [trials, setTrials] = useState<Trial[]>([]);
  const [copied, setCopied] = useState(false);

  const summary = VARIANTS.map((v) => {
    const t = trials.filter((x) => x.variant === v.id);
    const right = t.filter((x) => x.got === x.target).length;
    const times = t.map((x) => x.ms).filter((x): x is number => x !== null);
    const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
    return { ...v, tries: t.length, right, avg };
  });

  const report = [
    `KIMO pencil test — ${new Date().toLocaleString("en-GB")}`,
    `Device: ${typeof navigator !== "undefined" ? navigator.userAgent : ""}`,
    ...summary.map((s) => `${s.label}: ${s.right}/${s.tries} right${s.avg !== null ? `, avg ${s.avg} ms` : ""}`),
    ...trials.map((t) => `  ${t.variant} target ${t.target} → "${t.got}"${t.ms !== null ? ` (${t.ms} ms)` : ""}`),
  ].join("\n");

  return (
    <main className="flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col gap-8">
      <header className="flex items-center gap-4">
        <Link href="/" className="text-muted font-bold">
          ← Home
        </Link>
        <h1 className="text-3xl font-black">Apple Pencil test</h1>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-extrabold">1 · Scribble — write the number in each box</h2>
        <p className="text-muted">
          Use the Pencil. Write the number shown, then lift the Pencil and wait. Tap <b>Next</b> for a new number.
          Try each box 3–4 times. Your child can try too.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {VARIANTS.map((v) => (
            <ScribbleBox key={v.id} variant={v} onTrial={(t) => setTrials((xs) => [...xs, t])} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-extrabold">2 · Writing pad — does it feel right?</h2>
        <p className="text-muted">
          Write anything: numbers, letters, a column sum. Rest your hand on the screen as you would on paper — it
          shouldn&apos;t leave marks once the Pencil has touched the pad.
        </p>
        <PadTest />
      </section>

      <section className="flex flex-col gap-3 bg-card rounded-3xl border-2 border-line p-5">
        <h2 className="text-2xl font-extrabold">3 · Results</h2>
        <table className="text-left">
          <thead className="text-muted text-sm">
            <tr>
              <th className="py-1">Box</th>
              <th>Right</th>
              <th>Average time</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className="py-2 font-bold">{s.label}</td>
                <td>
                  {s.right}/{s.tries}
                </td>
                <td>{s.avg !== null ? `${(s.avg / 1000).toFixed(1)} s` : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          className="self-start h-12 px-5 rounded-xl bg-brand text-white font-bold"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(report);
              setCopied(true);
            } catch {
              setCopied(false);
              window.prompt("Copy this:", report);
            }
          }}
        >
          {copied ? "Copied ✓ — paste it to Claude" : "Copy results"}
        </button>
      </section>
    </main>
  );
}

function ScribbleBox({
  variant,
  onTrial,
}: {
  variant: { id: Variant; label: string; note: string };
  onTrial: (t: Trial) => void;
}) {
  const [i, setI] = useState(0);
  const [value, setValue] = useState("");
  const [last, setLast] = useState<Trial | null>(null);
  const penDownAt = useRef<number | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const target = TARGETS[(i + VARIANTS.findIndex((v) => v.id === variant.id) * 3) % TARGETS.length];

  function record(v: string) {
    clearTimeout(settle.current);
    // Scribble may insert characters one by one — wait briefly for it to settle.
    settle.current = setTimeout(() => {
      const t: Trial = {
        variant: variant.id,
        target,
        got: v.trim(),
        ms: penDownAt.current !== null ? Math.round(performance.now() - penDownAt.current) : null,
      };
      setLast(t);
      onTrial(t);
    }, 900);
  }

  const ok = last && last.got === last.target;

  return (
    <div className="bg-card rounded-3xl border-2 border-line p-4 flex flex-col gap-3">
      <div>
        <p className="font-extrabold">{variant.label}</p>
        <p className="text-sm text-muted">{variant.note}</p>
      </div>
      <p className="text-center text-5xl font-black">{target}</p>
      <div
        onPointerDownCapture={(e) => {
          if (e.pointerType === "pen" && penDownAt.current === null) penDownAt.current = performance.now();
        }}
      >
        <input
          className="w-full h-28 text-center text-6xl font-black rounded-2xl border-4 border-dashed border-line bg-bg"
          type="text"
          inputMode={variant.id}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            record(e.target.value);
          }}
          aria-label={`Write ${target}`}
        />
      </div>
      <p className={`min-h-6 text-center font-bold ${last ? (ok ? "text-good" : "text-bad") : "text-muted"}`}>
        {last ? `Read as “${last.got}”${last.ms !== null ? ` in ${(last.ms / 1000).toFixed(1)} s` : ""} ${ok ? "✓" : "✗"}` : "…"}
      </p>
      <button
        className="h-12 rounded-xl border-2 border-line font-bold"
        onClick={() => {
          clearTimeout(settle.current);
          setValue("");
          setLast(null);
          penDownAt.current = null;
          setI((n) => n + 1);
        }}
      >
        Next
      </button>
    </div>
  );
}

function PadTest() {
  const pad = useRef<InkPadHandle>(null);
  const [pen, setPen] = useState(false);
  const [info, setInfo] = useState({ strokes: 0, points: 0, minP: 1, maxP: 0 });

  function update(strokes: InkStroke[]) {
    const pts = strokes.flat();
    setInfo({
      strokes: strokes.length,
      points: pts.length,
      minP: pts.reduce((m, p) => Math.min(m, p.p), 1),
      maxP: pts.reduce((m, p) => Math.max(m, p.p), 0),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <InkPad
        ref={pad}
        className="w-full h-[420px] rounded-3xl bg-card border-2 border-line"
        onPenDetected={() => setPen(true)}
        onStrokeEnd={update}
        drawBackground={(ctx, w, h) => {
          // Faint writing lines, like an exercise book.
          ctx.strokeStyle = "#e5e1d8";
          ctx.lineWidth = 1;
          for (let y = 70; y < h; y += 70) {
            ctx.beginPath();
            ctx.moveTo(16, y);
            ctx.lineTo(w - 16, y);
            ctx.stroke();
          }
        }}
      />
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className={`font-bold ${pen ? "text-good" : "text-muted"}`}>
          {pen ? "✓ Pencil detected — palm rejection on" : "Pencil not detected yet"}
        </span>
        <span className="text-muted">
          {info.strokes} strokes · {info.points} points
          {info.points > 0 && ` · pressure ${info.minP.toFixed(2)}–${info.maxP.toFixed(2)}`}
        </span>
        <button
          className="ml-auto h-10 px-4 rounded-xl border-2 border-line font-bold"
          onClick={() => {
            pad.current?.clear();
            setInfo({ strokes: 0, points: 0, minP: 1, maxP: 0 });
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
