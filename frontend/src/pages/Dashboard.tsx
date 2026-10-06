import { Compass, Scale, Target, TimerReset, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getModelInfo } from "../services/api";
import type { ModelInfoResponse } from "../types/prediction";
import { formatMetric, formatThreshold } from "../utils/format";

const VALUES = [
  {
    title: "Identify high-priority customers",
    copy: "See which profiles the model estimates as more likely to subscribe before the team spends call time.",
    icon: Target,
  },
  {
    title: "Allocate campaign resources",
    copy: "Use the outreach priority as one input when deciding where advisors and call lists should focus.",
    icon: Users,
  },
  {
    title: "Support marketing decisions",
    copy: "Give campaign managers a consistent probability, alongside policy and local knowledge.",
    icon: Compass,
  },
  {
    title: "Reduce inefficient outreach",
    copy: "Lower-priority profiles can be sequenced later, without treating the estimate as a refusal.",
    icon: TimerReset,
  },
];

export function Dashboard() {
  const [model, setModel] = useState<ModelInfoResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getModelInfo()
      .then((info) => {
        if (active) {
          setModel(info);
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#12382f] via-spruce to-[#071714] px-6 py-8 text-white shadow-2xl shadow-spruce/25 sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#d7b07a]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-leaf/30 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(15rem,0.7fr)] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f0d3a4]">Term-deposit campaigns</p>
            <h1 className="mt-3 font-serif text-5xl leading-[0.95] tracking-tight sm:text-6xl">BankReach</h1>
            <p className="mt-4 max-w-xl text-xl text-white/90">Intelligent Term-Deposit Campaign Prioritization</p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">
              Campaign teams have more customers than they can call well. BankReach estimates how likely a person is to subscribe to a term deposit from the information available before the conversation, so a manager can choose where to spend attention.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/predict"
                className="inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-spruce shadow-lg shadow-black/15 hover:bg-[#f7fbf9]"
              >
                Start Prediction
              </Link>
              <Link
                to="/campaign-file"
                className="inline-flex rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/16"
              >
                Score a file
              </Link>
              <Link
                to="/how-it-works"
                className="inline-flex rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/16"
              >
                How It Works
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">Decision support</p>
            <p className="mt-3 font-serif text-3xl leading-tight text-white">An estimate for a person to use. Not an automatic yes or no.</p>
          </div>
        </div>
      </section>

      <section className="panel p-6" aria-labelledby="desk-heading">
        <h2 id="desk-heading" className="font-serif text-3xl">How a campaign manager uses this</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-3">
          <li>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">1. Score</p>
            <p className="mt-2 text-sm leading-6 text-muted">Enter a customer the team could call. Use a recorded campaign month when the economic figures are the period's, not the person's.</p>
          </li>
          <li>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">2. Read the line</p>
            <p className="mt-2 text-sm leading-6 text-muted">At or above the stored outreach line, contact them first. Below it, keep them for a later pass. The number is an estimate, not a yes or no.</p>
          </li>
          <li>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">3. Order the day</p>
            <p className="mt-2 text-sm leading-6 text-muted">Add each scored customer to today's call list. The list sorts itself by the model's probability so advisors spend the first calls where the estimate is higher.</p>
          </li>
        </ol>
        <p className="mt-5">
          <Link to="/call-list" className="text-sm font-semibold text-leaf underline-offset-4 hover:underline">
            Open today's call list
          </Link>
        </p>
      </section>

      <section aria-labelledby="kpi-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 id="kpi-heading" className="font-serif text-3xl">Model snapshot</h2>
          <p className="text-sm text-muted">From the saved evaluation, not a live scoreboard.</p>
        </div>
        {failed ? (
          <div className="panel border-danger/20 bg-danger-soft p-5 text-sm" role="status">
            Model information is unavailable. Start the prediction service to load the saved model card. No figures are shown in its place.
          </div>
        ) : null}
        {!failed && !model ? (
          <div className="panel p-5 text-sm text-muted" role="status">
            Loading model information...
          </div>
        ) : null}
        {model ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Final model</p>
              <p className="mt-3 font-serif text-3xl tracking-tight">{model.model_name}</p>
            </article>
            <article className="panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Outreach priority threshold</p>
              <p className="mt-3 font-serif text-3xl tracking-tight text-brass">{formatThreshold(model.decision_threshold)}</p>
              <p className="mt-2 text-xs text-muted">Chosen with {model.threshold_metric} on the validation period.</p>
            </article>
            <article className="panel bg-gradient-to-br from-white to-leaf-soft p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">PR-AUC</p>
              <p className="mt-3 font-serif text-3xl tracking-tight text-leaf">{formatMetric(model.test_metrics["PR-AUC"])}</p>
              <p className="mt-2 text-xs text-muted">Final test evaluation. Primary ranking metric.</p>
            </article>
            <article className="panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">ROC-AUC</p>
              <p className="mt-3 font-serif text-3xl tracking-tight">{formatMetric(model.test_metrics["ROC-AUC"])}</p>
              <p className="mt-2 text-xs text-muted">Final test evaluation.</p>
            </article>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="value-heading">
        <h2 id="value-heading" className="font-serif text-3xl">Where this helps</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {VALUES.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="panel p-5 transition hover:-translate-y-0.5 hover:shadow-xl">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-leaf-soft text-leaf">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{item.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel bg-gradient-to-br from-[#fffaf3] to-white p-6" aria-labelledby="responsible-heading">
        <div className="flex items-start gap-3">
          <Scale className="mt-1 text-brass" aria-hidden="true" />
          <div>
            <h2 id="responsible-heading" className="font-serif text-3xl">Responsible use</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              Predictions are probabilities. They should support a human decision, not replace campaign policy, customer circumstances, or professional judgement. A high estimate is not a promise that the customer will subscribe. A lower priority is not a statement that they will not.
            </p>
            <p className="mt-4">
              <Link to="/model" className="text-sm font-semibold text-leaf underline-offset-4 hover:underline">
                Read the model card
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
