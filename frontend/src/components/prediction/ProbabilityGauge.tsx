interface ProbabilityGaugeProps {
  probability: number;
  priority: boolean;
}

export function ProbabilityGauge({ probability, priority }: ProbabilityGaugeProps) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, probability));
  const offset = circumference * (1 - clamped);

  return (
    <div className="relative h-44 w-44" aria-hidden="true">
      <div
        className={`absolute inset-3 rounded-full blur-xl ${priority ? "bg-leaf/25" : "bg-brass/20"}`}
      />
      <svg viewBox="0 0 140 140" className="relative h-full w-full -rotate-90">
        <defs>
          <linearGradient id="gauge-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={priority ? "#3dcea0" : "#e2b56a"} />
            <stop offset="100%" stopColor={priority ? "#0c6d4c" : "#a56b32"} />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r={radius} fill="white" stroke="#e6eeea" strokeWidth="12" />
        <circle
          className="gauge-arc"
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="url(#gauge-fill)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <p className="font-serif text-4xl tracking-tight text-ink">{(clamped * 100).toFixed(1)}%</p>
      </div>
    </div>
  );
}
