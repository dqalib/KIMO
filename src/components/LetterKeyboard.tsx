"use client";

// Big on-screen keyboard for spelling. Used instead of the iPad keyboard so
// there's no autocorrect, predictive text or spell-check giving answers away.

import { useEffect, useState } from "react";

interface Props {
  onKey: (ch: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  disabled?: boolean;
}

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

export default function LetterKeyboard({ onKey, onBack, onSubmit, disabled }: Props) {
  // ⇧ capitalises the next letter only (like a phone keyboard).
  const [shift, setShift] = useState(false);

  // Physical keyboard support (laptop / iPad keyboard case).
  useEffect(() => {
    function onDown(e: KeyboardEvent) {
      if (disabled || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[a-zA-Z'-]$/.test(e.key)) onKey(e.key);
      else if (e.key === "’") onKey("'");
      else if (e.key === "Backspace") onBack();
      else if (e.key === "Enter") onSubmit();
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onDown);
    return () => window.removeEventListener("keydown", onDown);
  }, [onKey, onBack, onSubmit, disabled]);

  const key =
    "h-16 sm:h-[4.5rem] flex-1 min-w-0 rounded-xl text-3xl font-extrabold bg-card border-2 border-line shadow-[0_4px_0_var(--line)] active:translate-y-1 active:shadow-none transition-transform disabled:opacity-40";

  function press(ch: string) {
    onKey(shift ? ch.toUpperCase() : ch);
    setShift(false);
  }

  return (
    <div className="w-full max-w-3xl flex flex-col gap-2 select-none">
      {ROWS.map((row, r) => (
        <div key={row} className="flex gap-1.5 sm:gap-2 justify-center" style={{ paddingInline: `${r * 4}%` }}>
          {row.split("").map((ch) => (
            <button key={ch} className={key} onClick={() => press(ch)} disabled={disabled} aria-label={ch}>
              {shift ? ch.toUpperCase() : ch}
            </button>
          ))}
        </div>
      ))}
      <div className="flex gap-1.5 sm:gap-2">
        <button
          className={`${key} ${shift ? "!bg-brand !text-white !border-brand" : ""}`}
          onClick={() => setShift(!shift)}
          disabled={disabled}
          aria-label="Capital letter"
          aria-pressed={shift}
        >
          ⇧
        </button>
        <button className={key} onClick={() => press("'")} disabled={disabled} aria-label="apostrophe">
          &apos;
        </button>
        <button className={key} onClick={() => press("-")} disabled={disabled} aria-label="hyphen">
          -
        </button>
        <button className={key} onClick={onBack} disabled={disabled} aria-label="Delete">
          ⌫
        </button>
        <button
          className="h-16 sm:h-[4.5rem] flex-[2] rounded-xl text-3xl font-extrabold text-white bg-good shadow-[0_4px_0_#15803d] active:translate-y-1 active:shadow-none transition-transform disabled:opacity-40"
          onClick={onSubmit}
          disabled={disabled}
          aria-label="Check spelling"
        >
          ✓
        </button>
      </div>
    </div>
  );
}
