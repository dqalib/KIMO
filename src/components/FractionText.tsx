// Draws "3/4" in a question as a proper stacked fraction (3 over 4), the way
// children see fractions at school. "?" can be the top or bottom: "?/4".

import { useId, type ReactNode } from "react";

const FRACTION = /(\d+|\?)\/(\d+|\?)/g;
const SHAPE = /\[\[(circle|square|rect):(\d):(\d)(:u)?\]\]/g;

/**
 * A shape cut into 2 or 4 parts with some shaded (Year 1 fractions).
 * The outline clips a set of rectangles, so circles and squares cut the same way;
 * "unequal" moves the cuts off-centre so the parts are clearly different sizes.
 */
export function ShapePicture({ shape, parts, shaded, unequal, size }: { shape: string; parts: number; shaded: number; unequal: boolean; size: string }) {
  const clip = useId();
  const W = shape === "rect" ? 160 : 100;
  const H = 100;
  let xs: number[];
  let ys: number[] = [];
  if (shape === "rect" && parts === 4) xs = unequal ? [0.14, 0.42, 0.72] : [0.25, 0.5, 0.75];
  else if (parts === 4) {
    xs = [unequal ? 0.34 : 0.5];
    ys = [unequal ? 0.64 : 0.5];
  } else xs = [unequal ? 0.3 : 0.5];
  const xEdges = [0, ...xs, 1].map((f) => f * W);
  const yEdges = [0, ...ys, 1].map((f) => f * H);
  const regions: { x: number; y: number; w: number; h: number }[] = [];
  for (let j = 0; j < yEdges.length - 1; j++)
    for (let i = 0; i < xEdges.length - 1; i++) regions.push({ x: xEdges[i], y: yEdges[j], w: xEdges[i + 1] - xEdges[i], h: yEdges[j + 1] - yEdges[j] });
  const outline =
    shape === "circle" ? <circle cx={50} cy={50} r={47} /> : <rect x={3} y={3} width={W - 6} height={H - 6} rx={4} />;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ height: size, width: "auto" }} className="inline-block align-middle" aria-hidden>
      <defs>
        <clipPath id={clip}>{outline}</clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect x={0} y={0} width={W} height={H} fill="white" />
        {regions.slice(0, shaded).map((r, k) => (
          <rect key={k} x={r.x} y={r.y} width={r.w} height={r.h} fill="var(--warn)" />
        ))}
        {xs.map((f, k) => (
          <line key={`x${k}`} x1={f * W} y1={0} x2={f * W} y2={H} stroke="#1f2937" strokeWidth={4} />
        ))}
        {ys.map((f, k) => (
          <line key={`y${k}`} x1={0} y1={f * H} x2={W} y2={f * H} stroke="#1f2937" strokeWidth={4} />
        ))}
      </g>
      <g fill="none" stroke="#1f2937" strokeWidth={5}>{outline}</g>
    </svg>
  );
}

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
  // A picture on its own (an answer button) fills the button; in a question it sits on its own line.
  const alone = /^\s*\[\[[^\]]+\]\]\s*$/.test(text);
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(SHAPE)) {
    if (m.index! > last) parts.push(...fractions(text.slice(last, m.index), m.index!));
    parts.push(
      <span key={`s${m.index}`} className={alone ? "inline-block py-1" : "block mx-auto mt-4"}>
        <ShapePicture shape={m[1]} parts={Number(m[2])} shaded={Number(m[3])} unequal={!!m[4]} size={alone ? "1.9em" : "4.2em"} />
      </span>,
    );
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push(...fractions(text.slice(last), last));
  return <>{parts}</>;
}

function fractions(text: string, offset: number): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(FRACTION)) {
    if (m.index! > last) parts.push(text.slice(last, m.index));
    parts.push(<Fraction key={offset + m.index!} top={m[1]} bottom={m[2]} />);
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

const ORD: Record<number, string> = { 2: "half", 3: "third", 4: "quarter", 5: "fifth", 6: "sixth", 7: "seventh", 8: "eighth", 9: "ninth", 10: "tenth", 12: "twelfth", 20: "twentieth", 25: "twenty-fifth", 50: "fiftieth", 100: "hundredth" };

/** Words for reading a question aloud: "3/4 of 8 = ?" → "3 quarters of 8 = ?" (speech engines read "3/4" as a date). */
export function sayFractions(text: string): string {
  return text.replace(SHAPE, "").trim().replace(FRACTION, (_, top: string, bottom: string) => {
    const d = Number(bottom);
    const word = ORD[d];
    if (top === "?" || bottom === "?" || !word) return `${top} over ${bottom}`;
    const plural = word === "half" ? "halves" : `${word}s`;
    return top === "1" ? `1 ${word}` : `${top} ${plural}`;
  });
}
