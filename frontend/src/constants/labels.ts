export const FEATURE_LABELS: Record<string, string> = {
  age: "Age",
  job: "Occupation",
  marital: "Marital Status",
  education: "Education",
  default: "Credit Default",
  housing: "Housing Loan",
  loan: "Personal Loan",
  contact: "Contact Method",
  month: "Campaign Month",
  day_of_week: "Campaign Day",
  campaign: "Current Campaign Contacts",
  pdays: "Days Since Previous Contact",
  previous: "Previous Campaign Contacts",
  poutcome: "Previous Campaign Outcome",
  "emp.var.rate": "Employment Variation Rate",
  "cons.price.idx": "Consumer Price Index",
  "cons.conf.idx": "Consumer Confidence Index",
  euribor3m: "Euribor 3-Month Rate",
  "nr.employed": "Number of Employees",
};

export function featureLabel(feature: string): string {
  return FEATURE_LABELS[feature] ?? feature;
}
