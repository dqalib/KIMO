"use client";

// Grown-up review of reading passages: read each draft (text + questions with
// the right answer marked), then approve or reject. Only approved passages are
// ever shown to the children. Decisions sync between devices.

import { useState } from "react";
import { PASSAGES, RC_LEVELS, type Passage, type Reviews } from "@/lib/reading";
import { reviewPassage } from "@/lib/store";

export default function PassageReview({ reviews }: { reviews: Reviews }) {
  const [open, setOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const pending = PASSAGES.filter((p) => !reviews[p.id]);
  const approved = PASSAGES.filter((p) => reviews[p.id]?.status === "approved").length;
  const rejected = PASSAGES.filter((p) => reviews[p.id]?.status === "rejected").length;
  const list = showDone ? PASSAGES.filter((p) => reviews[p.id]) : pending;

  return (
    <section className="rounded-3xl bg-card border-2 border-line p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-black">📚 Reading stories</h2>
        <span className="text-muted font-semibold">
          {pending.length} to check · {approved} approved · {rejected} rejected
        </span>
        <button className="ml-auto h-11 px-4 rounded-xl bg-brand text-white font-bold" onClick={() => setOpen(!open)}>
          {open ? "Close" : pending.length ? `Check stories (${pending.length})` : "See stories"}
        </button>
      </div>

      {open && (
        <>
          <p className="text-muted">
            Children only ever see stories you approve. Check that the story is suitable and each question has one clear right answer (marked ✓).
          </p>
          <div className="flex gap-2">
            <button className={`px-4 h-10 rounded-xl font-bold ${!showDone ? "bg-ink text-white" : "bg-card border-2 border-line"}`} onClick={() => setShowDone(false)}>
              To check ({pending.length})
            </button>
            <button className={`px-4 h-10 rounded-xl font-bold ${showDone ? "bg-ink text-white" : "bg-card border-2 border-line"}`} onClick={() => setShowDone(true)}>
              Already checked ({approved + rejected})
            </button>
          </div>
          {list.length === 0 && <p className="font-semibold">{PASSAGES.length ? "Nothing here." : "No stories yet — Kimi is writing them."}</p>}
          {list.map((p) => (
            <PassageCard key={p.id} p={p} status={reviews[p.id]?.status} />
          ))}
        </>
      )}
    </section>
  );
}

function PassageCard({ p, status }: { p: Passage; status?: "approved" | "rejected" }) {
  const level = RC_LEVELS.find((l) => l.id === p.level);
  return (
    <article className="rounded-2xl border-2 border-line p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h3 className="text-xl font-black">{p.title}</h3>
        <span className="text-sm text-muted font-semibold">
          {p.level} (Year {level?.year}) · {p.kind} · {p.theme} · {p.wordCount} words
        </span>
      </div>
      <div className="flex flex-col gap-2 leading-relaxed">
        {p.text.split(/\n\n+/).map((para, k) => (
          <p key={k}>{para}</p>
        ))}
      </div>
      <ol className="list-decimal pl-6 flex flex-col gap-2">
        {p.questions.map((q, k) => (
          <li key={k}>
            <span className="font-bold">{q.prompt}</span> <span className="text-xs text-muted">({q.skill})</span>
            <ul className="pl-2">
              {q.options.map((o, j) => (
                <li key={j} className={j === q.answer ? "text-good font-bold" : "text-muted"}>
                  {j === q.answer ? "✓ " : "· "}
                  {o}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-3 items-center">
        {status ? (
          <>
            <span className={`font-bold ${status === "approved" ? "text-good" : "text-bad"}`}>{status === "approved" ? "✓ Approved" : "✗ Rejected"}</span>
            <button className="h-10 px-4 rounded-xl border-2 border-line font-bold" onClick={() => reviewPassage(p.id, null)}>
              Undo
            </button>
          </>
        ) : (
          <>
            <button className="h-12 px-6 rounded-xl bg-good text-white font-extrabold" onClick={() => reviewPassage(p.id, "approved")}>
              ✓ Approve
            </button>
            <button className="h-12 px-6 rounded-xl border-2 border-line font-extrabold" onClick={() => reviewPassage(p.id, "rejected")}>
              ✗ Reject
            </button>
          </>
        )}
      </div>
    </article>
  );
}
