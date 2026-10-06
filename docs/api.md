# BankReach API

Base URL in local development: `http://127.0.0.1:8000`

Interactive reference: `/docs`

## GET /api/v1/health

```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_name": "Logistic Regression",
  "decision_threshold": 0.7,
  "input_feature_count": 19
}
```

`status` is `healthy` only when the artifact loaded.

## GET /api/v1/model

Returns the project name, model name, artifact threshold, primary metric, threshold metric, validation strategy, the 19 input names, excluded leakage features, validation metrics, and final test metrics from `bankreach_model_metadata.json`. The notebook export does not put the permutation-importance table in that file, so that list is empty unless the metadata later includes it.

The serialized model is not returned. Metric values are evaluation results, not live production performance. This route requires a signed-in account.

## POST /api/v1/auth/signup

```json
{ "name": "Ayesha Perera", "email": "ayesha@bank.example", "password": "a-long-password" }
```

Returns the account (`id`, `name`, `email`) and a bearer `token`. Send that token as `Authorization: Bearer <token>` on prediction and model requests. Password must be 8 to 128 characters. A duplicate email returns HTTP 409.

## POST /api/v1/auth/signin

Accepts `email` and `password`. A wrong pair returns HTTP 401 with the message `The email or password is incorrect.`

## GET /api/v1/auth/me

Returns the account for the bearer token. Missing or expired tokens return HTTP 401.

## POST /api/v1/auth/signout

Deletes the session for the bearer token.

## POST /api/v1/predict

Raw inputs only. Do not send engineered columns, and do not send `duration`. A signed-in account is required.

```json
{
  "age": 29,
  "job": "self-employed",
  "marital": "single",
  "education": "university.degree",
  "default": "no",
  "housing": "yes",
  "loan": "no",
  "contact": "cellular",
  "month": "sep",
  "day_of_week": "tue",
  "campaign": 2,
  "pdays": 999,
  "previous": 0,
  "poutcome": "nonexistent",
  "emp.var.rate": -3.4,
  "cons.price.idx": 92.379,
  "cons.conf.idx": -29.8,
  "euribor3m": 0.788,
  "nr.employed": 5017.5
}
```

`pdays` uses `999` when the customer was not previously contacted. Previous contacts of `0`, `pdays` of `999`, and previous outcome `nonexistent` must be used together. A previous-contact count above zero requires outcome `failure` or `success`. In that case `pdays` may still be `999`.

### Success

```json
{
  "probability": 0.771695,
  "decision": "priority",
  "decision_label": "Prioritize Outreach",
  "threshold": 0.7000000000000002,
  "model_name": "Logistic Regression",
  "target": "Term Deposit Subscription",
  "message": "This customer has an estimated 77.2% probability of subscribing.",
  "explanation": "The model estimates a relatively high likelihood of term-deposit subscription. The customer may be considered for higher-priority outreach, subject to human judgement and campaign policy.",
  "above_threshold": true,
  "disclaimer": "Prediction is a probabilistic decision-support signal and should be considered alongside professional judgement and campaign policy."
}
```

`decision` is `lower_priority` and `decision_label` is `Lower Priority` when the probability is below the artifact threshold.

### Errors

Validation failures return HTTP 422:

```json
{
  "error": "validation_error",
  "message": "Required field 'job' is missing."
}
```

If the loaded pipeline cannot score a profile, the API returns HTTP 503:

```json
{
  "error": "model_unavailable",
  "message": "Prediction service is temporarily unavailable."
}
```

Stack traces stay in the server log.

### Accepted categories

| Field | Values |
| --- | --- |
| `job` | `admin.`, `blue-collar`, `entrepreneur`, `housemaid`, `management`, `retired`, `self-employed`, `services`, `student`, `technician`, `unemployed`, `unknown` |
| `marital` | `divorced`, `married`, `single`, `unknown` |
| `education` | `basic.4y`, `basic.6y`, `basic.9y`, `high.school`, `illiterate`, `professional.course`, `university.degree`, `unknown` |
| `default`, `housing`, `loan` | `no`, `yes`, `unknown` |
| `contact` | `cellular`, `telephone` |
| `month` | `mar`, `apr`, `may`, `jun`, `jul`, `aug`, `sep`, `oct`, `nov`, `dec` |
| `day_of_week` | `mon`, `tue`, `wed`, `thu`, `fri` |
| `poutcome` | `failure`, `nonexistent`, `success` |

Numeric limits follow the observed campaign dataset: age 17–98, campaign contacts 1–56, previous contacts 0–7, days since previous contact 0–999, and the historical ranges of the five economic indicators.

## POST /api/v1/predict/batch

Send a UTF-8 CSV body with `Content-Type: text/csv`. The header must include the same 19 raw columns as a single prediction. Semicolon-separated and comma-separated files are both accepted. Extra columns are ignored. `duration` and `y` are never passed to the model.

Each valid row is scored with one call to the saved pipeline. A row that fails the same validation as `POST /api/v1/predict` is listed under `invalid` and does not stop the rest of the file. Records come back ordered by estimated probability, highest first.

`summary.groups` always contains two outreach groups:

- `priority` / `Contact first` / `Prioritize Outreach` when the probability is at or above the artifact threshold
- `lower_priority` / `Contact later` / `Lower Priority` otherwise

A lower priority is an outreach order, not a refusal. A missing required column, an empty file, a non-UTF-8 file, or a file over 12 MB or 50,000 rows returns HTTP 422 with `error` and `message`.

## Environment

See the root [README](../README.md). CORS origins come from `CORS_ORIGINS`. The development frontend is `http://localhost:5173`.

## Run

```bash
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

```bash
cd frontend
npm install
npm run dev
```
