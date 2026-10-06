import { useEffect, useState } from "react";

import { featureLabel } from "../constants/labels";
import { getModelInfo } from "../services/api";
import type { ModelInfoResponse } from "../types/prediction";
import { formatMetric, formatThreshold } from "../utils/format";

const TEST_METRIC_ORDER = ["PR-AUC", "ROC-AUC", "Precision", "Recall", "F1", "F2"];

export function ModelInsights() {
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

  if (failed) {
    return (
      <section className="panel border-danger/25 bg-danger-soft p-6" role="alert">
        <h1 className="font-serif text-3xl">Model card unavailable</h1>
        <p className="mt-3 text-sm">The evaluation figures are read from the saved metadata. They are not shown when that file cannot be reached.</p>
      </section>
    );
  }

  if (!model) {
    return (
      <p className="text-sm text-muted" role="status">
        Loading model insights...
      </p>
    );
  }

  const positive = model.permutation_importance.filter((item) => item.importance > 0);
  const maxImportance = Math.max(...positive.map((item) => item.importance), 0.0001);

  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">Evaluation record</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">Model insights</h1>
        <p className="mt-4 text-base leading-7 text-muted">
          {model.project}. The figures below describe how the selected model behaved on the project’s validation and final test periods. They are not a live measure of today’s campaign.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="panel p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Model</p>
          <p className="mt-2 font-serif text-2xl">{model.model_name}</p>
        </article>
        <article className="panel p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Primary metric</p>
          <p className="mt-2 text-lg font-semibold">{model.primary_metric}</p>
        </article>
        <article className="panel p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Threshold metric</p>
          <p className="mt-2 text-lg font-semibold">{model.threshold_metric}</p>
          <p className="mt-2 text-sm text-muted">Outreach priority threshold {formatThreshold(model.decision_threshold)}</p>
        </article>
        <article className="panel p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Inputs</p>
          <p className="mt-2 font-serif text-2xl">{model.input_feature_count}</p>
          <p className="mt-2 text-sm text-muted">Raw customer and campaign fields. Call length is excluded.</p>
        </article>
      </section>

      <section className="panel p-6">
        <h2 className="font-serif text-2xl">Validation strategy</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{model.validation_strategy}.</p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          The threshold was selected on the validation period using F2 because the project is recall-oriented. Profiles at or above that threshold are suggested for higher-priority outreach. The technical decision threshold stored with the model is {model.decision_threshold.toFixed(2)}.
        </p>
      </section>

      <section aria-labelledby="test-metrics-heading">
        <div className="mb-4">
          <h2 id="test-metrics-heading" className="font-serif text-3xl">Final test metrics</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted">{model.metrics_note}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEST_METRIC_ORDER.map((name) => (
            <article key={name} className="panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{name}</p>
              <p className="mt-2 font-serif text-4xl">{formatMetric(model.test_metrics[name] ?? 0)}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-3xl">Validation-period metrics</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          These were measured on the later validation slice after the model was fit on the earlier training slice. They guided threshold selection and are separate from the final test result.
        </p>
        <div className="panel mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Metric</th>
                <th className="px-4 py-3 font-semibold">Validation</th>
                <th className="px-4 py-3 font-semibold">Final test</th>
              </tr>
            </thead>
            <tbody>
              {TEST_METRIC_ORDER.map((name) => (
                <tr key={name} className="border-b border-line last:border-0">
                  <th className="px-4 py-3 font-semibold" scope="row">{name}</th>
                  <td className="px-4 py-3">{formatMetric(model.validation_metrics[name] ?? 0)}</td>
                  <td className="px-4 py-3">{formatMetric(model.test_metrics[name] ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {positive.length > 0 ? (
        <section aria-labelledby="signals-heading">
          <h2 id="signals-heading" className="font-serif text-3xl">Important predictive signals</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            These variables showed stronger predictive contribution in the evaluation analysis. The comparison shuffles one input at a time and records the change in average precision. It does not show that a variable causes a customer to subscribe.
          </p>
          <ul className="mt-5 space-y-3">
            {positive.map((item) => (
              <li key={item.feature}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-semibold">{featureLabel(item.feature)}</span>
                  <span className="text-muted">{item.importance.toFixed(5)}</span>
                </div>
                <div className="h-2 rounded-full bg-[#efe8dc]" role="presentation">
                  <div
                    className="h-2 rounded-full bg-leaf"
                    style={{ width: `${Math.max(6, (item.importance / maxImportance) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-5 text-muted">{model.permutation_importance_note}</p>
        </section>
      ) : null}
    </div>
  );
}
