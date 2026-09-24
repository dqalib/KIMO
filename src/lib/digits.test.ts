import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classify, parseModel, readNumber, renderDigit, splitDigits, type P, type Strokes } from "./digits";
import fixtures from "./__fixtures__/digits-fixtures.json";
import templatesJson from "./__fixtures__/digits-templates.json";

const model = parseModel(JSON.parse(readFileSync("public/models/digits-v1.json", "utf8")));
const templates = templatesJson as unknown as Record<string, number[][][][]>;

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** A pen-style digit: a template with a shaky hand, slant and size changes. */
function penDigit(d: number, r: () => number, x0: number, height: number): Strokes {
  const styles = templates[String(d)];
  const style = styles[Math.floor(r() * styles.length)];
  const slant = (r() - 0.5) * 0.35;
  const sx = 0.85 + r() * 0.3;
  const k = height / 1.6;
  return style.map((s) => {
    const off = [(r() - 0.5) * 0.06, (r() - 0.5) * 0.06];
    return s.map(([x, y]): P => {
      const wx = x + off[0] + (r() - 0.5) * 0.03;
      const wy = y + off[1] + (r() - 0.5) * 0.03;
      return [x0 + (wx * sx + slant * (1.6 - wy)) * k, 40 + wy * k];
    });
  });
}

function writeNumber(n: number, r: () => number): Strokes {
  const out: Strokes = [];
  let x = 20;
  const height = 60 + r() * 30; // px, like writing on the iPad
  for (const ch of String(n)) {
    const strokes = penDigit(Number(ch), r, x, height);
    out.push(...strokes);
    x += height * (0.62 + 0.22 + r() * 0.25); // digit width + a child-sized gap
  }
  return out;
}

describe("renderDigit matches the training renderer (ml/digits/train.py)", () => {
  for (const f of fixtures) {
    it(`digit ${f.digit}`, () => {
      const img = renderDigit(f.strokes as Strokes, model.render);
      let diff = 0;
      for (let i = 0; i < 784; i++) diff += Math.abs(img[i] - f.image[i]);
      expect(diff / 784).toBeLessThan(0.02);
      const probs = classify(model, img);
      expect(probs.indexOf(Math.max(...probs))).toBe(f.digit);
    });
  }
});

describe("splitDigits", () => {
  it("keeps multi-stroke digits (4, 5, crossed 7) together", () => {
    const r = rng(5);
    for (const d of [4, 5, 7]) {
      for (let i = 0; i < 20; i++) {
        const s = penDigit(d, r, 0, 80);
        expect(splitDigits(s), `digit ${d}`).toHaveLength(1);
      }
    }
  });

  it("finds the right number of digits in written answers", () => {
    const r = rng(11);
    for (let i = 0; i < 300; i++) {
      const n = Math.floor(r() * 145);
      expect(splitDigits(writeNumber(n, r)), `number ${n}`).toHaveLength(String(n).length);
    }
  });

  it("ignores an accidental speck", () => {
    const r = rng(3);
    const s = writeNumber(56, r);
    s.push([[300, 200], [300.5, 200.5]]);
    expect(splitDigits(s)).toHaveLength(2);
  });
});

describe("readNumber", () => {
  it("reads times-table answers written with a pen (≥ 97% exactly right)", () => {
    const r = rng(2024);
    const answers: number[] = [];
    for (let a = 2; a <= 12; a++) for (let b = 2; b <= 12; b++) answers.push(a * b);
    let right = 0;
    const misses: string[] = [];
    for (let i = 0; i < 400; i++) {
      const n = answers[Math.floor(r() * answers.length)];
      const got = readNumber(model, writeNumber(n, r));
      if (got.text === String(n)) right++;
      else misses.push(`${n}→${got.text}`);
    }
    expect(right / 400, misses.slice(0, 20).join(", ")).toBeGreaterThanOrEqual(0.97);
  });

  it("is fast enough for a 6-second question (< 60 ms for 3 digits)", () => {
    const r = rng(9);
    const s = writeNumber(144, r);
    readNumber(model, s); // warm up
    const t = performance.now();
    for (let i = 0; i < 5; i++) readNumber(model, s);
    expect((performance.now() - t) / 5).toBeLessThan(60);
  });
});
