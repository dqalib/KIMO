"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppState } from "@/lib/store";

export default function Home() {
  const state = useAppState();
  const router = useRouter();

  useEffect(() => {
    if (state && (!state.parentPinHash || state.children.length === 0)) router.replace("/setup");
  }, [state, router]);

  if (!state || state.children.length === 0) return null;

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-10 p-6">
      <h1 className="text-4xl sm:text-5xl font-black">Who&apos;s practising?</h1>
      <div className="flex flex-wrap justify-center gap-6">
        {state.children.map((c) => (
          <Link
            key={c.id}
            href={`/child/${c.id}`}
            className="w-48 h-56 rounded-3xl bg-card border-4 flex flex-col items-center justify-center gap-3 shadow-[0_6px_0_var(--line)] active:translate-y-1 active:shadow-none transition-transform"
            style={{ borderColor: c.color }}
          >
            <span className="text-7xl">{c.avatar}</span>
            <span className="text-2xl font-extrabold">{c.name}</span>
            <span className="text-muted font-semibold">Year {c.schoolYear}</span>
          </Link>
        ))}
      </div>
      <Link href="/parent" className="text-muted underline underline-offset-4 font-semibold mt-4">
        Grown-ups
      </Link>
    </main>
  );
}
