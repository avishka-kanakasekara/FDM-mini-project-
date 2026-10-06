import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { EXAMPLE_CUSTOMER } from "../../constants/exampleCustomer";
import { CAMPAIGN_PERIODS } from "../../constants/campaignPeriods";
import {
  CONTACT_OPTIONS,
  DAY_OPTIONS,
  EDUCATION_OPTIONS,
  JOB_OPTIONS,
  MARITAL_OPTIONS,
  MONTH_OPTIONS,
  POUTCOME_OPTIONS,
  YES_NO_UNKNOWN,
  type Choice,
} from "../../constants/datasetOptions";
import {
  EMPTY_FORM,
  predictionFormSchema,
  toFormValues,
  toPredictionRequest,
  type PredictionFormInput,
  type PredictionFormOutput,
} from "../../schemas/prediction";
import type { PredictionRequest } from "../../types/prediction";
import { Button } from "../ui/Button";

interface FieldSpec {
  name: keyof PredictionFormInput;
  label: string;
  hint: string;
  kind: "number" | "select";
  options?: Choice[];
  step?: string;
}

const SECTIONS: { title: string; fields: FieldSpec[] }[] = [
  {
    title: "Customer profile",
    fields: [
      { name: "age", label: "Age", hint: "Customer age in years. Supported range: 17 to 98.", kind: "number", step: "1" },
      { name: "job", label: "Occupation", hint: "Occupation recorded for this customer.", kind: "select", options: JOB_OPTIONS },
      { name: "marital", label: "Marital Status", hint: "Marital status recorded for this customer.", kind: "select", options: MARITAL_OPTIONS },
      { name: "education", label: "Education", hint: "Highest education category in the campaign data.", kind: "select", options: EDUCATION_OPTIONS },
    ],
  },
  {
    title: "Financial and loan information",
    fields: [
      { name: "default", label: "Credit Default", hint: "Whether the customer has credit in default.", kind: "select", options: YES_NO_UNKNOWN },
      { name: "housing", label: "Housing Loan", hint: "Whether the customer has a housing loan.", kind: "select", options: YES_NO_UNKNOWN },
      { name: "loan", label: "Personal Loan", hint: "Whether the customer has a personal loan.", kind: "select", options: YES_NO_UNKNOWN },
    ],
  },
  {
    title: "Contact information",
    fields: [
      { name: "contact", label: "Contact Method", hint: "Channel used to reach the customer.", kind: "select", options: CONTACT_OPTIONS },
      { name: "month", label: "Campaign Month", hint: "Month of the latest contact in this campaign.", kind: "select", options: MONTH_OPTIONS },
      { name: "day_of_week", label: "Campaign Day", hint: "Weekday of the latest contact in this campaign.", kind: "select", options: DAY_OPTIONS },
    ],
  },
  {
    title: "Campaign history",
    fields: [
      {
        name: "campaign",
        label: "Current Campaign Contacts",
        hint: "Number of contacts performed during this campaign.",
        kind: "number",
        step: "1",
      },
      {
        name: "pdays",
        label: "Days Since Previous Contact",
        hint: "Use 999 when there was no previous campaign. A day count from 0 to 998 requires at least one previous contact and an outcome of failure or success.",
        kind: "number",
        step: "1",
      },
      {
        name: "previous",
        label: "Previous Campaign Contacts",
        hint: "Use 0 only with no previous campaign and 999 days. Otherwise enter 1 to 7.",
        kind: "number",
        step: "1",
      },
      {
        name: "poutcome",
        label: "Previous Campaign Outcome",
        hint: "Choose no previous campaign only when previous contacts is 0. Otherwise choose failure or success.",
        kind: "select",
        options: POUTCOME_OPTIONS,
      },
    ],
  },
  {
    title: "Economic context",
    fields: [
      {
        name: "emp_var_rate",
        label: "Employment Variation Rate",
        hint: "Quarterly employment variation for the campaign period. Historical range: -3.4 to 1.4.",
        kind: "number",
        step: "0.1",
      },
      {
        name: "cons_price_idx",
        label: "Consumer Price Index",
        hint: "Price index for the campaign period. Historical range: 92.201 to 94.767.",
        kind: "number",
        step: "0.001",
      },
      {
        name: "cons_conf_idx",
        label: "Consumer Confidence Index",
        hint: "Confidence index for the campaign period. Historical range: -50.8 to -26.9.",
        kind: "number",
        step: "0.1",
      },
      {
        name: "euribor3m",
        label: "Euribor 3-Month Rate",
        hint: "Three-month Euribor rate for the campaign period. Historical range: 0.634 to 5.045.",
        kind: "number",
        step: "0.001",
      },
      {
        name: "nr_employed",
        label: "Number of Employees",
        hint: "Employment-level indicator for the campaign period. Historical range: 4963.6 to 5228.1.",
        kind: "number",
        step: "0.1",
      },
    ],
  },
];

interface PredictionFormProps {
  isSubmitting: boolean;
  onSubmit: (payload: PredictionRequest) => Promise<void> | void;
  onReset: () => void;
  onExampleLoaded: () => void;
}

export function PredictionForm({
  isSubmitting,
  onSubmit,
  onReset,
  onExampleLoaded,
}: PredictionFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PredictionFormInput, unknown, PredictionFormOutput>({
    resolver: zodResolver(predictionFormSchema),
    defaultValues: EMPTY_FORM,
    mode: "onTouched",
  });
  const [periodId, setPeriodId] = useState("");

  function applyPeriod(month: string) {
    setPeriodId(month);
    const period = CAMPAIGN_PERIODS.find((item) => item.month === month);
    if (!period) {
      return;
    }
    setValue("month", period.month, { shouldValidate: true });
    setValue("emp_var_rate", String(period.emp_var_rate), { shouldValidate: true });
    setValue("cons_price_idx", String(period.cons_price_idx), { shouldValidate: true });
    setValue("cons_conf_idx", String(period.cons_conf_idx), { shouldValidate: true });
    setValue("euribor3m", String(period.euribor3m), { shouldValidate: true });
    setValue("nr_employed", String(period.nr_employed), { shouldValidate: true });
  }

  return (
    <form
      className="panel overflow-hidden"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(toPredictionRequest(values));
      })}
    >
      <div className="border-b border-line bg-gradient-to-r from-white to-leaf-soft/70 px-5 py-5 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">Single customer</p>
        <h2 className="mt-1 font-serif text-3xl tracking-tight">Customer assessment</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Enter the information available before outreach. Economic figures describe the campaign period, not a personal credit score.
        </p>
      </div>

      <div className="space-y-6 px-5 py-5 sm:px-6">
        {SECTIONS.map((section, index) => (
          <fieldset key={section.title} className="min-w-0 border-0 p-0">
            <legend className="sr-only">{section.title}</legend>
            <div className="rounded-2xl bg-[#f7fbf9] p-4 ring-1 ring-line/80">
            <p className="mb-3 flex items-center gap-3 text-sm font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[#163e35] to-spruce text-xs text-white">{index + 1}</span>
              {section.title}
            </p>
            {section.title === "Economic context" ? (
              <div className="mb-4">
                <label htmlFor="campaign-period" className="text-sm font-semibold">
                  Recorded campaign period
                </label>
                <select
                  id="campaign-period"
                  className="field"
                  value={periodId}
                  disabled={isSubmitting}
                  onChange={(event) => applyPeriod(event.target.value)}
                >
                  <option value="">Enter the economic figures yourself</option>
                  {CAMPAIGN_PERIODS.map((period) => (
                    <option key={period.month} value={period.month}>
                      {period.label} — most common figures in the dataset ({period.records.toLocaleString()} records)
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Optional. These figures describe that month in the historical campaign, not this customer's own finances. You can still edit them after filling.
                </p>
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              {section.fields.map((field) => {
                const error = errors[field.name]?.message;
                const hintId = `${field.name}-hint`;
                const errorId = `${field.name}-error`;
                const describedBy = error ? `${hintId} ${errorId}` : hintId;
                const controlClass = `field ${error ? "border-danger bg-danger-soft" : ""}`;
                return (
                  <div key={field.name} className={field.name === "nr_employed" ? "sm:col-span-2" : undefined}>
                    <label htmlFor={field.name} className="text-sm font-semibold">
                      {field.label}
                    </label>
                    {field.kind === "select" ? (
                      <select
                        id={field.name}
                        className={controlClass}
                        aria-invalid={Boolean(error)}
                        aria-describedby={describedBy}
                        disabled={isSubmitting}
                        {...register(field.name)}
                      >
                        <option value="">Select</option>
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={field.name}
                        type="number"
                        inputMode="decimal"
                        step={field.step}
                        className={controlClass}
                        aria-invalid={Boolean(error)}
                        aria-describedby={describedBy}
                        disabled={isSubmitting}
                        {...register(field.name)}
                      />
                    )}
                    <p id={hintId} className="mt-1 text-xs leading-5 text-muted">
                      {field.hint}
                    </p>
                    {error ? (
                      <p id={errorId} className="mt-1 text-xs font-semibold text-danger" role="alert">
                        {error}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
            </div>
          </fieldset>
        ))}
      </div>

      <div className="sticky bottom-0 flex flex-col gap-3 border-t border-line bg-white/90 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => {
              reset(toFormValues(EXAMPLE_CUSTOMER));
              setPeriodId("");
              onExampleLoaded();
            }}
          >
            Load example customer
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => {
              reset(EMPTY_FORM);
              setPeriodId("");
              onReset();
            }}
          >
            Reset
          </Button>
        </div>
        <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
          Generate assessment
        </Button>
      </div>
    </form>
  );
}
