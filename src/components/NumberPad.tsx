"use client";

import { useEffect } from "react";

interface Props {
  onDigit: (d: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  disabled?: boolean;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export default function NumberPad({ onDigit, onBack, onSubmit, submitLabel = "✓", disabled }: Props) {
  // Physical keyboard support (laptop / iPad keyboard case).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (disabled) return;
      if (/^[0-9]$/.test(e.key)) onDigit(e.key);
      else if (e.key === "Backspace") onBack();
      else if (e.key === "Enter") onSubmit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDigit, onBack, onSubmit, disabled]);

  const btn =
    "h-20 rounded-2xl text-4xl font-extrabold bg-card border-2 border-line shadow-[0_4px_0_var(--line)] active:translate-y-1 active:shadow-none transition-transform disabled:opacity-40";

  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-sm select-none">
      {KEYS.map((k) => (
        <button key={k} className={btn} onClick={() => onDigit(k)} disabled={disabled} aria-label={k}>
          {k}
        </button>
      ))}
      <button className={btn} onClick={onBack} disabled={disabled} aria-label="Delete">
        ⌫
      </button>
      <button className={btn} onClick={() => onDigit("0")} disabled={disabled} aria-label="0">
        0
      </button>
      <button
        className="h-20 rounded-2xl text-4xl font-extrabold text-white bg-good shadow-[0_4px_0_#15803d] active:translate-y-1 active:shadow-none transition-transform disabled:opacity-40"
        onClick={onSubmit}
        disabled={disabled}
        aria-label="Check answer"
      >
        {submitLabel}
      </button>
    </div>
  );
}
