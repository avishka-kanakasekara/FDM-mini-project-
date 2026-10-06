import { MONTH_OPTIONS } from "../../constants/datasetOptions";
import type { BatchRecord } from "../../types/prediction";
import { formatThreshold } from "../../utils/format";

const BANDS = [
  { label: "0–20%", min: 0, max: 0.2 },
  { label: "20–40%", min: 0.2, max: 0.4 },
  { label: "40–60%", min: 0.4, max: 0.6 },
  { label: "60–70%", min: 0.6, max: 0.7 },
  { label: "70–85%", min: 0.7, max: 0.85 },
  { label: "85–100%", min: 0.85, max: 1.000001 },
];

export function ScoreCharts({ records, threshold }: { records: BatchRecord[]; threshold: number }) {
  const total = records.length;
  const priority = records.filter((record) => record.above_threshold).length;
  const later = total - priority;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const priorityLength = total === 0 ? 0 : (priority / total) * circumference;
  const laterLength = circumference - priorityLength;
  const bandCounts = BANDS.map((band) => ({
    ...band,
    count: records.filter((record) => record.probability >= band.min && record.probability < band.max).length,
  }));
  const maxBand = Math.max(1, ...bandCounts.map((band) => band.count));
  const months = MONTH_OPTIONS.map((option) => {
    const rows = records.filter((record) => record.month === option.value);
    return {
      label: option.label,
      priority: rows.filter((record) => record.above_threshold).length,
      later: rows.filter((record) => !record.above_threshold).length,
    };
  }).filter((month) => month.priority + month.later > 0);
  const maxMonth = Math.max(1, ...months.map((month) => month.priority + month.later));

  if (total === 0) {
    return null;
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]" aria-label="Score charts">
      <article className="panel p-5">
        <h2 className="font-serif text-2xl">Who to call first</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Split at the {formatThreshold(threshold)} outreach line. The lower group stays for a later pass.
        </p>
        <div className="mt-5 flex items-center gap-5">
          <svg viewBox="0 0 120 120" className="h-32 w-32 shrink-0" role="img" aria-label={`${priority} contact first, ${later} contact later`}>
            <circle cx="60" cy="60" r={radius} fill="none" className="stroke-paper" strokeWidth="14" />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              className="stroke-leaf"
              strokeWidth="14"
              strokeDasharray={`${priorityLength} ${circumference}`}
              transform="rotate(-90 60 60)"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              className="stroke-brass"
              strokeWidth="14"
              strokeDasharray={`${laterLength} ${circumference}`}
              strokeDashoffset={-priorityLength}
              transform="rotate(-90 60 60)"
            />
            <text x="60" y="56" textAnchor="middle" className="fill-ink text-[18px] font-semibold">
              {total}
            </text>
            <text x="60" y="72" textAnchor="middle" className="fill-muted text-[9px]">
              scored
            </text>
          </svg>
          <ul className="space-y-3 text-sm">
            <li>
              <p className="font-semibold text-leaf">Contact first</p>
              <p className="text-muted">
                {priority.toLocaleString()} · {((priority / total) * 100).toFixed(1)}%
              </p>
            </li>
            <li>
              <p className="font-semibold text-brass">Contact later</p>
              <p className="text-muted">
                {later.toLocaleString()} · {((later / total) * 100).toFixed(1)}%
              </p>
            </li>
          </ul>
        </div>
      </article>

      <article className="panel p-5">
        <h2 className="font-serif text-2xl">Score distribution</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Each bar is how many customers fall in that estimated probability band. Green bands are at or above the outreach line.
        </p>
        <ul className="mt-4 space-y-2">
          {bandCounts.map((band) => (
            <li key={band.label} className="grid grid-cols-[4.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm">
              <span className="text-muted">{band.label}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-paper">
                <span
                  className={`block h-full rounded-full ${band.min >= 0.7 ? "bg-leaf" : "bg-brass"}`}
                  style={{ width: `${(band.count / maxBand) * 100}%` }}
                />
              </span>
              <span className="text-right font-semibold">{band.count}</span>
            </li>
          ))}
        </ul>
      </article>

      {months.length > 0 ? (
        <article className="panel p-5 xl:col-span-2">
          <h2 className="font-serif text-2xl">Campaign months in this file</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Green is contact first. Gold is contact later. A later bar is still a customer to keep, not a refusal.
          </p>
          <ul className="mt-4 space-y-3">
            {months.map((month) => {
              const totalMonth = month.priority + month.later;
              return (
                <li key={month.label} className="grid grid-cols-[5.5rem_minmax(0,1fr)_3rem] items-center gap-3 text-sm">
                  <span>{month.label}</span>
                  <span className="flex h-3 overflow-hidden rounded-full bg-paper" style={{ width: `${(totalMonth / maxMonth) * 100}%` }}>
                    <span className="h-full bg-leaf" style={{ width: `${(month.priority / totalMonth) * 100}%` }} />
                    <span className="h-full bg-brass" style={{ width: `${(month.later / totalMonth) * 100}%` }} />
                  </span>
                  <span className="text-right font-semibold">{totalMonth}</span>
                </li>
              );
            })}
          </ul>
        </article>
      ) : null}
    </section>
  );
}
