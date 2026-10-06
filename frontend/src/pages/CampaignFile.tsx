import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { recordToRequest, recordToResult } from "../campaign/batchRecord";
import { customerSummary } from "../campaign/briefing";
import { useCallList } from "../campaign/callList";
import { useCampaignResult } from "../campaign/campaignResult";
import { ScoreCharts } from "../components/campaign/ScoreCharts";
import { Button } from "../components/ui/Button";
import { useToast } from "../components/ui/Toast";
import { ApiError, scoreCampaignFile } from "../services/api";
import type { BatchRecord } from "../types/prediction";
import { formatPercent, formatThreshold } from "../utils/format";

const PAGE_SIZE = 20;

type GroupFilter = "all" | "priority" | "lower_priority" | "remaining";

function downloadScores(records: BatchRecord[]) {
  const columns = [
    "row_number",
    "probability",
    "decision",
    "decision_label",
    "age",
    "job",
    "marital",
    "education",
    "default",
    "housing",
    "loan",
    "contact",
    "month",
    "day_of_week",
    "campaign",
    "pdays",
    "previous",
    "poutcome",
    "emp.var.rate",
    "cons.price.idx",
    "cons.conf.idx",
    "euribor3m",
    "nr.employed",
  ] as const;
  const lines = [columns.join(",")];
  records.forEach((record) => {
    lines.push(columns.map((column) => String(record[column])).join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "bankreach-campaign-scores.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function CampaignFile() {
  const callList = useCallList();
  const campaignResult = useCampaignResult();
  const { notify } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const result = campaignResult.saved?.result ?? null;
  const [error, setError] = useState<string | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [filter, setFilter] = useState<GroupFilter>("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);

  const listedKeys = useMemo(
    () => new Set(callList.items.map((item) => JSON.stringify(item.request))),
    [callList.items],
  );

  function isListed(record: BatchRecord): boolean {
    return listedKeys.has(JSON.stringify(recordToRequest(record)));
  }

  const filtered = useMemo(() => {
    if (!result) {
      return [];
    }
    const needle = query.trim().toLowerCase();
    return result.records.filter((record) => {
      if (filter === "remaining" && listedKeys.has(JSON.stringify(recordToRequest(record)))) {
        return false;
      }
      if (filter !== "all" && filter !== "remaining" && record.decision !== filter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      const summary = customerSummary(record).toLowerCase();
      return summary.includes(needle) || String(record.row_number).includes(needle) || record.job.includes(needle);
    });
  }, [filter, listedKeys, query, result]);

  const visible = filtered.slice(0, shown);
  const hidden = filtered.length - visible.length;
  const listedInFile = result?.records.filter((record) => listedKeys.has(JSON.stringify(recordToRequest(record)))).length ?? 0;
  const remainingInFile = (result?.records.length ?? 0) - listedInFile;

  function addRecords(records: BatchRecord[], success: string) {
    if (!result || records.length === 0) {
      return;
    }
    const outcome = callList.addMany(
      records.map((record) => ({
        request: recordToRequest(record),
        result: recordToResult(record, result.summary),
      })),
    );
    notify(outcome.added === 0 && outcome.updated > 0 ? "Those customers were already on today's call list." : success);
  }

  async function scoreFile() {
    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }
    setIsScoring(true);
    setError(null);
    try {
      const scored = await scoreCampaignFile(file);
      campaignResult.save(file.name, scored);
      setFilter("all");
      setQuery("");
      setShown(PAGE_SIZE);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "The file could not be scored.");
    } finally {
      setIsScoring(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Campaign file</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">Score a whole list</h1>
        <p className="mt-3 text-base leading-7 text-muted">
          Upload a customer file and BankReach estimates a subscription probability for every valid row, using the same saved model as a single prediction. The file is then split into who to call first and who to keep for a later pass.
        </p>
      </header>

      <section className="panel p-6">
        <h2 className="font-serif text-2xl">Upload the campaign file</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Use a CSV with one customer per row and the 19 columns the model expects, including <span className="font-medium text-ink">admin.</span> with the dot. A semicolon or comma file both work. If the file also contains call duration or a subscription outcome, those columns are ignored.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[16rem] flex-1">
            <label htmlFor="campaign-file" className="text-sm font-semibold">
              Customer file
            </label>
            <input
              id="campaign-file"
              className="field"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError(null);
              }}
            />
          </div>
          <Button type="button" disabled={!file || isScoring} onClick={scoreFile}>
            {isScoring ? "Scoring every row..." : "Score file"}
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted">
          {file
            ? `${file.name} selected.`
            : campaignResult.saved
              ? `${campaignResult.saved.fileName} is the last scored file. These results stay when you open another page or reload this one.`
              : !campaignResult.ready
                ? "Loading the last scored file..."
                : "No file selected."}{" "}
          The two groups are an outreach order. A lower priority is not a bad customer and is not a refusal.
        </p>
        {error ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      {result ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Rows in the file</p>
              <p className="mt-2 font-serif text-4xl">{result.summary.file_rows.toLocaleString()}</p>
              <p className="mt-2 text-sm text-muted">{result.summary.scored_rows.toLocaleString()} scored</p>
            </article>
            <article className="panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Average estimate</p>
              <p className="mt-2 font-serif text-4xl">
                {result.summary.average_probability === null ? "—" : formatPercent(result.summary.average_probability)}
              </p>
              <p className="mt-2 text-sm text-muted">Outreach line {formatThreshold(result.summary.threshold)}</p>
            </article>
            {result.summary.groups.map((group) => (
              <article
                key={group.decision}
                className={group.decision === "priority" ? "panel bg-gradient-to-br from-white to-leaf-soft p-5" : "panel p-5"}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{group.label}</p>
                <p className={`mt-2 font-serif text-4xl ${group.decision === "priority" ? "text-leaf" : "text-brass"}`}>
                  {group.count.toLocaleString()}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {(group.share * 100).toFixed(1)}% of scored rows
                  {group.average_probability === null ? "" : ` · average ${formatPercent(group.average_probability)}`}
                </p>
              </article>
            ))}
          </section>

          <ScoreCharts records={result.records} threshold={result.summary.threshold} />

          <section className="panel p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl">Today's call list</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
                  {listedInFile.toLocaleString()} from this file {listedInFile === 1 ? "is" : "are"} already on the list. {remainingInFile.toLocaleString()} scored {remainingInFile === 1 ? "customer is" : "customers are"} still to add. Adding a customer does not remove them from the file.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={result.records.every((record) => record.decision !== "priority" || isListed(record))}
                  onClick={() =>
                    addRecords(
                      result.records.filter((record) => record.decision === "priority" && !isListed(record)),
                      "Contact-first customers were added to today's call list.",
                    )
                  }
                >
                  Add contact-first customers
                </Button>
                <Link to="/call-list" className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold text-leaf hover:underline">
                  Open call list
                </Link>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            {result.summary.groups.map((group) => (
              <article key={group.decision} className="panel p-5">
                <h2 className="font-serif text-2xl">{group.label}</h2>
                <p className="mt-1 text-sm font-semibold">{group.decision_label}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{group.guidance}</p>
              </article>
            ))}
          </section>

          {result.summary.notes.length > 0 ? (
            <section className="panel p-5">
              <h2 className="text-sm font-semibold">How to read this file</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
                {result.summary.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-5 text-muted">{result.summary.disclaimer}</p>
            </section>
          ) : null}

          <section className="panel p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl">Every scored customer</h2>
                <p className="mt-1 text-sm text-muted">
                  Ordered from the highest estimated probability to the lowest. Customers not yet on the call list stay in this table. Use Still to add to see only those remaining records.
                </p>
              </div>
              <Button type="button" variant="secondary" disabled={result.records.length === 0} onClick={() => downloadScores(result.records)}>
                Download scores
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  ["all", "All scored"],
                  ["priority", "Contact first"],
                  ["lower_priority", "Contact later"],
                  ["remaining", "Still to add"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                    filter === value ? "bg-spruce text-white" : "bg-paper text-ink"
                  }`}
                  aria-pressed={filter === value}
                  onClick={() => {
                    setFilter(value);
                    setShown(PAGE_SIZE);
                  }}
                >
                  {label}
                </button>
              ))}
              <label className="sr-only" htmlFor="score-search">
                Search scored customers
              </label>
              <input
                id="score-search"
                className="field max-w-xs"
                placeholder="Search age, job, or row"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setShown(PAGE_SIZE);
                }}
              />
            </div>

            {visible.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No scored customers match this view.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.12em] text-muted">
                    <tr>
                      <th className="py-2 pr-3 font-semibold">Order</th>
                      <th className="py-2 pr-3 font-semibold">Row</th>
                      <th className="py-2 pr-3 font-semibold">Customer</th>
                      <th className="py-2 pr-3 font-semibold">Probability</th>
                      <th className="py-2 pr-3 font-semibold">Group</th>
                      <th className="py-2 font-semibold">Call list</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((record, index) => {
                      const listed = isListed(record);
                      return (
                        <tr key={record.row_number} className="border-t border-line">
                          <td className="py-3 pr-3">{index + 1}</td>
                          <td className="py-3 pr-3">{record.row_number}</td>
                          <td className="py-3 pr-3">{customerSummary(record)}</td>
                          <td className="py-3 pr-3 font-semibold">{formatPercent(record.probability)}</td>
                          <td className="py-3 pr-3">{record.decision_label}</td>
                          <td className="py-3">
                            <Button
                              type="button"
                              variant={listed ? "secondary" : "primary"}
                              disabled={listed}
                              aria-label={
                                listed
                                  ? `Row ${record.row_number} is on today's call list`
                                  : `Add row ${record.row_number} to today's call list`
                              }
                              onClick={() => addRecords([record], "Added to today's call list.")}
                            >
                              {listed ? "On the list" : "Add"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="text-muted">
                {visible.length.toLocaleString()} of {filtered.length.toLocaleString()} in this view
                {hidden > 0 ? ` · ${hidden.toLocaleString()} remaining` : ""}
              </p>
              {hidden > 0 ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => setShown((current) => current + PAGE_SIZE)}>
                    Show 20 more
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShown(filtered.length)}>
                    Show remaining records
                  </Button>
                </div>
              ) : null}
            </div>
          </section>

          {result.summary.invalid_rows > 0 ? (
            <section className="panel p-5">
              <h2 className="font-serif text-2xl">Rows that could not be scored</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {result.summary.invalid_rows.toLocaleString()} rows failed the same checks as the single-customer form. The other rows were still scored.
                {result.summary.invalid_details_truncated ? " The first 100 problems are listed." : ""}
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {result.invalid.map((row) => (
                  <li key={`${row.row_number}-${row.message}`}>
                    Row {row.row_number}: {row.message}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
