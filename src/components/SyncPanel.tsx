"use client";

import { useState } from "react";
import { isSyncConfigured, signIn, signOut, syncNow, useSyncInfo } from "@/lib/sync";

const LABEL = {
  off: "Cloud sync is not set up — progress is saved on this device only.",
  signedOut: "Not signed in — progress is saved on this device only.",
  syncing: "Syncing…",
  synced: "Synced",
  offline: "Offline — will sync when back online.",
  error: "Sync problem",
} as const;

export default function SyncPanel({ compact = false }: { compact?: boolean }) {
  const info = useSyncInfo();

  if (!isSyncConfigured()) {
    return compact ? null : <p className="text-sm text-muted">{LABEL.off}</p>;
  }

  if (info.status === "signedOut") return <SignInForm compact={compact} />;

  const dot =
    info.status === "synced" ? "bg-good" : info.status === "syncing" ? "bg-brand animate-pulse" : "bg-warn";

  return (
    <section className="bg-card rounded-3xl border-2 border-line p-5 flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className={`w-3 h-3 rounded-full ${dot}`} />
        <h2 className="text-lg font-extrabold">Cloud sync</h2>
        <span className="text-muted">{LABEL[info.status]}</span>
        <div className="ml-auto flex gap-2">
          <button onClick={() => void syncNow()} className="h-10 px-4 rounded-xl bg-brand text-white font-bold">
            Sync now
          </button>
          <button onClick={() => void signOut()} className="h-10 px-4 rounded-xl border-2 border-line font-bold">
            Sign out
          </button>
        </div>
      </div>
      <p className="text-sm text-muted">
        {info.email}
        {info.lastSyncedAt &&
          ` · last synced ${new Date(info.lastSyncedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
      </p>
      {info.error && <p className="text-sm text-bad">{info.error}</p>}
    </section>
  );
}

export function SignInForm({ compact = false, onSignedIn }: { compact?: boolean; onSignedIn?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const err = await signIn(email, password);
    setError(err);
    setBusy(false);
    if (!err) onSignedIn?.();
  }

  return (
    <form onSubmit={submit} className="bg-card rounded-3xl border-2 border-line p-5 flex flex-col gap-3 w-full">
      <h2 className="text-lg font-extrabold">{compact ? "Sign in to load your family" : "Cloud sync"}</h2>
      <p className="text-sm text-muted">
        Sign in with the parent account to keep progress safe and shared between devices.
      </p>
      <input
        className="text-lg p-3 rounded-xl border-2 border-line"
        type="email"
        autoComplete="username"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="text-lg p-3 rounded-xl border-2 border-line"
        type="password"
        autoComplete="current-password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p className="text-bad font-bold text-sm">{error}</p>}
      <button disabled={busy} className="h-12 rounded-xl bg-brand text-white text-lg font-extrabold disabled:opacity-50">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
