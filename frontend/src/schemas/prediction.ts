import { z } from "zod";

import {
  CONTACT_OPTIONS,
  DAY_OPTIONS,
  EDUCATION_OPTIONS,
  JOB_OPTIONS,
  MARITAL_OPTIONS,
  MONTH_OPTIONS,
  POUTCOME_OPTIONS,
  YES_NO_UNKNOWN,
  valuesOf,
} from "../constants/datasetOptions";
import type { PredictionRequest } from "../types/prediction";

const integerField = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .refine((value) => /^-?\d+$/.test(value), `${label} must be a whole number.`)
    .transform((value) => Number(value))
    .refine((value) => value >= min && value <= max, `${label} must be between ${min} and ${max}.`);

const decimalField = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .refine((value) => Number.isFinite(Number(value)), `${label} must be a finite number.`)
    .transform((value) => Number(value))
    .refine(
      (value) => value >= min - 1e-6 && value <= max + 1e-6,
      `${label} must be between ${min} and ${max}.`,
    );

const choiceField = (label: string, allowed: string[]) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .refine((value) => allowed.includes(value), `${label} must be one of the supported categories.`);

export const predictionFormSchema = z
  .object({
    age: integerField("Age", 17, 98),
    job: choiceField("Occupation", valuesOf(JOB_OPTIONS)),
    marital: choiceField("Marital status", valuesOf(MARITAL_OPTIONS)),
    education: choiceField("Education", valuesOf(EDUCATION_OPTIONS)),
    default: choiceField("Credit default", valuesOf(YES_NO_UNKNOWN)),
    housing: choiceField("Housing loan", valuesOf(YES_NO_UNKNOWN)),
    loan: choiceField("Personal loan", valuesOf(YES_NO_UNKNOWN)),
    contact: choiceField("Contact method", valuesOf(CONTACT_OPTIONS)),
    month: choiceField("Campaign month", valuesOf(MONTH_OPTIONS)),
    day_of_week: choiceField("Campaign day", valuesOf(DAY_OPTIONS)),
    campaign: integerField("Current campaign contacts", 1, 56),
    pdays: integerField("Days since previous contact", 0, 999),
    previous: integerField("Previous campaign contacts", 0, 7),
    poutcome: choiceField("Previous campaign outcome", valuesOf(POUTCOME_OPTIONS)),
    emp_var_rate: decimalField("Employment variation rate", -3.4, 1.4),
    cons_price_idx: decimalField("Consumer price index", 92.201, 94.767),
    cons_conf_idx: decimalField("Consumer confidence index", -50.8, -26.9),
    euribor3m: decimalField("Euribor 3-month rate", 0.634, 5.045),
    nr_employed: decimalField("Number of employees", 4963.6, 5228.1),
  })
  .superRefine((values, ctx) => {
    const noPreviousContacts = values.previous === 0;
    const noPreviousCampaign = values.poutcome === "nonexistent";
    const recordedPreviousDay = values.pdays !== 999;
    const hadOutcome = values.poutcome === "success" || values.poutcome === "failure";

    if (noPreviousContacts && recordedPreviousDay) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pdays"],
        message: "Use 999 when there were no previous contacts.",
      });
    }
    if (noPreviousContacts && !noPreviousCampaign) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["poutcome"],
        message: "Select no previous campaign when previous contacts is 0.",
      });
    }
    if (values.previous > 0 && noPreviousCampaign) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["poutcome"],
        message: "Select failure or success when this customer was contacted before.",
      });
    }
    if (noPreviousContacts && (recordedPreviousDay || hadOutcome)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["previous"],
        message: recordedPreviousDay
          ? "Enter at least 1 previous contact when a previous contact day is recorded."
          : "Enter at least 1 previous contact when the previous campaign succeeded or failed.",
      });
    }
  });

export type PredictionFormInput = z.input<typeof predictionFormSchema>;
export type PredictionFormOutput = z.output<typeof predictionFormSchema>;

export const EMPTY_FORM: PredictionFormInput = {
  age: "",
  job: "",
  marital: "",
  education: "",
  default: "",
  housing: "",
  loan: "",
  contact: "",
  month: "",
  day_of_week: "",
  campaign: "",
  pdays: "",
  previous: "",
  poutcome: "",
  emp_var_rate: "",
  cons_price_idx: "",
  cons_conf_idx: "",
  euribor3m: "",
  nr_employed: "",
};

export function toFormValues(request: PredictionRequest): PredictionFormInput {
  return {
    age: String(request.age),
    job: request.job,
    marital: request.marital,
    education: request.education,
    default: request.default,
    housing: request.housing,
    loan: request.loan,
    contact: request.contact,
    month: request.month,
    day_of_week: request.day_of_week,
    campaign: String(request.campaign),
    pdays: String(request.pdays),
    previous: String(request.previous),
    poutcome: request.poutcome,
    emp_var_rate: String(request["emp.var.rate"]),
    cons_price_idx: String(request["cons.price.idx"]),
    cons_conf_idx: String(request["cons.conf.idx"]),
    euribor3m: String(request.euribor3m),
    nr_employed: String(request["nr.employed"]),
  };
}

export function toPredictionRequest(values: PredictionFormOutput): PredictionRequest {
  return {
    age: values.age,
    job: values.job,
    marital: values.marital,
    education: values.education,
    default: values.default,
    housing: values.housing,
    loan: values.loan,
    contact: values.contact,
    month: values.month,
    day_of_week: values.day_of_week,
    campaign: values.campaign,
    pdays: values.pdays,
    previous: values.previous,
    poutcome: values.poutcome,
    "emp.var.rate": values.emp_var_rate,
    "cons.price.idx": values.cons_price_idx,
    "cons.conf.idx": values.cons_conf_idx,
    euribor3m: values.euribor3m,
    "nr.employed": values.nr_employed,
  };
}
