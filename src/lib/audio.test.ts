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
