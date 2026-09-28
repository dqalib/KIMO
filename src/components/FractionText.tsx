// Draws "3/4" in a question as a proper stacked fraction (3 over 4), the way
// children see fractions at school. "?" can be the top or bottom: "?/4".

import type { ReactNode } from "react";

const FRACTION = /(\d+|\?)\/(\d+|\?)/g;

export function Fraction({ top, bottom }: { top: string; bottom: string }) {
  return (
    <span className="inline-flex flex-col items-center align-middle leading-none mx-[0.12em] text-[0.8em]" aria-label={`${top} over ${bottom}`}>
      <span className="px-[0.1em]">{top}</span>
      <span className="self-stretch border-t-[0.08em] border-current my-[0.06em]" />
      <span className="px-[0.1em]">{bottom}</span>
    </span>
  );
}

export default function FractionText({ text }: { text: string }): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(FRACTION)) {
    if (m.index! > last) parts.push(text.slice(last, m.index));
    parts.push(<Fraction key={m.index} top={m[1]} bottom={m[2]} />);
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

const ORD: Record<number, string> = { 2: "half", 3: "third", 4: "quarter", 5: "fifth", 6: "sixth", 7: "seventh", 8: "eighth", 9: "ninth", 10: "tenth", 12: "twelfth", 20: "twentieth", 25: "twenty-fifth", 50: "fiftieth", 100: "hundredth" };

/** Words for reading a question aloud: "3/4 of 8 = ?" → "3 quarters of 8 = ?" (speech engines read "3/4" as a date). */
export function sayFractions(text: string): string {
  return text.replace(FRACTION, (_, top: string, bottom: string) => {
    const d = Number(bottom);
    const word = ORD[d];
    if (top === "?" || bottom === "?" || !word) return `${top} over ${bottom}`;
    const plural = word === "half" ? "halves" : `${word}s`;
    return top === "1" ? `1 ${word}` : `${top} ${plural}`;
  });
}
