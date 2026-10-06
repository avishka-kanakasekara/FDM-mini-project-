# BankReach

BankReach is a term-deposit campaign desk. A marketing officer enters the customer and campaign information that is known before a call. The application estimates the probability that the customer will subscribe, then suggests an outreach priority.

The estimate comes from the logistic-regression pipeline developed in the project notebook. The web application does not train a new model and does not rebuild the notebook’s feature engineering at request time.

This is decision support. It does not approve, reject, or guarantee a subscription.

## Architecture

```text
React + TypeScript
        |
        |  POST /api/v1/predict
        v
FastAPI validation
        |
        |  pandas DataFrame of the 19 raw inputs
        v
bankreach_final_model.joblib
        |
        |  saved feature engineering, preprocessing, and logistic regression
        v
probability  -->  threshold stored in the artifact  -->  outreach priority
```

Call length is not an input. In the source data that column is `duration`, and it is excluded because it is only known after the current contact.

See [docs/architecture.md](docs/architecture.md) and [docs/api.md](docs/api.md).

## Requirements

- Python 3.13
- Node.js 22 (or a current Node 20+ release)
- The two deployment files in `backend/artifacts/`:
  - `bankreach_final_model.joblib`
  - `bankreach_model_metadata.json`

Those files are produced by running the uploaded notebook. The notebook’s export cell writes the fitted pipeline, the selected threshold, and the metadata. The API only loads those files.

## Backend

From the project root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Windows PowerShell:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

The model path is server configuration (`BANKREACH_MODEL_PATH`). Clients cannot choose a file path.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

## Environment variables

Copy the examples if you need to override the defaults. The defaults already match local development.

| Variable | App | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Frontend | `http://localhost:8000` |
| `BANKREACH_MODEL_PATH` | Backend | `artifacts/bankreach_final_model.joblib` |
| `BANKREACH_METADATA_PATH` | Backend | `artifacts/bankreach_model_metadata.json` |
| `CORS_ORIGINS` | Backend | `http://localhost:5173,http://127.0.0.1:5173` |
| `BANKREACH_LOG_LEVEL` | Backend | `INFO` |

Templates: [.env.example](.env.example), [backend/.env.example](backend/.env.example), [frontend/.env.example](frontend/.env.example).

## Model artifact

Place the notebook export here:

```text
backend/artifacts/bankreach_final_model.joblib
backend/artifacts/bankreach_model_metadata.json
```

On startup the API checks that both files exist, that the joblib object contains `model`, `decision_threshold`, and `input_columns`, that the pipeline is logistic regression with its feature-engineering and preprocessing steps, that `duration` is absent, and that the threshold is between 0 and 1. If a check fails, the API stops instead of inventing a score.

The threshold used for “Prioritize Outreach” is the value stored in the artifact (0.70 from the notebook’s F2 selection). It is not hardcoded in the prediction route.

To regenerate the files, execute the uploaded notebook from the project folder so it can read `bank-additional-full.csv`. Its export cell writes `bankreach_final_model.joblib` and `bankreach_model_metadata.json`. Move both files into `backend/artifacts/` and restart the API. The API does not run the notebook and does not refit the model.

## Tests

Verify the notebook artifact without changing it:

```bash
.venv/bin/python scripts/verify_artifact.py
```

Backend and frontend tests:

```bash
cd backend
../.venv/bin/python -m pytest
```

```bash
cd frontend
npm test
```

## Demonstration

1. Start the backend, then the frontend.
2. Open **Prediction**.
3. Choose **Load example customer**. That fills a real row from the campaign dataset. It does not invent a score.
4. Choose **Generate assessment**.
5. The result shows the estimated subscription probability and either **Prioritize Outreach** or **Lower Priority**.
