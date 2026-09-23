"use client";

import { useEffect } from "react";
import { startSync } from "@/lib/sync";

/** Starts cloud sync once when the app loads. Renders nothing. */
export default function SyncProvider() {
  useEffect(() => {
    startSync();
  }, []);
  return null;
}
