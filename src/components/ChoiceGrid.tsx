"use client";

import { useEffect } from "react";

interface Props {
  options: string[]; // 2-6 strings
  onChoose: (option: string, index: number) => void;
  disabled?: boolean;
  /** After answering: colour the chosen button (green/red) and reveal the correct one. */
  result?: { chosen: number; correct: number };
  size?: "md" | "lg"; // lg = phonics (huge text)
  /** One option per row, left-aligned, smaller text — for whole-sentence answers. */
  stack?: boolean;
}

export default function ChoiceGrid({ options, onChoose, disabled, result, size = "md", stack = false }: Props) {
  // Physical keyboard support for laptop testing: keys 1-6 choose that option.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (disabled || result) return;
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) onChoose(options[n - 1], n - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [options, onChoose, disabled, result]);

  const cols = stack
    ? "grid-cols-1"
    : options.length === 2 ? "grid-cols-2" : options.length === 3 ? "grid-cols-3" : options.length === 4 ? "grid-cols-2" : "grid-cols-3";

  const textSize = stack ? "text-2xl sm:text-3xl text-left px-6 py-4" : size === "lg" ? "text-5xl" : "text-3xl";

  const base = "min-h-[88px] px-3 rounded-2xl font-extrabold border-2 active:translate-y-1 active:shadow-none transition-all";

  // Colour classes are chosen exclusively (never bg-card together with bg-good),
  // because with both present the CSS order decides which wins.
  function colour(i: number): string {
    const plain = "text-ink bg-card border-line shadow-[0_4px_0_var(--line)]";
    if (!result) return `${plain} disabled:opacity-40`;
    if (i === result.correct) return "text-white bg-good border-good shadow-[0_4px_0_#15803d]";
    if (i === result.chosen) return "text-white bg-bad border-bad shadow-[0_4px_0_#b91c1c]";
    return `${plain} opacity-50`;
  }

  return (
    <div className={`grid ${cols} gap-3 w-full select-none`}>
      {options.map((option, i) => {
        const wrong = !!result && i === result.chosen && i !== result.correct;
        return (
          <button
            key={i}
            className={`${base} ${textSize} ${colour(i)} ${wrong ? "animate-shake" : ""}`}
            onClick={() => onChoose(option, i)}
            disabled={disabled || !!result}
            aria-label={option}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
