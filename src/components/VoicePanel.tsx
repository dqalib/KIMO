"use client";

// Grown-ups' voice settings: how much of the app has the professional British
// recording, and which British voice this iPad uses for everything else.

import { useEffect, useMemo, useState } from "react";
import { voiceCoverage } from "@/lib/phrases";
import { britishVoices, currentDeviceVoice, hasRecording, preferredVoiceName, primeVoices, setPreferredVoice, speakWithDevice } from "@/lib/speech";

const SOURCE_NAME: Record<string, string> = {
  phonics: "Phonics",
  spelling: "Spelling",
  coding: "Coding words",
  grammar: "Grammar",
  reading: "Reading stories",
};

export default function VoicePanel() {
  const coverage = useMemo(() => voiceCoverage(hasRecording), []);
  const recorded = coverage.reduce((t, c) => t + c.recorded, 0);
  const total = coverage.reduce((t, c) => t + c.total, 0);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [chosen, setChosen] = useState<string>("");
  useEffect(() => {
    primeVoices();
    const load = () => {
      setVoices(britishVoices());
      setChosen(preferredVoiceName() ?? "");
    };
    load();
    window.speechSynthesis?.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", load);
  }, []);

  function choose(name: string) {
    setChosen(name);
    setPreferredVoice(name || null);
  }

  const auto = currentDeviceVoice();

  return (
    <section className="bg-card rounded-3xl border-2 border-line p-5 flex flex-col gap-4">
      <h2 className="text-2xl font-extrabold">🔊 British voice</h2>

      <div className="flex flex-col gap-2">
        <p className="font-bold">
          Professional recordings: {recorded.toLocaleString()} of {total.toLocaleString()} things the app says ({Math.round((recorded / Math.max(total, 1)) * 100)}%)
        </p>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
          {coverage.map((c) => (
            <li key={c.source} className="flex items-center gap-2">
              <span className="w-32">{SOURCE_NAME[c.source] ?? c.source}</span>
              <span className="flex-1 h-2.5 rounded-full bg-bg border border-line overflow-hidden" aria-hidden>
                <span className="block h-full bg-good rounded-full" style={{ width: `${(c.recorded / Math.max(c.total, 1)) * 100}%` }} />
              </span>
              <span className="tabular-nums text-muted w-20 text-right">
                {c.recorded}/{c.total}
              </span>
            </li>
          ))}
        </ul>
        {recorded < total && (
          <p className="text-sm text-muted">
            Everything else is read by this iPad&apos;s own British voice (below). To record the rest free, run <b>voice-google.bat</b> in the KIMO folder on the PC
            — see docs/audio-setup.md.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex flex-wrap items-center gap-3 font-bold">
          This iPad&apos;s voice
          <select className="p-2 rounded-xl border-2 border-line bg-card font-normal" value={chosen} onChange={(e) => choose(e.target.value)} aria-label="Device voice">
            <option value="">Automatic{auto ? ` (${auto.name})` : ""}</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>
          <button
            className="h-10 px-4 rounded-xl bg-brand text-white font-bold"
            onClick={() => void speakWithDevice("Hello! This is the voice I'll use for words that don't have a recording yet.")}
          >
            Test ▶
          </button>
        </label>
        {voices.length === 0 ? (
          <p className="text-sm text-warn font-semibold">
            No British voice found on this device. On the iPad: Settings → Accessibility → Spoken Content → Voices → English → choose a UK voice (e.g. Serena or
            Daniel, &quot;Enhanced&quot; sounds best) and download it, then reopen KIMO.
          </p>
        ) : (
          <p className="text-sm text-muted">
            Only British voices are listed. For a more natural sound, download an &quot;Enhanced&quot; UK voice in iPad Settings → Accessibility → Spoken Content →
            Voices → English. This choice is saved on this iPad only.
          </p>
        )}
      </div>
    </section>
  );
}
