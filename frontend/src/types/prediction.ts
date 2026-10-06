export interface PredictionRequest {
  age: number;
  job: string;
  marital: string;
  education: string;
  default: string;
  housing: string;
  loan: string;
  contact: string;
  month: string;
  day_of_week: string;
  campaign: number;
  pdays: number;
  previous: number;
  poutcome: string;
  "emp.var.rate": number;
  "cons.price.idx": number;
  "cons.conf.idx": number;
  euribor3m: number;
  "nr.employed": number;
}

export interface PredictionResponse {
  probability: number;
  decision: "priority" | "lower_priority";
  decision_label: string;
  threshold: number;
  model_name: string;
  target: string;
  message: string;
  explanation: string;
  above_threshold: boolean;
  disclaimer: string;
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  model_name: string;
  decision_threshold: number | null;
  input_feature_count: number | null;
}

export interface PermutationSignal {
  feature: string;
  importance: number;
  std: number;
}

export interface ModelInfoResponse {
  project: string;
  model_name: string;
  decision_threshold: number;
  primary_metric: string;
  threshold_metric: string;
  validation_strategy: string;
  input_feature_count: number;
  input_columns: string[];
  excluded_leakage_features: string[];
  test_metrics: Record<string, number>;
  validation_metrics: Record<string, number>;
  permutation_importance: PermutationSignal[];
  permutation_importance_note: string;
  metrics_note: string;
}

export interface ApiErrorBody {
  error?: string;
  message?: string;
}

export interface BatchRecord extends PredictionRequest {
  row_number: number;
  probability: number;
  decision: "priority" | "lower_priority";
  decision_label: string;
  above_threshold: boolean;
}

export interface BatchGroup {
  decision: "priority" | "lower_priority";
  label: string;
  decision_label: string;
  count: number;
  share: number;
  average_probability: number | null;
  guidance: string;
}

export interface BatchSummary {
  file_rows: number;
  scored_rows: number;
  invalid_rows: number;
  invalid_details_truncated: boolean;
  threshold: number;
  model_name: string;
  average_probability: number | null;
  groups: BatchGroup[];
  ignored_columns: string[];
  notes: string[];
  disclaimer: string;
}

export interface BatchInvalidRow {
  row_number: number;
  message: string;
}

export interface BatchScoreResponse {
  summary: BatchSummary;
  records: BatchRecord[];
  invalid: BatchInvalidRow[];
}

export interface Account {
  id: string;
  name: string;
  email: string;
}

export interface AuthSession {
  user: Account;
  token: string;
}
