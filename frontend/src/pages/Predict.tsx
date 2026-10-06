import { useState } from "react";

import { PredictionForm } from "../components/prediction/PredictionForm";
import { ResultPanel } from "../components/prediction/ResultPanel";
import { useToast } from "../components/ui/Toast";
import { ApiError, predictSubscription } from "../services/api";
import type { PredictionRequest, PredictionResponse } from "../types/prediction";

const PROFILE_DELAY_MS = import.meta.env.MODE === "test" ? 20 : 700;
const MINIMUM_VISIBLE_MS = import.meta.env.MODE === "test" ? 40 : 900;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function Predict() {
  const { notify } = useToast();
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [submitted, setSubmitted] = useState<PredictionRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [formVersion, setFormVersion] = useState(0);

  async function handleSubmit(payload: PredictionRequest) {
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    setSubmitted(payload);
    setLoadingMessage("Analyzing customer profile...");
    const started = Date.now();
    const timer = window.setTimeout(() => setLoadingMessage("Generating prediction..."), PROFILE_DELAY_MS);
    try {
      const assessment = await predictSubscription(payload);
      const elapsed = Date.now() - started;
      if (elapsed < MINIMUM_VISIBLE_MS) {
        await wait(MINIMUM_VISIBLE_MS - elapsed);
      }
      setResult(assessment);
      notify("Assessment ready.");
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : "The assessment could not be completed.";
      setError(message);
      notify(message, "error");
    } finally {
      window.clearTimeout(timer);
      setIsSubmitting(false);
      setLoadingMessage(null);
    }
  }

  function clearResult(message?: string) {
    setResult(null);
    setSubmitted(null);
    setError(null);
    if (message) {
      notify(message);
    }
  }

  return (
    <div>
      <header className="mb-6 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Prediction workspace</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">How likely is a subscription?</h1>
        <p className="mt-2 text-muted">
          Score a customer the team could call today. The result is an estimated chance of subscribing, and a suggestion for where that person should sit on the call list.
        </p>
      </header>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <PredictionForm
          key={formVersion}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onReset={() => clearResult("Customer form reset.")}
          onExampleLoaded={() => clearResult("Example customer loaded. Generate an assessment to score this profile with the trained model.")}
        />
        <ResultPanel
          result={result}
          request={submitted}
          error={error}
          isSubmitting={isSubmitting}
          loadingMessage={loadingMessage}
          onReview={() => document.getElementById("age")?.focus()}
          onNewPrediction={() => {
            setFormVersion((version) => version + 1);
            clearResult("Ready for a new customer.");
          }}
        />
      </div>
    </div>
  );
}
