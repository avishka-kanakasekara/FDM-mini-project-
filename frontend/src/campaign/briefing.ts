import {
  CONTACT_OPTIONS,
  DAY_OPTIONS,
  EDUCATION_OPTIONS,
  JOB_OPTIONS,
  MARITAL_OPTIONS,
  MONTH_OPTIONS,
  POUTCOME_OPTIONS,
  YES_NO_UNKNOWN,
} from "../constants/datasetOptions";
import type { PredictionRequest, PredictionResponse } from "../types/prediction";
import { formatPercent, formatThreshold } from "../utils/format";

function choiceLabel(options: { value: string; label: string }[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export interface CustomerFact {
  label: string;
  value: string;
}

export interface CustomerSection {
  title: string;
  facts: CustomerFact[];
}

function yesNo(value: string): string {
  return choiceLabel(YES_NO_UNKNOWN, value);
}

export function customerSummary(request: PredictionRequest): string {
  const job = choiceLabel(JOB_OPTIONS, request.job);
  const month = choiceLabel(MONTH_OPTIONS, request.month);
  return `${request.age}-year-old ${job.toLowerCase()}, contacted in ${month}`;
}

export function customerSections(request: PredictionRequest): CustomerSection[] {
  const previousDay = request.pdays === 999 ? "No previous contact day recorded" : `${request.pdays} days ago`;
  return [
    {
      title: "How to reach them",
      facts: [
        { label: "Contact method", value: choiceLabel(CONTACT_OPTIONS, request.contact) },
        { label: "Last contact month", value: choiceLabel(MONTH_OPTIONS, request.month) },
        { label: "Last contact day", value: choiceLabel(DAY_OPTIONS, request.day_of_week) },
        { label: "Contacts in this campaign", value: String(request.campaign) },
      ],
    },
    {
      title: "Customer",
      facts: [
        { label: "Age", value: `${request.age} years` },
        { label: "Occupation", value: choiceLabel(JOB_OPTIONS, request.job) },
        { label: "Marital status", value: choiceLabel(MARITAL_OPTIONS, request.marital) },
        { label: "Education", value: choiceLabel(EDUCATION_OPTIONS, request.education) },
      ],
    },
    {
      title: "Loans",
      facts: [
        { label: "Credit in default", value: yesNo(request.default) },
        { label: "Housing loan", value: yesNo(request.housing) },
        { label: "Personal loan", value: yesNo(request.loan) },
      ],
    },
    {
      title: "Earlier campaign",
      facts: [
        { label: "Previous contacts", value: String(request.previous) },
        { label: "Days since previous contact", value: previousDay },
        { label: "Previous outcome", value: choiceLabel(POUTCOME_OPTIONS, request.poutcome) },
      ],
    },
    {
      title: "Campaign period",
      facts: [
        { label: "Employment variation rate", value: String(request["emp.var.rate"]) },
        { label: "Consumer price index", value: String(request["cons.price.idx"]) },
        { label: "Consumer confidence index", value: String(request["cons.conf.idx"]) },
        { label: "Euribor 3-month rate", value: String(request.euribor3m) },
        { label: "Number of employees", value: String(request["nr.employed"]) },
      ],
    },
  ];
}

export function outreachAction(result: PredictionResponse): string {
  const estimate = formatPercent(result.probability);
  const line = formatThreshold(result.threshold);
  const gap = (Math.abs(result.probability - result.threshold) * 100).toFixed(1);
  if (result.above_threshold) {
    return `Contact this customer before lower-priority profiles. The estimate is ${estimate}, which is ${gap} points above the ${line} outreach line.`;
  }
  return `Contact higher-priority profiles first, and keep this customer for a later pass. The estimate is ${estimate}, which is ${gap} points below the ${line} outreach line. This is not a refusal.`;
}

export function outreachNote(request: PredictionRequest, result: PredictionResponse): string {
  const lines = [
    "BankReach outreach note",
    `Customer: ${customerSummary(request)}`,
    `Estimated subscription probability: ${formatPercent(result.probability)}`,
    `Recommendation: ${result.decision_label}`,
    `Outreach line: ${formatThreshold(result.threshold)}`,
    `Model: ${result.model_name}`,
    `Action: ${outreachAction(result)}`,
    "",
  ];
  customerSections(request).forEach((section) => {
    lines.push(section.title);
    section.facts.forEach((fact) => lines.push(`${fact.label}: ${fact.value}`));
    lines.push("");
  });
  lines.push(result.disclaimer);
  return lines.join("\n");
}

export function callListNote(items: { request: PredictionRequest; result: PredictionResponse }[]): string {
  const lines = [
    "BankReach call list",
    "Contact customers at or above the outreach line first. A lower priority is not a refusal.",
    "",
  ];
  items.forEach((item, index) => {
    lines.push(`${index + 1}. ${customerSummary(item.request)} — ${formatPercent(item.result.probability)} — ${item.result.decision_label}`);
    lines.push(outreachNote(item.request, item.result));
    lines.push("");
  });
  return lines.join("\n");
}
