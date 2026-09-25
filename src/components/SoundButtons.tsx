"use client";

interface Props {
  /** Grapheme split, e.g. ["sh","i","p"] or ["c","a-e","k"] for "cake". */
  graphemes: string[];
  /** Highlight one grapheme (brand colour) when blending sound by sound. */
  highlight?: number;
}

const CELL = 76; // px per letter cell (word text is 72px, a little air on each side)
const ROW = 40; // marker row height: dots/lines sit near the top, split-digraph arcs dip below them
const MARK_Y = 10; // vertical centre of dots and lines

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
  // letter in place and its final "e" straight after the next grapheme
  // (c·a-e·k → "cake", and a later suffix stays after it: c·a-e·k·s → "cakes").
  const cells: { ch: string; gIndex: number }[] = [];
  let pendingE: { ch: string; gIndex: number } | null = null;
  graphemes.forEach((g, gi) => {
    if (g.includes("-")) {
      cells.push({ ch: g[0], gIndex: gi });
      pendingE = { ch: g[g.length - 1], gIndex: gi };
      return;
    }
    for (const ch of g) cells.push({ ch, gIndex: gi });
    if (pendingE) {
      cells.push(pendingE);
      pendingE = null;
    }
  });
  if (pendingE) cells.push(pendingE);

  const markers: Marker[] = graphemes.map((g, gi) => {
    const start = cells.findIndex((c) => c.gIndex === gi);
    if (g.includes("-")) {
      const end = cells.findLastIndex((c) => c.gIndex === gi);
      return { kind: "arc", start, end, gIndex: gi };
    }
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
      <div className="relative" style={{ width: CELL * cells.length, height: ROW }}>
        {markers.map((m, i) => {
          if (m.kind === "dot") {
            return (
              <span
                key={i}
                className="absolute -translate-y-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full"
                style={{ top: MARK_Y, left: m.start * CELL + CELL / 2, background: ink(m.gIndex) }}
              />
            );
          }
          if (m.kind === "line") {
            const width = (m.end - m.start + 1) * CELL - 20;
            return (
              <span
                key={i}
                className="absolute -translate-y-1/2 h-1.5 rounded-full"
                style={{ top: MARK_Y, left: m.start * CELL + 10, width, background: ink(m.gIndex) }}
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
              height={ROW}
              aria-hidden="true"
            >
              <path
                d={`M 0 6 Q ${width / 2} ${ROW * 2 - 14} ${width} 6`}
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
