"use client";

// Locks the whole app behind the family sign-in (when cloud sync is set up).
// Each device signs in once and stays signed in, so children never see this.
// The real protection is in the database (Row Level Security: only the signed-in
// family can read its row); this screen just keeps strangers out of the app.

import { useEffect, useState, type ReactNode } from "react";
import { SignInForm } from "@/components/SyncPanel";
import { getState } from "@/lib/store";
import { isSyncConfigured, useSyncInfo } from "@/lib/sync";

/** A saved Supabase session in this browser (used only if the sign-in check hangs, e.g. on a bad connection). */
function hasSavedSession(): boolean {
  try {
    return Object.keys(localStorage).some((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
  } catch {
    return false;
  }
}

function Splash({ text }: { text: string }) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="text-6xl animate-pulse">🦉</span>
      <p className="text-xl font-bold text-muted">{text}</p>
    </main>
  );
}

export default function SignInGate({ children }: { children: ReactNode }) {
  const info = useSyncInfo();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(t);
  }, []);

  if (!isSyncConfigured()) return <>{children}</>;

  if (info.status === "checking") {
    if (slow && hasSavedSession()) return <>{children}</>;
    return <Splash text="Opening KIMO…" />;
  }

  if (info.status === "signedOut") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 max-w-md mx-auto w-full">
        <h1 className="text-5xl font-black">KIMO</h1>
        <p className="text-lg font-semibold text-muted text-center">A grown-up needs to sign in once on this device.</p>
        <SignInForm compact />
      </main>
    );
  }

  // Signed in: wait for the first sync before showing pages, so a new device
  // loads the family instead of jumping to "set up a new family".
  const hasFamily = getState().children.length > 0;
  if (!info.ready && !hasFamily && !slow) return <Splash text="Loading your family…" />;

  return <>{children}</>;
}
