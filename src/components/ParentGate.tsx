"use client";

import { useCallback, useState } from "react";
import NumberPad from "./NumberPad";
import { checkParentPin, unlockSetup } from "@/lib/store";

/** Asks for the 4-digit parent PIN before showing children. */
export default function ParentGate({ children }: { children: React.ReactNode }) {
  const [pin, setPin] = useState("");
  const [ok, setOk] = useState(false);
  const [error, setError] = useState(false);

  const submit = useCallback(async () => {
    if (pin.length !== 4) return;
    if (await checkParentPin(pin)) {
      unlockSetup();
      setOk(true);
    } else {
      setError(true);
      setPin("");
    }
  }, [pin]);

  const onDigit = useCallback((d: string) => {
    setError(false);
    setPin((p) => (p.length < 4 ? p + d : p));
  }, []);
  const onBack = useCallback(() => setPin((p) => p.slice(0, -1)), []);

  if (ok) return <>{children}</>;

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-extrabold">Grown-ups only</h1>
      <p className="text-muted">Enter the parent PIN</p>
      <div className={`flex gap-3 ${error ? "animate-shake" : ""}`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`w-5 h-5 rounded-full border-2 border-ink ${i < pin.length ? "bg-ink" : ""}`} />
        ))}
      </div>
      {error && <p className="text-bad font-bold">Wrong PIN — try again</p>}
      <NumberPad onDigit={onDigit} onBack={onBack} onSubmit={submit} />
    </main>
  );
}
