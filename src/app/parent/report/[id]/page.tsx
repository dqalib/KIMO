"use client";

// Progress report for one child (grown-ups only): last 30 days, every subject
// with level and accuracy trend, what they still remember (spelling + coding
// words), and what keeps tripping them up. "Print / save as PDF" for school.

import Link from "next/link";
import { useParams } from "next/navigation";
import ParentGate from "@/components/ParentGate";
import { getTerm } from "@/lib/coding";
import { currentLetter, lettersMastered } from "@/lib/hw";
import type { MemorySummary } from "@/lib/memory";
import { childReport, type ReportLevels, type SubjectReport } from "@/lib/report";
import { strandStarted, useAppState } from "@/lib/store";
import { STRANDS } from "@/lib/strands";
import { TT_LEVELS } from "@/lib/tt";

export default function ReportPage() {
  return (
    <ParentGate>
      <Report />
    </ParentGate>
  );
}

const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function Report() {
  const { id } = useParams<{ id: string }>();
  const state = useAppState();
  if (!state) return null;
  const child = state.children.find((c) => c.id === id);
  if (!child) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-xl font-bold">We couldn&apos;t find that child.</p>
        <Link href="/parent" className="text-brand underline">
          Back to the parent dashboard
        </Link>
      </main>
    );
  }

  const strands: ReportLevels[] = [
    { code: "TT", name: "Times tables", levels: TT_LEVELS, progress: state.tt[id], shown: true },
    ...STRANDS.map((st) => ({
      code: st.key.toUpperCase(),
      name: st.name,
      levels: st.levels,
      progress: state[st.key]?.[id],
      shown: st.shownFor(child.schoolYear) || strandStarted(state, st.key, id),
    })),
  ];
  const r = childReport(state, id, strands);
  const showHw = child.schoolYear <= 2 || !!state.hw?.[id];
  const hwLetter = currentLetter(state, id);

  return (
    <main className="flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col gap-6 print:p-0 print:gap-4">
      <header className="flex items-center gap-4 print:hidden">
        <Link href="/parent" className="text-muted font-bold">
          ← Parent dashboard
        </Link>
        <button onClick={() => window.print()} className="ml-auto h-11 px-4 rounded-xl bg-brand text-white font-bold">
          Print / save as PDF
        </button>
      </header>

      <div className="flex items-center gap-4">
        <span className="text-6xl" aria-hidden>
          {child.avatar}
        </span>
        <div>
          <h1 className="text-4xl font-black">{child.name}&apos;s progress report</h1>
          <p className="text-muted font-semibold">
            Year {child.schoolYear} · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile value={r.streak} label={`day${r.streak === 1 ? "" : "s"} in a row`} />
        <Tile value={r.sets7} label="sets this week" />
        <Tile value={r.sets7 === 0 ? 0 : Math.max(1, r.minutes7)} label="minutes this week" />
        <Tile value={r.sets30} label="sets in 30 days" />
      </section>

      <Card title="Last 30 days" note={`Daily goal: ${r.goal} set${r.goal === 1 ? "" : "s"} · green = goal met`}>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}>
          {r.days.map((d) => (
            <div
              key={d.date.toISOString()}
              title={`${d.date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}: ${d.sets} set${d.sets === 1 ? "" : "s"}`}
              className={`aspect-square rounded-md flex items-center justify-center text-xs font-black tabular-nums ${
                d.goalMet ? "bg-good text-white" : d.sets > 0 ? "bg-warn/25 text-ink" : "bg-bg border border-line text-muted"
              }`}
            >
              {d.sets || ""}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted font-bold mt-1">
          <span>{r.days[0].date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
          <span>Today</span>
        </div>
      </Card>

      <Card title="Subjects" note="Right first time = answers correct on the first try, last 30 days. Trend compares this week with last week.">
        <div className="flex flex-col divide-y divide-line">
          {r.subjects.map((s) => (
            <SubjectRow key={s.code} s={s} />
          ))}
          {showHw && (
            <div className="py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-extrabold w-44">Handwriting</span>
              <span>
                {lettersMastered(state, id)}/26 letters learned
                {hwLetter && <span className="text-muted"> · working on “{hwLetter.char}”</span>}
              </span>
            </div>
          )}
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-6">
        <MemoryCard title="Spelling memory" unit="word" m={r.memory.spelling} />
        <MemoryCard title="Coding words memory" unit="word" m={r.memory.coding} label={(k) => getTerm(k)?.term ?? k} />
      </div>

      <Card title="Exams" note="Exams show no answers until the end; passing one (90%+) moves up a level.">
        {r.exams.length ? (
          <ul className="flex flex-col divide-y divide-line">
            {r.exams.map((e, k) => (
              <li key={k} className="py-2 flex flex-col gap-1">
                <span className="flex flex-wrap gap-x-3">
                  <span className="text-muted w-16 tabular-nums">{shortDate(e.when)}</span>
                  <span className="font-bold">{e.subject}</span>
                  <span>{e.levelId}</span>
                  <span className="tabular-nums font-bold">
                    {e.score}/{e.total}
                  </span>
                  <span className={e.passed ? "text-good font-bold" : "text-warn font-bold"}>{e.passed ? "✓ passed" : "not yet"}</span>
                </span>
                {e.missed.length > 0 && (
                  <span className="text-sm text-muted pl-16">
                    Missed:{" "}
                    {e.missed.map((m, j) => (
                      <span key={j} className="mr-3">
                        {m.answer} <span className="line-through text-bad">{m.given}</span>
                      </span>
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">No exams taken yet.</p>
        )}
      </Card>

      <Card title="Keeps tripping up on" note="Most-missed first, across every subject.">
        {r.tricky.length ? (
          <ul className="flex flex-wrap gap-2 text-sm">
            {r.tricky.map((t) => (
              <li key={`${t.subject}-${t.label}`} className="px-3 py-1 rounded-full bg-warn/15">
                <span className="text-muted">{t.subject}:</span> {t.label} <span className="text-muted">×{t.count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Nothing yet — brilliant.</p>
        )}
      </Card>

      <Card title="Levels passed recently">
        {r.levelsPassed.length ? (
          <ul className="flex flex-col gap-1">
            {r.levelsPassed.map((l, k) => (
              <li key={k} className="flex gap-3">
                <span className="text-muted w-16 tabular-nums">{shortDate(l.when)}</span>
                <span className="font-bold">{l.subject}</span>
                <span>{l.levelId}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">No levels passed yet — keep going!</p>
        )}
      </Card>
    </main>
  );
}

function Tile({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-card border-2 border-line p-4 flex flex-col">
      <span className="text-4xl font-black tabular-nums">{value}</span>
      <span className="text-sm font-bold text-muted">{label}</span>
    </div>
  );
}

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-3xl border-2 border-line p-5 flex flex-col gap-3 break-inside-avoid">
      <div>
        <h2 className="text-xl font-extrabold">{title}</h2>
        {note && <p className="text-sm text-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Trend({ s }: { s: SubjectReport }) {
  if (s.accuracyThisWeek === null || s.accuracyLastWeek === null) return <span className="text-muted">—</span>;
  const d = Math.round((s.accuracyThisWeek - s.accuracyLastWeek) * 100);
  if (Math.abs(d) < 3) return <span className="text-muted font-bold">→ steady</span>;
  return d > 0 ? <span className="text-good font-bold">↑ {d}% better</span> : <span className="text-bad font-bold">↓ {-d}% lower</span>;
}

function SubjectRow({ s }: { s: SubjectReport }) {
  const share = s.levelCount ? (s.levelNo - 1) / s.levelCount : 0;
  return (
    <div className="py-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-extrabold w-44">{s.subject}</span>
        <span className="font-semibold">
          {s.levelId} · {s.levelTitle}
        </span>
        {s.flagged && <span className="px-2 py-0.5 rounded-full bg-warn/15 text-warn text-sm font-bold">⚠ Needs help</span>}
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        <div className="flex items-center gap-2 w-56">
          <div className="flex-1 h-2.5 rounded-full bg-bg border border-line overflow-hidden" aria-hidden>
            <div className="h-full bg-brand rounded-full" style={{ width: `${Math.max(share * 100, 2)}%` }} />
          </div>
          <span className="tabular-nums text-muted font-bold whitespace-nowrap">
            Level {s.levelNo} of {s.levelCount}
          </span>
        </div>
        <span>
          <b>{s.sets30}</b> set{s.sets30 === 1 ? "" : "s"}
        </span>
        <span>
          <b>{pct(s.accuracy30)}</b> right first time
        </span>
        <Trend s={s} />
        {s.lastExam ? (
          <span className={s.lastExam.passed ? "text-good font-bold" : "text-warn font-bold"}>
            📝 last exam {s.lastExam.score}/{s.lastExam.total} {s.lastExam.passed ? "passed" : "not yet"} ({shortDate(s.lastExam.when)})
          </span>
        ) : s.readyStreak >= 2 ? (
          <span className="text-good font-bold">⭐ ready for the exam</span>
        ) : null}
        <span className="text-muted">{s.lastPractised ? `last practised ${shortDate(s.lastPractised)}` : "not started"}</span>
      </div>
    </div>
  );
}

function MemoryCard({ title, unit, m, label = (k) => k }: { title: string; unit: string; m: MemorySummary; label?: (key: string) => string }) {
  const plural = (n: number) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  return (
    <Card title={title} note="Words come back after 1, 3, 7, 14 and 30 days. “Remembered well” = right on several different days.">
      {m.total === 0 ? (
        <p className="text-muted">Nothing practised yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-bg p-2">
              <p className="text-2xl font-black tabular-nums text-good">{m.remembered}</p>
              <p className="text-xs font-bold text-muted">remembered well</p>
            </div>
            <div className="rounded-xl bg-bg p-2">
              <p className="text-2xl font-black tabular-nums">{m.learning}</p>
              <p className="text-xs font-bold text-muted">still learning</p>
            </div>
            <div className="rounded-xl bg-bg p-2">
              <p className="text-2xl font-black tabular-nums">{m.dueToday}</p>
              <p className="text-xs font-bold text-muted">due for review</p>
            </div>
          </div>
          {m.forgotten.length > 0 && (
            <div className="text-sm">
              <p className="font-bold">Forgotten since learning ({plural(m.forgotten.length)})</p>
              <ul className="flex flex-wrap gap-2 mt-1">
                {m.forgotten.slice(0, 20).map((w) => (
                  <li key={w} className="px-3 py-1 rounded-full bg-bad/10">
                    {label(w)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
