"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ParentGate from "@/components/ParentGate";
import { SignInForm } from "@/components/SyncPanel";
import { isSyncConfigured } from "@/lib/sync";
import { AVATARS, COLORS, addChild, isSetupUnlocked, setParentPin, unlockSetup, useAppState } from "@/lib/store";
import { TT_LEVELS, defaultStartLevel } from "@/lib/tt";

export default function SetupPage() {
  const state = useAppState();
  if (!state) return null;
  if (!state.parentPinHash) return <CreatePin />;
  // First-run setup stays unlocked for the visit, so adding several children in a row
  // doesn't ask for the PIN after the first one. Later visits need the PIN.
  if (state.children.length === 0 || isSetupUnlocked()) return <AddChildren />;
  return (
    <ParentGate>
      <AddChildren />
    </ParentGate>
  );
}

function CreatePin() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const valid = /^\d{4}$/.test(pin) && pin === confirm;

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 max-w-md mx-auto w-full">
      <h1 className="text-4xl font-black">Welcome to KIMO</h1>
      <p className="text-muted text-center">
        First, choose a 4-digit parent PIN. It protects settings and the progress dashboard.
      </p>
      <input
        className="w-full text-center text-3xl tracking-[0.5em] p-4 rounded-2xl border-2 border-line bg-card"
        inputMode="numeric"
        type="password"
        maxLength={4}
        placeholder="PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
      />
      <input
        className="w-full text-center text-3xl tracking-[0.5em] p-4 rounded-2xl border-2 border-line bg-card"
        inputMode="numeric"
        type="password"
        maxLength={4}
        placeholder="Again"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
      />
      <button
        disabled={!valid}
        onClick={() => setParentPin(pin)}
        className="w-full h-16 rounded-2xl bg-brand text-white text-2xl font-extrabold disabled:opacity-40"
      >
        Save PIN
      </button>
      {isSyncConfigured() && (
        <details className="w-full mt-4">
          <summary className="text-center text-brand font-bold cursor-pointer">
            Already using KIMO on another device? Sign in
          </summary>
          <div className="mt-3">
            <SignInForm compact onSignedIn={() => router.replace("/")} />
          </div>
        </details>
      )}
    </main>
  );
}

function AddChildren() {
  const state = useAppState()!;
  const [name, setName] = useState("");
  const [year, setYear] = useState(3);
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [color, setColor] = useState(COLORS[state.children.length % COLORS.length]);
  const [start, setStart] = useState<string>("");

  function add() {
    unlockSetup();
    addChild({ name: name.trim(), schoolYear: year, avatar, color }, start || defaultStartLevel(year));
    setName("");
    setStart("");
    setColor(COLORS[(state.children.length + 1) % COLORS.length]);
  }

  return (
    <main className="flex-1 p-6 max-w-2xl mx-auto w-full flex flex-col gap-6">
      <h1 className="text-3xl font-black">Children</h1>

      {state.children.length > 0 && (
        <ul className="flex flex-col gap-2">
          {state.children.map((c) => (
            <li key={c.id} className="flex items-center gap-3 bg-card rounded-2xl p-3 border-2 border-line">
              <span className="text-3xl">{c.avatar}</span>
              <span className="font-extrabold text-xl">{c.name}</span>
              <span className="text-muted">Year {c.schoolYear}</span>
              <span className="ml-auto w-5 h-5 rounded-full" style={{ background: c.color }} />
            </li>
          ))}
        </ul>
      )}

      <section className="bg-card rounded-3xl p-5 border-2 border-line flex flex-col gap-4">
        <h2 className="text-xl font-extrabold">Add a child</h2>
        <input
          className="text-2xl p-3 rounded-xl border-2 border-line"
          placeholder="First name"
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="flex items-center gap-3 font-bold">
          School year
          <select
            className="text-xl p-2 rounded-xl border-2 border-line bg-card"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6].map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              className={`text-4xl w-16 h-16 rounded-2xl border-4 ${avatar === a ? "border-brand" : "border-transparent"}`}
              aria-label={`Avatar ${a}`}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-11 h-11 rounded-full border-4 ${color === c ? "border-ink" : "border-transparent"}`}
              style={{ background: c }}
              aria-label={`Colour ${c}`}
            />
          ))}
        </div>
        <label className="flex flex-col gap-1 font-bold">
          Times tables start level
          <select
            className="text-lg p-2 rounded-xl border-2 border-line bg-card"
            value={start || defaultStartLevel(year)}
            onChange={(e) => setStart(e.target.value)}
          >
            {TT_LEVELS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id} · {l.title}
              </option>
            ))}
          </select>
          <span className="text-sm text-muted font-normal">
            Tip: start a little below where they are — early wins build confidence.
          </span>
        </label>
        <button
          disabled={!name.trim()}
          onClick={add}
          className="h-14 rounded-2xl bg-brand text-white text-xl font-extrabold disabled:opacity-40"
        >
          Add child
        </button>
      </section>

      {state.children.length > 0 && (
        <Link href="/" className="h-14 rounded-2xl bg-good text-white text-xl font-extrabold flex items-center justify-center">
          Done
        </Link>
      )}
    </main>
  );
}
