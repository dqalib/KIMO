"use client";

// Cloud sync with Supabase.
// - The family's whole data set is one JSON row in `family_state`, owned by the parent's account
//   (see supabase/schema.sql — Row Level Security means only that account can read or write it).
// - Each device keeps working offline from localStorage. Sync pulls the cloud copy, merges
//   (src/lib/merge.ts), saves the result locally and uploads it.
// - If the Supabase env vars aren't set, sync is simply switched off and the app works locally.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { mergeStates, sameState } from "./merge";
import { getState, onLocalSave, replaceFromSync } from "./store";
import type { AppState } from "./store-types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TABLE = "family_state";

export type SyncStatus = "off" | "signedOut" | "syncing" | "synced" | "offline" | "error";

export interface SyncInfo {
  status: SyncStatus;
  email?: string;
  lastSyncedAt?: string;
  error?: string;
}

let client: SupabaseClient | null = null;
let info: SyncInfo = { status: URL && KEY ? "signedOut" : "off" };
const listeners = new Set<() => void>();

function set(next: Partial<SyncInfo>) {
  info = { ...info, ...next };
  listeners.forEach((l) => l());
}

export function isSyncConfigured() {
  return !!(URL && KEY);
}

function sb(): SupabaseClient | null {
  if (!URL || !KEY) return null;
  if (!client) client = createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}

export function useSyncInfo(): SyncInfo {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => info,
    () => info,
  );
}

// ---- core sync -------------------------------------------------------------

let running: Promise<void> | null = null;
let again = false;

export function syncNow(): Promise<void> {
  if (running) {
    again = true; // a change arrived mid-sync — run once more afterwards
    return running;
  }
  running = doSync().finally(() => {
    running = null;
    if (again) {
      again = false;
      void syncNow();
    }
  });
  return running;
}

async function doSync() {
  const c = sb();
  if (!c) return;
  const { data: sess } = await c.auth.getSession();
  const user = sess.session?.user;
  if (!user) {
    set({ status: "signedOut", email: undefined });
    return;
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    set({ status: "offline" });
    return;
  }

  set({ status: "syncing", email: user.email ?? undefined, error: undefined });
  try {
    const { data, error } = await c.from(TABLE).select("state").eq("owner", user.id).maybeSingle();
    if (error) throw error;

    const local = getState();
    const remote = (data?.state as AppState | undefined) ?? null;
    const merged = remote ? mergeStates(local, remote) : local;

    if (!sameState(merged, local)) replaceFromSync(merged);
    if (!remote || !sameState(merged, remote)) {
      const { error: upErr } = await c
        .from(TABLE)
        .upsert({ owner: user.id, state: merged, updated_at: new Date().toISOString() }, { onConflict: "owner" });
      if (upErr) throw upErr;
    }
    set({ status: "synced", lastSyncedAt: new Date().toISOString() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String(e.message) : String(e);
    set({ status: navigator.onLine ? "error" : "offline", error: msg });
  }
}

// ---- auth ------------------------------------------------------------------

export async function signIn(email: string, password: string): Promise<string | null> {
  const c = sb();
  if (!c) return "Cloud sync isn't set up yet.";
  const { error } = await c.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return error.message === "Invalid login credentials" ? "Wrong email or password." : error.message;
  await syncNow();
  return null;
}

export async function signOut() {
  const c = sb();
  if (!c) return;
  await c.auth.signOut();
  set({ status: "signedOut", email: undefined, lastSyncedAt: undefined });
}

// ---- lifecycle -------------------------------------------------------------

let started = false;

/** Call once on app load (SyncProvider does this). */
export function startSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  const c = sb();
  if (!c) return;

  // Don't call other Supabase methods inside the auth callback itself — defer them.
  c.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      set({ status: "signedOut", email: undefined });
      return;
    }
    if (event === "INITIAL_SESSION" || event === "SIGNED_IN") setTimeout(() => void syncNow(), 0);
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  onLocalSave(() => {
    clearTimeout(timer);
    timer = setTimeout(() => void syncNow(), 1500);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void syncNow();
  });
  window.addEventListener("online", () => void syncNow());
  setInterval(() => {
    if (document.visibilityState === "visible") void syncNow();
  }, 5 * 60_000);
}
