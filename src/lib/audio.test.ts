import { describe, expect, it } from "vitest";
import { audioKey, normaliseSpeech } from "./audio-key";
import { GP_LEVELS, gpQuestions, spokenGp } from "./grammar";
import { allPhrases } from "./phrases";
import { SP_LEVELS, spLevelWords, spokenPrompt } from "./spelling";

describe("audio keys", () => {
  it("are stable, 16 hex characters, and ignore spacing differences", () => {
    expect(audioKey("because")).toMatch(/^[0-9a-f]{16}$/);
    expect(audioKey("because")).toBe(audioKey("because"));
    expect(audioKey("  I stayed   in. ")).toBe(audioKey("I stayed in."));
    expect(normaliseSpeech(" a \n b ")).toBe("a b");
  });

  it("are case- and punctuation-sensitive (they sound different)", () => {
    expect(audioKey("Christmas")).not.toBe(audioKey("christmas"));
    expect(audioKey("Help me.")).not.toBe(audioKey("Help me!"));
  });

  it("never collide across everything the app says", () => {
    const texts = [...new Set(allPhrases().map((p) => normaliseSpeech(p.text)))];
    expect(new Set(texts.map(audioKey)).size).toBe(texts.length);
  });
});

describe("phrase list", () => {
  const keys = new Set(allPhrases().map((p) => audioKey(p.text)));

  it("covers what the spelling screens say", () => {
    for (const l of SP_LEVELS)
      for (const w of spLevelWords(l.id)) {
        expect(keys.has(audioKey(spokenPrompt(w)))).toBe(true);
        expect(keys.has(audioKey(w.word))).toBe(true);
      }
  });

  it("covers what the grammar screen says", () => {
    for (const l of GP_LEVELS) for (const q of gpQuestions(l.id)) expect(keys.has(audioKey(spokenGp(q)))).toBe(true);
  });
});

describe("British voice choice", () => {
  it("only British voices count, natural ones before novelty ones, enhanced first", async () => {
    const { isBritishVoice, voiceScore } = await import("./speech");
    const v = (name: string, lang: string) => ({ name, lang });
    expect(isBritishVoice(v("Samantha", "en-US"))).toBe(false);
    expect(voiceScore(v("Samantha", "en-US"))).toBeLessThan(0);
    expect(isBritishVoice(v("Daniel", "en-GB"))).toBe(true);
    expect(isBritishVoice(v("Google UK English Female", "en_GB"))).toBe(true);
    expect(voiceScore(v("Grandma (English (UK))", "en-GB"))).toBeLessThan(voiceScore(v("Daniel", "en-GB")));
    expect(voiceScore(v("Rocko", "en-GB"))).toBeLessThan(1000);
    expect(voiceScore(v("Serena (Enhanced)", "en-GB"))).toBeGreaterThan(voiceScore(v("Daniel", "en-GB")));
  });

  it("reads maths symbols as words", async () => {
    const { spokenMaths } = await import("./speech");
    expect(spokenMaths("6 × 3 =")).toBe("6 times 3 equals");
    expect(spokenMaths("20 − 7")).toBe("20 take away 7");
    expect(spokenMaths("3/4 of 8")).toBe("3 over 4 of 8");
  });

  it("covers the coding words and the new spelling levels in the phrase list", () => {
    const texts = new Set(allPhrases().map((p) => p.text));
    expect(texts.has("RAM. The computer's short-term memory. It holds what you're doing right now and is wiped clean when you switch off.")).toBe(true);
    expect([...texts].some((t) => t.startsWith("yacht."))).toBe(true);
  });
});
