"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { currentLetter, lettersMastered } from "@/lib/hw";
import { FAMILIES } from "@/lib/letters";
import { getInputMode, letterProgress, PENCIL_EXTRA_SECONDS, needsPlacement, strandProgress, strandStarted, useAppState, type PlacementStrand } from "@/lib/store";
import { approvedPassages } from "@/lib/reading";
import { dailyGoal, dayStreak } from "@/lib/report";
import { STRANDS } from "@/lib/strands";
import { TT_LEVELS, getLevel } from "@/lib/tt";

// Strands with a placement check (phonics starts at the beginning; reading needs approved stories).
const PLACEMENT_STRANDS: PlacementStrand[] = ["tt", "as", "sp", "gp"];

export default function ChildHome() {
  const { id } = useParams<{ id: string }>();
  const state = useAppState();
  if (!state) return null;
  const child = state.children.find((c) => c.id === id);
  const tt = state.tt[id];
  if (!child || !tt) return <NotFound />;

  const current = getLevel(tt.current)!;
  const today = new Date().toDateString();
  const doneToday = state.attempts.filter((a) => a.childId === id && new Date(a.finishedAt).toDateString() === today).length;
  // Handwriting shows for Years 1–2, or for anyone who has already started it.
  const showHw = child.schoolYear <= 2 || !!state.hw?.[id];
  const hwLetter = currentLetter(state, id);
  const hwStage = hwLetter ? letterProgress(state, id, hwLetter.char).stage : 4;
  const hwFamily = hwLetter ? FAMILIES.find((f) => f.id === hwLetter.family) : undefined;
  // First time in a strand with a placement check: go to the check instead.
  const checkFirst = (strand: PlacementStrand) => PLACEMENT_STRANDS.includes(strand) && needsPlacement(state, strand, id);
  const streak = dayStreak(state.attempts, id);
  const goal = dailyGoal(state, id);

  return (
    <main className="flex-1 p-6 max-w-3xl mx-auto w-full flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <Link href="/" className="text-muted font-bold text-lg" aria-label="Back">
          ← Back
        </Link>
        {streak > 0 && (
          <span className="ml-auto text-lg font-bold">
            🔥 {streak} day{streak === 1 ? "" : "s"} in a row
          </span>
        )}
      </header>

      <div className="flex items-center gap-4">
        <span className="text-7xl">{child.avatar}</span>
        <div>
          <h1 className="text-4xl font-black">Hi {child.name}!</h1>
          <p className="text-muted text-lg font-semibold">
            {doneToday === 0 ? "Ready for today's practice?" : doneToday >= goal ? "Today's goal done — brilliant! 🎉" : "Keep going — you're doing great!"}
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-card border-2 border-line px-5 py-4 flex items-center gap-4" aria-label={`Today: ${doneToday} of ${goal} sets`}>
        <span className="font-extrabold text-lg">Today</span>
        <div className="flex gap-1 text-4xl">
          {Array.from({ length: Math.max(goal, doneToday) }, (_, k) => (
            <span key={k} className={k < doneToday ? "" : "grayscale opacity-25"}>
              ⭐
            </span>
          ))}
        </div>
        <span className="ml-auto text-muted font-bold tabular-nums">
          {Math.min(doneToday, goal)} of {goal} sets
        </span>
      </div>

      {STRANDS.filter((st) => st.shownFor(child.schoolYear) || strandStarted(state, st.key, id)).map((st) => {
        const current = strandProgress(state, st.key, id).current;
        const lvl = st.levels.find((l) => l.id === current);
        if (!lvl) return null;
        if (st.key === "rc" && approvedPassages(current, state.rcReview).length === 0) return null;
        return (
          <section key={st.key} className="rounded-3xl p-6 bg-card border-4 flex items-center gap-6" style={{ borderColor: child.color }}>
            <div
              className="w-28 h-28 shrink-0 rounded-2xl flex items-center justify-center text-5xl font-black text-white"
              style={{ background: child.color }}
              aria-hidden
            >
              {st.icon}
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <p className="font-bold text-muted">
                {st.name} · {lvl.id}
              </p>
              <h2 className="text-3xl font-black">{lvl.title}</h2>
              {lvl.grownUp && <p className="text-muted font-semibold">Needs a grown-up to listen</p>}
            </div>
            <Link
              href={checkFirst(st.key) ? `/child/${id}/check/${st.key}` : `/child/${id}/${st.path}`}
              className="h-16 px-8 rounded-2xl text-white text-2xl font-extrabold flex items-center shadow-[0_5px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none"
              style={{ background: child.color }}
            >
              {checkFirst(st.key) ? "Let's go ▶" : st.button}
            </Link>
          </section>
        );
      })}

      {showHw && (
        <section className="rounded-3xl p-6 bg-card border-4 flex items-center gap-6" style={{ borderColor: child.color }}>
          <div
            className="w-28 h-28 shrink-0 rounded-2xl flex items-center justify-center text-7xl font-black text-white"
            style={{ background: child.color }}
            aria-hidden
          >
            {hwLetter?.char ?? "✓"}
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <p className="font-bold text-muted">Handwriting ✏️ · {lettersMastered(state, id)}/26 letters</p>
            <h2 className="text-3xl font-black">
              {hwLetter ? `Letter “${hwLetter.char}”` : "All letters learned!"}
            </h2>
            {hwLetter && (
              <p className="text-muted font-semibold">
                {hwFamily?.name} · {({ 1: "trace it", 2: "trace the faint one", 3: "write it alone", 4: "" } as const)[hwStage]}
              </p>
            )}
          </div>
          {hwLetter && (
            <Link
              href={`/child/${id}/letters`}
              className="h-16 px-8 rounded-2xl text-white text-2xl font-extrabold flex items-center shadow-[0_5px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none"
              style={{ background: child.color }}
            >
              Write ▶
            </Link>
          )}
        </section>
      )}

      <section className="rounded-3xl p-6 text-white flex flex-col gap-4" style={{ background: child.color }}>
        <p className="font-bold opacity-90">Times tables · {current.id}</p>
        <h2 className="text-4xl font-black">{current.title}</h2>
        <p className="opacity-90 font-semibold">
          {current.setSize} questions · aim for{" "}
          {current.secondsPerQuestion + (getInputMode(state, id) === "pencil" && !current.hardLimit ? PENCIL_EXTRA_SECONDS : 0)} seconds each
          {getInputMode(state, id) === "pencil" && !current.hardLimit && " · ✏️ Pencil"}
          {tt.passStreak > 0 && " · 1 more great set to pass!"}
        </p>
        <Link
          href={checkFirst("tt") ? `/child/${id}/check/tt` : `/child/${id}/practice`}
          className="self-start mt-2 h-16 px-10 rounded-2xl bg-white text-ink text-2xl font-extrabold flex items-center shadow-[0_5px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none"
        >
          {checkFirst("tt") ? "Let's go ▶" : "Start ▶"}
        </Link>
      </section>

      <section>
        <h3 className="text-xl font-extrabold mb-3">My journey</h3>
        <ol className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {TT_LEVELS.map((l) => {
            const passed = tt.passed.includes(l.id) || l.order < current.order;
            const isCurrent = l.id === current.id;
            return (
              <li
                key={l.id}
                title={l.title}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center font-extrabold border-2 ${
                  isCurrent ? "text-white border-transparent" : passed ? "bg-card border-good text-good" : "bg-card border-line text-muted"
                }`}
                style={isCurrent ? { background: child.color } : undefined}
              >
                <span className="text-xl">{passed && !isCurrent ? "✓" : isCurrent ? "★" : l.order}</span>
                <span className="text-[10px] font-bold opacity-80">{l.id}</span>
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}

function NotFound() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-4">
      <p className="text-xl font-bold">We couldn&apos;t find that child.</p>
      <Link href="/" className="text-brand underline">
        Go home
      </Link>
    </main>
  );
}
