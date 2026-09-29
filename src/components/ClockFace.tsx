import { timeWords } from "../lib/mt-time";

/**
 * Pure-SVG analogue clock, crisp at any size (viewBox 0 0 100 100).
 * Hour hand is short, thick and brand-coloured; minute hand long, thin and
 * ink-coloured, so the two are never confused. Colours come from the app's
 * CSS variables (--ink, --line, --brand, --card).
 */
export default function ClockFace({ hours, minutes, size = 280 }: { hours: number; minutes: number; size?: number | string }) {
  const hourAngle = ((hours % 12) * 30 + minutes * 0.5 - 90) * (Math.PI / 180);
  const minuteAngle = (minutes * 6 - 90) * (Math.PI / 180);
  const hand = (angle: number, length: number, back: number) => ({
    x1: 50 - Math.cos(angle) * back,
    y1: 50 - Math.sin(angle) * back,
    x2: 50 + Math.cos(angle) * length,
    y2: 50 + Math.sin(angle) * length,
  });
  const hour = hand(hourAngle, 24, 4);
  const minute = hand(minuteAngle, 37, 4);

  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = (i * 6 - 90) * (Math.PI / 180);
    const big = i % 5 === 0;
    const r1 = big ? 41.5 : 44;
    return {
      x1: 50 + Math.cos(a) * r1,
      y1: 50 + Math.sin(a) * r1,
      x2: 50 + Math.cos(a) * 46,
      y2: 50 + Math.sin(a) * 46,
      big,
    };
  });

  return (
    <svg
      role="img"
      aria-label={`clock showing ${timeWords(hours, minutes)}`}
      viewBox="0 0 100 100"
      width={size}
      height={size}
    >
      <circle cx={50} cy={50} r={48.5} fill="var(--card, #ffffff)" stroke="var(--line, #e5e1d8)" strokeWidth={2} />
      {ticks.map((t, i) => (
        <line
          key={i}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
          stroke={t.big ? "var(--ink, #1f2430)" : "var(--line, #e5e1d8)"}
          strokeWidth={t.big ? 2 : 1}
          strokeLinecap="round"
        />
      ))}
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1;
        const a = (n * 30 - 90) * (Math.PI / 180);
        return (
          <text
            key={n}
            x={50 + Math.cos(a) * 33}
            y={50 + Math.sin(a) * 33}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10}
            fontWeight={700}
            fill="var(--ink, #1f2430)"
          >
            {n}
          </text>
        );
      })}
      <line {...hour} stroke="var(--brand, #2563eb)" strokeWidth={5} strokeLinecap="round" />
      <line {...minute} stroke="var(--ink, #1f2430)" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={50} cy={50} r={2.5} fill="var(--brand, #2563eb)" />
    </svg>
  );
}
