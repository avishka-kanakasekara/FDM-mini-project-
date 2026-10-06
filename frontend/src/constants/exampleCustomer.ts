import type { PredictionRequest } from "../types/prediction";

/**
 * A real profile from bank-additional-full.csv (row 37991 after duplicate removal).
 * Loading it only fills the form. The score still comes from the saved model.
 */
export const EXAMPLE_CUSTOMER: PredictionRequest = {
  age: 29,
  job: "self-employed",
  marital: "single",
  education: "university.degree",
  default: "no",
  housing: "yes",
  loan: "no",
  contact: "cellular",
  month: "sep",
  day_of_week: "tue",
  campaign: 2,
  pdays: 999,
  previous: 0,
  poutcome: "nonexistent",
  "emp.var.rate": -3.4,
  "cons.price.idx": 92.379,
  "cons.conf.idx": -29.8,
  euribor3m: 0.788,
  "nr.employed": 5017.5,
};
