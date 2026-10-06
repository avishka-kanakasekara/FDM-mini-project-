# BankReach architecture

## Request path

```text
Frontend
   ↓
REST API
   ↓
Validation
   ↓
Prediction Service
   ↓
Serialized ML Pipeline
   ↓
Probability
   ↓
Threshold
   ↓
Business Decision
```

The browser collects 19 raw inputs and posts them as JSON. FastAPI validates types, ranges, and categories. The prediction service builds one pandas row and passes that row to the pipeline stored in `bankreach_final_model.joblib`.

The pipeline already contains:

1. feature engineering (`BankReachFeatureEngineer`)
2. imputation, scaling, and one-hot encoding
3. the selected logistic regression

The API does not reimplement those steps, and it does not call the notebook.

## Why preprocessing is not duplicated

The notebook fitted campaign thresholds, imputers, scalers, and category encodings on the development data, then saved them inside the pipeline. Rebuilding that logic in FastAPI would create a second implementation that can drift from the evaluated model. Column names are the contract. The saved transformer owns the calculations.

`backend/app/ml/feature_engineering.py` exists only because joblib must import `BankReachFeatureEngineer` when it unpickles the pipeline. The prediction route never calls `transform` itself.

## What is stored

| Piece | Role |
| --- | --- |
| `backend/artifacts/bankreach_final_model.joblib` | Pipeline, threshold, input columns, model name |
| `backend/artifacts/bankreach_model_metadata.json` | Evaluation metrics, validation strategy, and threshold written by the notebook export cell |
| Notebook | Development and evaluation evidence |
| `bank-additional-full.csv` | Source data used to build the artifact |

The artifact threshold is authoritative. Metadata supplies the model card. If the two thresholds ever differ, the service logs a warning and scores with the artifact value.

## Decision

```text
probability >= artifact["decision_threshold"]  →  Prioritize Outreach
otherwise                                      →  Lower Priority
```

The labels are priorities for a person. They are not statements that the customer will or will not subscribe.

## Startup

`BankReachModelService.load()` runs once when the API starts. A missing file, a corrupt joblib, a missing pipeline step, a non-logistic estimator, a bad threshold, or `duration` among the inputs stops the process.

## What this system deliberately omits

There is no database, login, batch CSV scorer, or second classifier. One customer is scored at a time by the saved model.
