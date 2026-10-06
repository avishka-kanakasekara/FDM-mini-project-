import { Link } from "react-router-dom";

import { outreachAction, outreachNote } from "../../campaign/briefing";
import { useCallList } from "../../campaign/callList";
import { useToast } from "../ui/Toast";
import { Button } from "../ui/Button";
import type { PredictionRequest, PredictionResponse } from "../../types/prediction";
import { formatThreshold } from "../../utils/format";
import { ProbabilityGauge } from "./ProbabilityGauge";

interface ResultPanelProps {
  result: PredictionResponse | null;
  request: PredictionRequest | null;
  error: string | null;
  isSubmitting: boolean;
  loadingMessage: string | null;
  onReview: () => void;
  onNewPrediction: () => void;
}

export function ResultPanel({
  result,
  request,
  error,
  isSubmitting,
  loadingMessage,
  onReview,
  onNewPrediction,
}: ResultPanelProps) {
  const callList = useCallList();
  const { notify } = useToast();
  const alreadyListed = Boolean(result && request && callList.contains(request));
  return (
    <aside className="lg:sticky lg:top-6" aria-live="polite">
      {isSubmitting ? (
        <section className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">Working</p>
          <div className="mt-5 flex items-center gap-3">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-leaf border-t-transparent" aria-hidden="true" />
            <p className="font-semibold">{loadingMessage}</p>
          </div>
          <p className="mt-3 text-sm text-muted">The saved model is scoring this profile. This is an estimate, not a decision.</p>
        </section>
      ) : null}

      {!isSubmitting && error ? (
        <section className="panel border-danger/25 bg-danger-soft p-6" role="alert">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-danger">Prediction failed</p>
          <h2 className="mt-2 font-serif text-2xl">The assessment could not be completed</h2>
          <p className="mt-3 text-sm leading-6">{error}</p>
        </section>
      ) : null}

      {!isSubmitting && result ? (
        <section className="rise panel overflow-hidden p-0">
          <div className={`px-6 py-5 ${result.above_threshold ? "bg-gradient-to-br from-[#12382f] to-[#0c6d4c]" : "bg-gradient-to-br from-[#3d2a18] to-[#8a5a2b]"} text-white`}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">Customer outreach assessment</p>
            <h2 className="mt-2 font-serif text-2xl">{result.target}</h2>
          </div>
          <div className="px-6 pb-6">
          <div className="mt-2 flex flex-col items-center gap-1">
            <ProbabilityGauge probability={result.probability} priority={result.above_threshold} />
            <p className="text-sm text-muted">Estimated subscription probability</p>
          </div>
          <p
            className={`mt-3 rounded-full px-3 py-1.5 text-center text-sm font-semibold ${
              result.above_threshold ? "bg-leaf-soft text-leaf" : "bg-brass-soft text-brass"
            }`}
          >
            {result.decision_label}
          </p>
          <p className="mt-4 text-sm leading-6">{result.message}</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            {result.above_threshold
              ? `This probability is above the model's operational threshold of ${formatThreshold(result.threshold)}.`
              : `This probability is below the model's operational threshold of ${formatThreshold(result.threshold)}.`}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted">
            Outreach priority threshold {formatThreshold(result.threshold)}
          </p>

          <div className="mt-5 border-t border-line pt-4">
            <h3 className="text-sm font-semibold">What should the team do?</h3>
            <p className="mt-2 text-sm leading-6">{outreachAction(result)}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{result.explanation}</p>
          </div>
          <p className="mt-4 text-xs leading-5 text-muted">{result.disclaimer}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={!request || alreadyListed}
              onClick={() => {
                if (!request) {
                  return;
                }
                const status = callList.add(request, result);
                notify(status === "added" ? "Added to today's call list." : "Updated on today's call list.");
              }}
            >
              {alreadyListed ? "On today's call list" : "Add to today's call list"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!request}
              onClick={async () => {
                if (!request) {
                  return;
                }
                try {
                  await navigator.clipboard.writeText(outreachNote(request, result));
                  notify("Outreach note copied.");
                } catch {
                  notify("The browser blocked copying. Use the call list to share the score.", "error");
                }
              }}
            >
              Copy outreach note
            </Button>
            <Link to="/call-list" className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold text-leaf hover:underline">
              Open call list
            </Link>
            <Button type="button" variant="ghost" onClick={onReview}>
              Review customer
            </Button>
            <Button type="button" variant="ghost" onClick={onNewPrediction}>
              New prediction
            </Button>
          </div>
          </div>
        </section>
      ) : null}

      {!isSubmitting && !result && !error ? (
        <section className="panel border-dashed bg-white/70 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">Result</p>
          <h2 className="mt-2 font-serif text-2xl">No assessment yet</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Complete the customer profile and generate an assessment. The probability and outreach priority will appear here.
          </p>
        </section>
      ) : null}
    </aside>
  );
}
