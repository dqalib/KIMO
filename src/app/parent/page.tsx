"use client";

import Link from "next/link";
import ParentGate from "@/components/ParentGate";
import SyncPanel from "@/components/SyncPanel";
import { currentLetter, lettersMastered } from "@/lib/hw";
import { accuracy } from "@/lib/mastery";
import { PH_LEVELS, getPhLevel } from "@/lib/phonics";
import { SP_LEVELS, getSpLevel } from "@/lib/spelling";
import { exportJson, getInputMode, phProgress, removeChild, setCurrentLevel, setInputMode, setPhLevel, setSpLevel, spProgress, useAppState } from "@/lib/store";
import { TT_LEVELS, getLevel } from "@/lib/tt";

export default function ParentPage() {
  return (
    <ParentGate>
      <Dashboard />
    </ParentGate>
  );
}

const OUTCOME_LABEL = {
  levelPassed: "Level passed",
  setPassed: "Passed set",
  setFailed: "Not yet",
  droppedBack: "Dropped back",
} as const;

function Dashboard() {
  const state = useAppState();
  if (!state) return null;

  function download() {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kimo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }

  return (
    <main className="flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <Link href="/" className="text-muted font-bold">
          ← Home
        </Link>
        <h1 className="text-3xl font-black">Parent dashboard</h1>
        <Link href="/setup" className="ml-auto h-11 px-4 rounded-xl bg-brand text-white font-bold flex items-center">
          + Child
        </Link>
      </header>

      <SyncPanel />

      {state.children.map((c) => {
        const tt = state.tt[c.id];
        const lvl = tt && getLevel(tt.current);
        const attempts = state.attempts.filter((a) => a.childId === c.id).slice(-8).reverse();
        const weak = Object.entries(state.weakFacts[c.id] ?? {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6);
        const week = state.attempts.filter(
          (a) => a.childId === c.id && Date.now() - new Date(a.finishedAt).getTime() < 7 * 864e5,
        );
        const minutes = Math.round(week.reduce((s, a) => s + a.durationMs, 0) / 60000);

        return (
          <section key={c.id} className="bg-card rounded-3xl border-2 border-line p-5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{c.avatar}</span>
              <div>
                <h2 className="text-2xl font-extrabold">{c.name}</h2>
                <p className="text-muted">
                  Year {c.schoolYear} · {week.length} set{week.length === 1 ? "" : "s"} ·{" "}
                  {week.length === 0 ? "none" : minutes < 1 ? "under 1 min" : `~${minutes} min`} this week
                </p>
              </div>
              {tt?.flagged && (
                <span className="ml-auto px-3 py-1 rounded-full bg-warn/15 text-warn font-bold">Needs help</span>
              )}
            </div>

            {tt && lvl && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold">
                  Times tables: {lvl.id} · {lvl.title}
                </span>
                <span className="text-muted">
                  ({tt.passed.length} level{tt.passed.length === 1 ? "" : "s"} passed)
                </span>
                <select
                  className="ml-auto p-2 rounded-xl border-2 border-line bg-card"
                  value={tt.current}
                  onChange={(e) => setCurrentLevel(c.id, e.target.value)}
                  aria-label={`Change ${c.name}'s level`}
                >
                  {TT_LEVELS.map((l) => (
                    <option key={l.id} value={l.id}>
                      Move to {l.id} · {l.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <label className="flex items-center gap-3 font-bold">
              Maths answers
              <select
                className="p-2 rounded-xl border-2 border-line bg-card font-normal"
                value={getInputMode(state, c.id)}
                onChange={(e) => setInputMode(c.id, e.target.value as "keypad" | "pencil")}
                aria-label={`How ${c.name} answers`}
              >
                <option value="keypad">Tap the keypad</option>
                <option value="pencil">Write with Apple Pencil (+2 s per question)</option>
              </select>
            </label>

            {(c.schoolYear <= 2 || state.ph?.[c.id]) && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold">
                  Phonics: {phProgress(state, c.id).current} · {getPhLevel(phProgress(state, c.id).current)?.title}
                </span>
                {state.ph?.[c.id]?.flagged && <span className="px-3 py-1 rounded-full bg-warn/15 text-warn font-bold">Needs help</span>}
                <select
                  className="ml-auto p-2 rounded-xl border-2 border-line bg-card"
                  value={phProgress(state, c.id).current}
                  onChange={(e) => setPhLevel(c.id, e.target.value)}
                  aria-label={`Change ${c.name}'s phonics level`}
                >
                  {PH_LEVELS.map((l) => (
                    <option key={l.id} value={l.id}>
                      Move to {l.id} · {l.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold">
                Spelling: {spProgress(state, c.id).current} · {getSpLevel(spProgress(state, c.id).current)?.title}
                {!state.sp?.[c.id] && c.schoolYear < 2 && <span className="text-muted font-semibold"> (starts in Year 2 — pick a level to start early)</span>}
              </span>
              {state.sp?.[c.id]?.flagged && <span className="px-3 py-1 rounded-full bg-warn/15 text-warn font-bold">Needs help</span>}
              <select
                className="ml-auto p-2 rounded-xl border-2 border-line bg-card"
                value={!state.sp?.[c.id] && c.schoolYear < 2 ? "" : spProgress(state, c.id).current}
                onChange={(e) => e.target.value && setSpLevel(c.id, e.target.value)}
                aria-label={`Change ${c.name}'s spelling level`}
              >
                {!state.sp?.[c.id] && c.schoolYear < 2 && <option value="">Not started</option>}
                {SP_LEVELS.map((l) => (
                  <option key={l.id} value={l.id}>
                    Move to {l.id} · {l.title}
                  </option>
                ))}
              </select>
            </div>

            {(c.schoolYear <= 2 || state.hw?.[c.id]) && (
              <p className="font-bold">
                Handwriting: {lettersMastered(state, c.id)}/26 letters learned
                {currentLetter(state, c.id) && <span className="font-normal text-muted"> · working on “{currentLetter(state, c.id)!.char}”</span>}
              </p>
            )}

            {weak.length > 0 && (
              <p className="text-sm">
                <span className="font-bold">Tricky facts: </span>
                {weak.map(([k, n]) => `${k.replace("x", "×")} (${n})`).join(", ")}
              </p>
            )}

            {attempts.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="text-muted">
                  <tr>
                    <th className="py-1">When</th>
                    <th>Level</th>
                    <th>Score</th>
                    <th>Time</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => (
                    <tr key={a.id} className="border-t border-line">
                      <td className="py-2">
                        {new Date(a.finishedAt).toLocaleString("en-GB", {
                          weekday: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>{a.levelId}</td>
                      <td>
                        {a.correctFirstTime}/{a.total} ({Math.round(accuracy(a) * 100)}%)
                      </td>
                      <td>
                        {Math.round(a.durationMs / 1000)}s{a.secondsPerQuestion > 0 && ` / ${a.total * a.secondsPerQuestion}s`}
                      </td>
                      <td>{OUTCOME_LABEL[a.outcome]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-muted">No practice yet.</p>
            )}

            <button
              className="self-start text-sm text-bad underline"
              onClick={() => {
                if (window.confirm(`Remove ${c.name} and all their progress?`)) removeChild(c.id);
              }}
            >
              Remove {c.name}
            </button>
          </section>
        );
      })}

      <footer className="flex gap-4 text-sm text-muted">
        <button onClick={download} className="underline">
          Download backup
        </button>
        <span>Backups are a JSON file of all progress on this device.</span>
      </footer>
    </main>
  );
}
