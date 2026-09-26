"use client";

import Link from "next/link";
import ParentGate from "@/components/ParentGate";
import PassageReview from "@/components/PassageReview";
import SyncPanel from "@/components/SyncPanel";
import { currentLetter, lettersMastered } from "@/lib/hw";
import { accuracy } from "@/lib/mastery";
import { exportJson, getInputMode, removeChild, setCurrentLevel, setDailyGoal, setInputMode, setStrandLevel, strandProgress, strandStarted, useAppState } from "@/lib/store";
import { dailyGoal, dayStreak, subjectOf, trickyItems, weekSummary } from "@/lib/report";
import { STRANDS } from "@/lib/strands";
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

      <PassageReview reviews={state.rcReview ?? {}} />

      {state.children.map((c) => {
        const tt = state.tt[c.id];
        const lvl = tt && getLevel(tt.current);
        const attempts = state.attempts.filter((a) => a.childId === c.id).slice(-8).reverse();
        const week = weekSummary(state, c.id);
        const tricky = trickyItems(state, c.id);
        const goal = dailyGoal(state, c.id);
        const streak = dayStreak(state.attempts, c.id);

        return (
          <section key={c.id} className="bg-card rounded-3xl border-2 border-line p-5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{c.avatar}</span>
              <div>
                <h2 className="text-2xl font-extrabold">{c.name}</h2>
                <p className="text-muted">
                  Year {c.schoolYear}
                  {streak > 0 && ` · 🔥 ${streak} day${streak === 1 ? "" : "s"} in a row`}
                </p>
              </div>
              {tt?.flagged && (
                <span className="ml-auto px-3 py-1 rounded-full bg-warn/15 text-warn font-bold">Needs help</span>
              )}
            </div>

            <div className="rounded-2xl bg-bg p-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <span className="font-extrabold">Last 7 days</span>
                <span>
                  <b>{week.sets}</b> set{week.sets === 1 ? "" : "s"}
                </span>
                <span>
                  <b>{week.sets === 0 ? 0 : Math.max(1, week.minutes)}</b> min
                </span>
                <span>
                  <b>{week.levelsPassed.length}</b> level{week.levelsPassed.length === 1 ? "" : "s"} passed
                  {week.levelsPassed.length > 0 && <span className="text-muted"> ({week.levelsPassed.join(", ")})</span>}
                </span>
              </div>
              <div className="flex gap-2" aria-label="Sets per day this week">
                {week.days.map((d) => (
                  <div key={d.date.toISOString()} className="flex flex-col items-center gap-1 flex-1">
                    <span
                      className={`w-full h-10 rounded-lg flex items-center justify-center font-black tabular-nums ${
                        d.goalMet ? "bg-good text-white" : d.sets > 0 ? "bg-warn/25 text-ink" : "bg-card border-2 border-line text-muted"
                      }`}
                      title={`${d.sets} set${d.sets === 1 ? "" : "s"}`}
                    >
                      {d.sets || ""}
                    </span>
                    <span className="text-xs text-muted font-bold">{d.date.toLocaleDateString("en-GB", { weekday: "short" })}</span>
                  </div>
                ))}
              </div>
              {week.bySubject.length > 0 && (
                <div className="flex flex-wrap gap-2 text-sm">
                  {week.bySubject.map((b) => (
                    <span key={b.subject} className="px-3 py-1 rounded-full bg-card border-2 border-line">
                      {b.subject}: {b.sets} set{b.sets === 1 ? "" : "s"} · {Math.round(b.accuracy * 100)}% right first time
                    </span>
                  ))}
                </div>
              )}
              <label className="flex items-center gap-3 font-bold text-sm">
                Daily goal
                <select
                  className="p-2 rounded-xl border-2 border-line bg-card font-normal"
                  value={goal}
                  onChange={(e) => setDailyGoal(c.id, Number(e.target.value))}
                  aria-label={`${c.name}'s daily goal`}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} set{n === 1 ? "" : "s"} a day
                    </option>
                  ))}
                </select>
                <span className="font-normal text-muted">(green days = goal met)</span>
              </label>
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

            {STRANDS.map((st) => {
              const started = strandStarted(state, st.key, c.id);
              const shown = started || st.shownFor(c.schoolYear);
              const p = strandProgress(state, st.key, c.id);
              return (
                <div key={st.key} className="flex flex-wrap items-center gap-3">
                  <span className="font-bold">
                    {st.name}:{" "}
                    {shown ? (
                      <>
                        {p.current} · {st.levels.find((l) => l.id === p.current)?.title}
                      </>
                    ) : (
                      <span className="text-muted font-semibold">off ({st.hiddenNote}) — pick a level to start early</span>
                    )}
                  </span>
                  {p.flagged && <span className="px-3 py-1 rounded-full bg-warn/15 text-warn font-bold">Needs help</span>}
                  <select
                    className="ml-auto p-2 rounded-xl border-2 border-line bg-card"
                    value={shown ? p.current : ""}
                    onChange={(e) => e.target.value && setStrandLevel(st.key, c.id, e.target.value)}
                    aria-label={`Change ${c.name}'s ${st.name.toLowerCase()} level`}
                  >
                    {!shown && <option value="">Not started</option>}
                    {st.levels.map((l) => (
                      <option key={l.id} value={l.id}>
                        Move to {l.id} · {l.title}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}

            {(c.schoolYear <= 2 || state.hw?.[c.id]) && (
              <p className="font-bold">
                Handwriting: {lettersMastered(state, c.id)}/26 letters learned
                {currentLetter(state, c.id) && <span className="font-normal text-muted"> · working on “{currentLetter(state, c.id)!.char}”</span>}
              </p>
            )}

            {tricky.length > 0 && (
              <div className="text-sm">
                <p className="font-bold">Keeps tripping up on</p>
                <ul className="flex flex-wrap gap-2 mt-1">
                  {tricky.map((t) => (
                    <li key={`${t.subject}-${t.label}`} className="px-3 py-1 rounded-full bg-warn/15">
                      <span className="text-muted">{t.subject}:</span> {t.label} <span className="text-muted">×{t.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {attempts.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="text-muted">
                  <tr>
                    <th className="py-1">When</th>
                    <th>Subject</th>
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
                      <td>{subjectOf(a.levelId)}</td>
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
