import { describe, expect, it } from "vitest";
import { FAMILIES, LETTERS, TOLERANCE, checkLetter, getLetter, resample, strokeLength, type Pt, type Stroke } from "./letters";

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** Imitate a child tracing a stroke: resampled, with wobble, and uneven speed. */
function wobbly(s: Stroke, amount: number, seed: number): Stroke {
  const r = rng(seed);
  const pts = resample(s, 0.03 + r() * 0.05);
  return pts.map(([x, y]): Pt => [x + (r() - 0.5) * 2 * amount, y + (r() - 0.5) * 2 * amount]);
}

const shift = (s: Stroke, dx: number, dy: number): Stroke => s.map(([x, y]): Pt => [x + dx, y + dy]);

describe("letter data", () => {
  it("covers all 26 lowercase letters exactly once", () => {
    expect(LETTERS.map((l) => l.char).sort().join("")).toBe("abcdefghijklmnopqrstuvwxyz");
    expect(FAMILIES.map((f) => f.letters).join("").length).toBe(26);
  });

  it("strokes stay inside the writing lines", () => {
    for (const l of LETTERS)
      for (const s of l.strokes)
        for (const [x, y] of s) {
          expect(y, l.char).toBeGreaterThanOrEqual(-1.05);
          expect(y, l.char).toBeLessThanOrEqual(1.75);
          expect(x, l.char).toBeGreaterThanOrEqual(-0.05);
          expect(x, l.char).toBeLessThanOrEqual(l.width + 0.05);
        }
  });

  it("small letters sit between the x-height and the baseline", () => {
    for (const ch of "acemnorsuvwxz") {
      const ys = getLetter(ch)!.strokes.flat().map((p) => p[1]);
      expect(Math.min(...ys), ch).toBeGreaterThan(-0.1);
      expect(Math.max(...ys), ch).toBeLessThan(1.1);
    }
  });

  it("tall letters reach the top line; tail letters go below the baseline", () => {
    for (const ch of "bdhkl") expect(Math.min(...getLetter(ch)!.strokes.flat().map((p) => p[1])), ch).toBeLessThan(-0.9);
    for (const ch of "gjpqy") expect(Math.max(...getLetter(ch)!.strokes.flat().map((p) => p[1])), ch).toBeGreaterThan(1.3);
  });
});

describe("checkLetter", () => {
  for (const stage of [1, 2, 3] as const) {
    it(`accepts a careful, slightly wobbly attempt at every letter (stage ${stage})`, () => {
      for (const l of LETTERS) {
        for (let seed = 1; seed <= 5; seed++) {
          const attempt = l.strokes.map((s, i) => wobbly(s, 0.07, seed * 31 + i));
          const r = checkLetter(l, attempt, TOLERANCE[stage]);
          expect(r, `${l.char} seed ${seed}`).toEqual({ ok: true });
        }
      }
    });
  }

  it("rejects every letter written backwards", () => {
    for (const l of LETTERS) {
      const attempt = l.strokes.map((s) => (strokeLength(s) < 0.3 ? s : [...s].reverse()));
      if (attempt.every((s, i) => strokeLength(l.strokes[i]) < 0.3)) continue;
      const r = checkLetter(l, attempt, TOLERANCE[3]);
      expect(r.ok, l.char).toBe(false);
    }
  });

  it("rejects a letter drawn in the wrong place", () => {
    for (const l of LETTERS) {
      const r = checkLetter(l, l.strokes.map((s) => shift(s, 0.6, 0.6)), TOLERANCE[3]);
      expect(r.ok, l.char).toBe(false);
    }
  });

  it("rejects a letter that is only half done", () => {
    for (const l of LETTERS) {
      const attempt = l.strokes.map((s) => {
        if (strokeLength(s) < 0.3) return s;
        const r = resample(s, 0.05);
        return r.slice(0, Math.ceil(r.length * 0.45));
      });
      expect(checkLetter(l, attempt, TOLERANCE[1]).ok, l.char).toBe(false);
    }
  });

  it("rejects the wrong number of strokes (e.g. forgetting the dot on i)", () => {
    const i = getLetter("i")!;
    expect(checkLetter(i, [i.strokes[0]], TOLERANCE[1])).toMatchObject({ ok: false, problem: "strokes" });
    const t = getLetter("t")!;
    expect(checkLetter(t, [t.strokes[0]], TOLERANCE[1])).toMatchObject({ ok: false, problem: "strokes" });
  });

  it("rejects c written clockwise (a common reversal)", () => {
    const c = getLetter("c")!;
    const mirrored = c.strokes.map((s) => s.map(([x, y]): Pt => [c.width - x, y]));
    expect(checkLetter(c, mirrored, TOLERANCE[3]).ok).toBe(false);
  });

  it("ignores a tiny accidental mark on letters without a dot", () => {
    const l = getLetter("l")!;
    const r = checkLetter(l, [[[0.9, 0.9], [0.91, 0.9]], l.strokes[0]], TOLERANCE[1]);
    expect(r.ok).toBe(true);
  });

  it("accepts a dot made with a single tap", () => {
    const i = getLetter("i")!;
    expect(checkLetter(i, [i.strokes[0], [[0.32, -0.48]]], TOLERANCE[1]).ok).toBe(true);
  });
});
