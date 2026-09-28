import ClockFace from "@/components/ClockFace";
import { timeWords } from "@/lib/mt-time";

const TIMES = [
  { hours: 3, minutes: 0 },
  { hours: 7, minutes: 30 },
  { hours: 4, minutes: 15 },
  { hours: 3, minutes: 45 },
  { hours: 8, minutes: 25 },
  { hours: 12, minutes: 55 },
  { hours: 9, minutes: 37 },
];

export default function DevClock() {
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-4xl font-black">Clock face</h1>
      <p className="text-muted font-semibold">Dev page — not linked from anywhere. Caption under each clock is timeWords().</p>
      <div className="flex flex-wrap items-end gap-8">
        {TIMES.map((t) => (
          <figure key={`${t.hours}:${t.minutes}`} className="flex flex-col items-center gap-2">
            <ClockFace {...t} size={180} />
            <figcaption className="font-bold">
              {t.hours}:{String(t.minutes).padStart(2, "0")} — {timeWords(t.hours, t.minutes)}
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
