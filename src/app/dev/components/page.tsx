"use client";

import { useState } from "react";
import ChoiceGrid from "@/components/ChoiceGrid";
import SpeakButton from "@/components/SpeakButton";
import SoundButtons from "@/components/SoundButtons";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

export default function DevComponents() {
  const [picked, setPicked] = useState<{ options: string[]; chosen: number; correct: number } | null>(null);

  const demo = (options: string[], correct: number) => ({
    options,
    onChoose: (_: string, index: number) => setPicked({ options, chosen: index, correct }),
    result: picked && picked.options === options ? { chosen: picked.chosen, correct: picked.correct } : undefined,
  });

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-12">
      <h1 className="text-4xl font-black">Component playground</h1>
      <p className="text-muted font-semibold">Dev page — not linked from anywhere. Tap an answer (or press 1-6).</p>

      <Section title="ChoiceGrid — 2 options">
        <ChoiceGrid {...demo(["7 × 8 = 54", "7 × 8 = 56"], 1)} />
      </Section>

      <Section title="ChoiceGrid — 3 options (phonics size)">
        <ChoiceGrid size="lg" {...demo(["ship", "chip", "shop"], 0)} />
      </Section>

      <Section title="ChoiceGrid — 4 options">
        <ChoiceGrid {...demo(["12", "14", "16", "18"], 2)} />
      </Section>

      <Section title="ChoiceGrid — 6 options">
        <ChoiceGrid {...demo(["the", "then", "them", "they", "this", "that"], 3)} />
      </Section>

      <Section title="SpeakButton">
        <div className="flex flex-wrap items-center gap-8">
          <SpeakButton text="ship" />
          <SpeakButton text="The cat sat on the mat." label="Hear the sentence" size="lg" />
        </div>
      </Section>

      <Section title="SoundButtons">
        <div className="flex flex-wrap items-end gap-10">
          <SoundButtons graphemes={["c", "a", "t"]} />
          <SoundButtons graphemes={["sh", "i", "p"]} highlight={0} />
          <SoundButtons graphemes={["n", "igh", "t"]} highlight={1} />
          <SoundButtons graphemes={["c", "a-e", "k"]} />
          <SoundButtons graphemes={["s", "t", "a", "m", "p"]} />
        </div>
      </Section>
    </main>
  );
}
