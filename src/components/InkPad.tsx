"use client";

// A canvas for writing with Apple Pencil (or a finger).
// - Palm rejection: once a pen has been seen, finger/palm touches are ignored.
// - Line width follows pencil pressure.
// - Strokes are kept as point lists so later features (digit recognition,
//   letter-tracing checks, saving working-out) can use them.

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

export interface InkPoint {
  x: number; // CSS pixels within the pad
  y: number;
  p: number; // pressure 0..1
  t: number; // ms since stroke start
}
export type InkStroke = InkPoint[];

export interface InkPadHandle {
  clear: () => void;
  strokes: () => InkStroke[];
}

interface Props {
  className?: string;
  ink?: string;
  /** Base line width in CSS px (scaled by pressure). */
  width?: number;
  /** Allow finger drawing even after a pen has been used. */
  allowTouch?: boolean;
  onStrokeEnd?: (strokes: InkStroke[]) => void;
  onPenDetected?: () => void;
  /** Optional background painter (e.g. writing lines, a letter to trace). */
  drawBackground?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

const InkPad = forwardRef<InkPadHandle, Props>(function InkPad(
  { className = "", ink = "#1f2430", width = 5, allowTouch = false, onStrokeEnd, onPenDetected, drawBackground },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<InkStroke[]>([]);
  const activeId = useRef<number | null>(null);
  const strokeStart = useRef(0);
  const penSeen = useRef(false);
  const [, force] = useState(0);

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const w = c.width / dpr;
    const h = c.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    drawBackground?.(ctx, w, h);
    for (const s of strokesRef.current) drawStroke(ctx, s, ink, width);
  }, [drawBackground, ink, width]);

  // Size the canvas to its box (sharp on Retina) and redraw on resize.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ro = new ResizeObserver(() => {
      const r = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      redraw();
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, [redraw]);

  useImperativeHandle(
    ref,
    () => ({
      clear: () => {
        strokesRef.current = [];
        redraw();
        force((n) => n + 1);
      },
      strokes: () => strokesRef.current,
    }),
    [redraw],
  );

  function point(e: React.PointerEvent<HTMLCanvasElement>): InkPoint {
    const r = e.currentTarget.getBoundingClientRect();
    // Mice and some fingers report pressure 0 or 0.5 — treat as medium.
    const p = e.pointerType === "pen" && e.pressure > 0 ? e.pressure : 0.5;
    return { x: e.clientX - r.left, y: e.clientY - r.top, p, t: performance.now() - strokeStart.current };
  }

  function rejected(e: React.PointerEvent) {
    if (e.pointerType === "pen") return false;
    return penSeen.current && !allowTouch;
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === "pen" && !penSeen.current) {
      penSeen.current = true;
      onPenDetected?.();
    }
    if (rejected(e) || activeId.current !== null) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId); // keep the stroke if the pen slides off the pad
    } catch {
      // Not fatal — the stroke still works while the pen stays on the pad.
    }
    activeId.current = e.pointerId;
    strokeStart.current = performance.now();
    strokesRef.current.push([point(e)]);
  }

  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerId !== activeId.current) return;
    const stroke = strokesRef.current[strokesRef.current.length - 1];
    // Coalesced events give the full 240 Hz Pencil detail on iPad.
    const events = typeof e.nativeEvent.getCoalescedEvents === "function" ? e.nativeEvent.getCoalescedEvents() : [];
    if (events.length) {
      const r = e.currentTarget.getBoundingClientRect();
      for (const ce of events) {
        stroke.push({
          x: ce.clientX - r.left,
          y: ce.clientY - r.top,
          p: ce.pointerType === "pen" && ce.pressure > 0 ? ce.pressure : 0.5,
          t: performance.now() - strokeStart.current,
        });
      }
    } else stroke.push(point(e));

    const ctx = e.currentTarget.getContext("2d")!;
    drawStroke(ctx, stroke.slice(-Math.max(3, events.length + 2)), ink, width);
  }

  function onUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerId !== activeId.current) return;
    activeId.current = null;
    onStrokeEnd?.(strokesRef.current);
  }

  return (
    <canvas
      ref={canvasRef}
      className={`touch-none select-none ${className}`}
      style={{ touchAction: "none", WebkitUserSelect: "none" }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
});

export default InkPad;

function drawStroke(ctx: CanvasRenderingContext2D, s: InkStroke, ink: string, base: number) {
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (s.length === 1) {
    ctx.beginPath();
    ctx.arc(s[0].x, s[0].y, (base * (0.6 + s[0].p)) / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  for (let i = 1; i < s.length; i++) {
    const a = s[i - 1];
    const b = s[i];
    ctx.lineWidth = base * (0.6 + (a.p + b.p) / 2);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}
