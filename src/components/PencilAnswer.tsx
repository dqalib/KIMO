"use client";

// Write the answer with Apple Pencil. After the Pencil lifts and rests for a moment,
// the number is read on the iPad. If the reader is sure, the answer is submitted
// straight away; if not, the child is asked "Is this 56?" — so a misreading never
// counts against them.

import { useCallback, useEffect, useRef, useState } from "react";
import InkPad, { type InkPadHandle, type InkStroke } from "./InkPad";
import { loadDigitModel, readNumber, type DigitModel, type Strokes } from "@/lib/digits";

const PAUSE_MS = 700; // wait after the last stroke before reading
const SURE = 0.9; // lowest per-digit confidence to submit without asking
const UNREADABLE = 0.5; // below this, don't guess — ask them to write it again

interface Props {
  onAnswer: (text: string) => void;
  /** Shows what was read in the answer box while writing. */
  onReading?: (text: string) => void;
  disabled?: boolean;
  color: string;
  maxDigits?: number;
  /** Called if the reader can't load — the page should fall back to the keypad. */
  onUnavailable?: () => void;
}

export default function PencilAnswer({ onAnswer, onReading, disabled, color, maxDigits = 3, onUnavailable }: Props) {
  const pad = useRef<InkPadHandle>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [model, setModel] = useState<DigitModel | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [unreadable, setUnreadable] = useState(false);

  useEffect(() => {
    let live = true;
    loadDigitModel()
      .then((m) => live && setModel(m))
      .catch(() => live && onUnavailable?.());
    return () => {
      live = false;
      clearTimeout(timer.current);
    };
  }, [onUnavailable]);

  const clear = useCallback(() => {
    clearTimeout(timer.current);
    pad.current?.clear();
    setConfirm(null);
    onReading?.("");
  }, [onReading]);

  const read = useCallback(() => {
    if (!model || disabled) return;
    const strokes: Strokes = (pad.current?.strokes() ?? []).map((s: InkStroke) => s.map((p) => [p.x, p.y] as [number, number]));
    if (!strokes.length) return;
    const r = readNumber(model, strokes);
    if (!r.text) return;
    const text = r.text.slice(0, maxDigits);
    if (r.confidence < UNREADABLE || r.text.length > maxDigits) {
      setUnreadable(true);
      setTimeout(() => {
        pad.current?.clear();
        setUnreadable(false);
      }, 1400);
      return;
    }
    onReading?.(text);
    if (r.confidence >= SURE) {
      setTimeout(() => onAnswer(text), 200); // let the child see what was read
    } else setConfirm(text);
  }, [model, disabled, maxDigits, onAnswer, onReading]);

  function onStrokeEnd() {
    clearTimeout(timer.current);
    setConfirm(null);
    setUnreadable(false);
    timer.current = setTimeout(read, PAUSE_MS);
  }

  return (
    <div className="w-full max-w-xl flex flex-col gap-3">
      <div className="relative">
        <InkPad
          ref={pad}
          className={`w-full h-48 rounded-3xl bg-card border-4 border-dashed ${disabled ? "opacity-60" : ""}`}
          ink={color}
          width={6}
          onStrokeEnd={onStrokeEnd}
          drawBackground={(ctx, w, h) => {
            ctx.strokeStyle = "#d8d3c8";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(24, h - 34);
            ctx.lineTo(w - 24, h - 34);
            ctx.stroke();
          }}
        />
        {!model && (
          <p className="absolute inset-0 flex items-center justify-center text-muted font-bold">Getting the pencil ready…</p>
        )}
        {unreadable && (
          <p className="absolute inset-x-0 bottom-3 mx-auto w-fit px-4 py-2 rounded-xl bg-warn text-white font-extrabold animate-pop">
            I couldn&apos;t read that — try again
          </p>
        )}
        {model && !confirm && !unreadable && (
          <p className="pointer-events-none absolute left-5 top-3 text-sm font-bold text-muted">✏️ Write your answer here</p>
        )}
      </div>

      {confirm ? (
        <div className="flex items-center gap-3 animate-pop">
          <p className="text-2xl font-extrabold">
            Is it <span className="text-4xl font-black tabular-nums">{confirm}</span>?
          </p>
          <button
            className="ml-auto h-16 px-8 rounded-2xl text-white text-2xl font-extrabold"
            style={{ background: "var(--good)" }}
            onClick={() => {
              const t = confirm;
              setConfirm(null);
              onAnswer(t);
            }}
          >
            ✓ Yes
          </button>
          <button className="h-16 px-6 rounded-2xl bg-card border-2 border-line text-xl font-extrabold" onClick={clear}>
            ✎ Rewrite
          </button>
        </div>
      ) : (
        <div className="flex">
          <button className="h-12 px-5 rounded-xl bg-card border-2 border-line font-bold" onClick={clear} disabled={disabled}>
            ↺ Clear
          </button>
        </div>
      )}
    </div>
  );
}
