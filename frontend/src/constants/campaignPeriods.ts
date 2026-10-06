/** Most common economic context for each month in bank-additional-full.csv. */

export interface CampaignPeriod {
  month: string;
  label: string;
  records: number;
  emp_var_rate: number;
  cons_price_idx: number;
  cons_conf_idx: number;
  euribor3m: number;
  nr_employed: number;
}

export const CAMPAIGN_PERIODS: CampaignPeriod[] = [
  { month: "mar", label: "March", records: 37, emp_var_rate: -1.8, cons_price_idx: 93.369, cons_conf_idx: -34.8, euribor3m: 0.646, nr_employed: 5008.7 },
  { month: "apr", label: "April", records: 1169, emp_var_rate: -1.8, cons_price_idx: 93.075, cons_conf_idx: -47.1, euribor3m: 1.405, nr_employed: 5099.1 },
  { month: "may", label: "May", records: 2868, emp_var_rate: 1.1, cons_price_idx: 93.994, cons_conf_idx: -36.4, euribor3m: 4.857, nr_employed: 5191.0 },
  { month: "jun", label: "June", records: 915, emp_var_rate: 1.4, cons_price_idx: 94.465, cons_conf_idx: -41.8, euribor3m: 4.961, nr_employed: 5228.1 },
  { month: "jul", label: "July", records: 2024, emp_var_rate: 1.4, cons_price_idx: 93.918, cons_conf_idx: -42.7, euribor3m: 4.962, nr_employed: 5228.1 },
  { month: "aug", label: "August", records: 1175, emp_var_rate: 1.4, cons_price_idx: 93.444, cons_conf_idx: -36.1, euribor3m: 4.964, nr_employed: 5228.1 },
  { month: "sep", label: "September", records: 103, emp_var_rate: -1.1, cons_price_idx: 94.199, cons_conf_idx: -37.5, euribor3m: 0.879, nr_employed: 4963.6 },
  { month: "oct", label: "October", records: 65, emp_var_rate: -3.4, cons_price_idx: 92.431, cons_conf_idx: -26.9, euribor3m: 0.739, nr_employed: 5017.5 },
  { month: "nov", label: "November", records: 822, emp_var_rate: -0.1, cons_price_idx: 93.2, cons_conf_idx: -42.0, euribor3m: 4.076, nr_employed: 5195.8 },
  { month: "dec", label: "December", records: 37, emp_var_rate: -3.0, cons_price_idx: 92.713, cons_conf_idx: -33.0, euribor3m: 0.715, nr_employed: 5023.5 },
];
