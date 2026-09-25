"use client";

interface Props {
  /** Grapheme split, e.g. ["sh","i","p"] or ["c","a-e","k"] for "cake". */
  graphemes: string[];
  /** Highlight one grapheme (brand colour) when blending sound by sound. */
  highlight?: number;
}

const CELL = 76; // px per letter cell (word text is 72px, a little air on each side)

interface Marker {
  kind: "dot" | "line" | "arc";
  start: number; // first letter cell index
  end: number; // last letter cell index (arc only)
  gIndex: number;
}

/**
 * Sound buttons, the Year 1 teacher way: a dot under each single-letter
 * sound, a line under each digraph/trigraph, and a curved arc joining the
 * two parts of a split digraph (a-e etc.). The letters between the split
 * digraph keep their own markers.
 */
export default function SoundButtons({ graphemes, highlight }: Props) {
  // Letter cells in display order. A split digraph "a-e" contributes its first
  // letter in place and its final "e" at the very end of the word.
  const split = graphemes.find((g) => g.includes("-"));
  const cells: { ch: string; gIndex: number }[] = [];
  graphemes.forEach((g, gi) => {
    if (g.includes("-")) cells.push({ ch: g[0], gIndex: gi });
    else for (const ch of g) cells.push({ ch, gIndex: gi });
  });
  if (split) cells.push({ ch: "e", gIndex: graphemes.indexOf(split) });

  const markers: Marker[] = graphemes.map((g, gi) => {
    const start = cells.findIndex((c) => c.gIndex === gi);
    if (g.includes("-")) return { kind: "arc", start, end: cells.length - 1, gIndex: gi };
    if (g.length === 1) return { kind: "dot", start, end: start, gIndex: gi };
    return { kind: "line", start, end: start + g.length - 1, gIndex: gi };
  });

  const ink = (gi: number) => (highlight === gi ? "var(--brand)" : "var(--ink)");

  return (
    <div className="inline-flex flex-col items-center select-none" aria-label={cells.map((c) => c.ch).join("")}>
      <div className="flex">
        {cells.map((c, i) => (
          <span
            key={i}
            className="text-center text-7xl font-extrabold leading-none"
            style={{ width: CELL, color: highlight === c.gIndex ? "var(--brand)" : "var(--ink)" }}
          >
            {c.ch}
          </span>
        ))}
      </div>
      <div className="relative" style={{ width: CELL * cells.length, height: 26 }}>
        {markers.map((m, i) => {
          if (m.kind === "dot") {
            return (
              <span
                key={i}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full"
                style={{ left: m.start * CELL + CELL / 2, background: ink(m.gIndex) }}
              />
            );
          }
          if (m.kind === "line") {
            const width = (m.end - m.start + 1) * CELL - 20;
            return (
              <span
                key={i}
                className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full"
                style={{ left: m.start * CELL + 10, width, background: ink(m.gIndex) }}
              />
            );
          }
          // arc under a split digraph: from the centre of the first letter to
          // the centre of the final e, dipping below any markers between them
          const width = (m.end - m.start) * CELL;
          return (
            <svg
              key={i}
              className="absolute top-0"
              style={{ left: m.start * CELL + CELL / 2 }}
              width={width}
              height={26}
              aria-hidden="true"
            >
              <path
                d={`M 0 4 Q ${width / 2} 30 ${width} 4`}
                fill="none"
                stroke={ink(m.gIndex)}
                strokeWidth={5}
                strokeLinecap="round"
              />
            </svg>
          );
        })}
      </div>
    </div>
  );
}
