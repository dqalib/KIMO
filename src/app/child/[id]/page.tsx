"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppState } from "@/lib/store";
import { TT_LEVELS, getLevel } from "@/lib/tt";

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
  const streak = dayStreak(state.attempts.filter((a) => a.childId === id).map((a) => a.finishedAt));

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
            {doneToday === 0 ? "Ready for today's practice?" : `${doneToday} set${doneToday === 1 ? "" : "s"} done today — brilliant!`}
          </p>
        </div>
      </div>

      <section className="rounded-3xl p-6 text-white flex flex-col gap-4" style={{ background: child.color }}>
        <p className="font-bold opacity-90">Times tables · {current.id}</p>
        <h2 className="text-4xl font-black">{current.title}</h2>
        <p className="opacity-90 font-semibold">
          {current.setSize} questions · aim for {current.secondsPerQuestion} seconds each
          {tt.passStreak > 0 && " · 1 more great set to pass!"}
        </p>
        <Link
          href={`/child/${id}/practice`}
          className="self-start mt-2 h-16 px-10 rounded-2xl bg-white text-ink text-2xl font-extrabold flex items-center shadow-[0_5px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none"
        >
          Start ▶
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

function dayStreak(isoDates: string[]): number {
  const days = new Set(isoDates.map((d) => new Date(d).toDateString()));
  let n = 0;
  const d = new Date();
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1); // today not done yet — count from yesterday
  while (days.has(d.toDateString())) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
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
