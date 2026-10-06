import type { BatchRecord, BatchSummary, PredictionRequest, PredictionResponse } from "../types/prediction";

export function recordToRequest(record: BatchRecord): PredictionRequest {
  return {
    age: record.age,
    job: record.job,
    marital: record.marital,
    education: record.education,
    default: record.default,
    housing: record.housing,
    loan: record.loan,
    contact: record.contact,
    month: record.month,
    day_of_week: record.day_of_week,
    campaign: record.campaign,
    pdays: record.pdays,
    previous: record.previous,
    poutcome: record.poutcome,
    "emp.var.rate": record["emp.var.rate"],
    "cons.price.idx": record["cons.price.idx"],
    "cons.conf.idx": record["cons.conf.idx"],
    euribor3m: record.euribor3m,
    "nr.employed": record["nr.employed"],
  };
}

export function recordToResult(record: BatchRecord, summary: BatchSummary): PredictionResponse {
  const percent = (record.probability * 100).toFixed(1);
  return {
    probability: record.probability,
    decision: record.decision,
    decision_label: record.decision_label,
    threshold: summary.threshold,
    model_name: summary.model_name,
    target: "Term Deposit Subscription",
    message: `This customer has an estimated ${percent}% probability of subscribing.`,
    explanation: record.above_threshold
      ? "The model estimates a relatively high likelihood of term-deposit subscription. The customer may be considered for higher-priority outreach, subject to human judgement and campaign policy."
      : "The estimated likelihood is below the model's operational threshold. The customer may receive lower outreach priority, but this does not mean they will not subscribe.",
    above_threshold: record.above_threshold,
    disclaimer: summary.disclaimer,
  };
}
