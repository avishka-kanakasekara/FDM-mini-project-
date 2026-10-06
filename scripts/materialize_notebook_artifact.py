"""Materialize the notebook deployment artifact.

The executed notebook saved ``bankreach_final_model.joblib`` during its own
run, but that file was not included in the project upload. This script does
not design a new model. It repeats the notebook's final deployment fit:

* same duplicate removal and ``duration`` exclusion
* same chronological 70/15/15 split
* same ``BankReachFeatureEngineer`` and preprocessing builder
* same Logistic Regression hyperparameters selected in the notebook
* same validation-selected decision threshold (0.7000000000000002)

The FastAPI application never calls this script. It only loads the artifact.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    balanced_accuracy_score,
    f1_score,
    fbeta_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.ml.feature_engineering import BankReachFeatureEngineer  # noqa: E402
DATA_PATH = ROOT / "bank-additional-full.csv"
ARTIFACT_DIR = ROOT / "backend" / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "bankreach_final_model.joblib"
METADATA_PATH = ARTIFACT_DIR / "bankreach_model_metadata.json"

RANDOM_STATE = 42
TARGET = "y"
LEAKAGE_FEATURES = ["duration"]
# Exact threshold printed by the executed notebook after F2 selection.
DECISION_THRESHOLD = 0.7000000000000002
# Exact hyperparameters printed by the executed notebook.
MODEL_C = 0.035506214270707714
MODEL_SOLVER = "lbfgs"

# Validation-set permutation importance printed by the notebook.
# Computed on the training-fitted pipeline with average precision.
# Descriptive only — not a causal effect, and not recomputed here.
NOTEBOOK_PERMUTATION_IMPORTANCE = [
    {"feature": "poutcome", "importance": 0.02889, "std": 0.00089},
    {"feature": "age", "importance": 0.01193, "std": 0.00106},
    {"feature": "euribor3m", "importance": 0.00760, "std": 0.00053},
    {"feature": "cons.conf.idx", "importance": 0.00661, "std": 0.00056},
    {"feature": "cons.price.idx", "importance": 0.00348, "std": 0.00041},
    {"feature": "previous", "importance": 0.00333, "std": 0.00084},
    {"feature": "education", "importance": 0.00261, "std": 0.00081},
    {"feature": "default", "importance": 0.00229, "std": 0.00060},
    {"feature": "contact", "importance": 0.00179, "std": 0.00102},
    {"feature": "marital", "importance": 0.00156, "std": 0.00035},
    {"feature": "job", "importance": 0.00146, "std": 0.00327},
    {"feature": "nr.employed", "importance": 0.00000, "std": 0.00000},
    {"feature": "emp.var.rate", "importance": 0.00000, "std": 0.00000},
    {"feature": "loan", "importance": -0.00049, "std": 0.00093},
    {"feature": "housing", "importance": -0.00073, "std": 0.00088},
    {"feature": "campaign", "importance": -0.00174, "std": 0.00115},
    {"feature": "day_of_week", "importance": -0.00516, "std": 0.00309},
    {"feature": "month", "importance": -0.01120, "std": 0.00041},
    {"feature": "pdays", "importance": -0.02999, "std": 0.00142},
]


def make_preprocessor(numeric_features, categorical_features):
    try:
        encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    except TypeError:
        encoder = OneHotEncoder(handle_unknown="ignore", sparse=False)

    numeric_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median", add_indicator=True)),
        ("scaler", StandardScaler()),
    ])
    categorical_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", encoder),
    ])
    return ColumnTransformer(
        [
            ("num", numeric_pipeline, numeric_features),
            ("cat", categorical_pipeline, categorical_features),
        ],
        remainder="drop",
    )


def create_model_pipeline(model, numeric_features, categorical_features):
    return Pipeline([
        ("feature_engineering", BankReachFeatureEngineer()),
        ("preprocessing", make_preprocessor(numeric_features, categorical_features)),
        ("model", clone(model)),
    ])


def classification_metrics(y_true, probability, threshold):
    prediction = (probability >= threshold).astype(int)
    return {
        "PR-AUC": float(average_precision_score(y_true, probability)),
        "ROC-AUC": float(roc_auc_score(y_true, probability)),
        "Accuracy": float(accuracy_score(y_true, prediction)),
        "Balanced Accuracy": float(balanced_accuracy_score(y_true, prediction)),
        "Precision": float(precision_score(y_true, prediction, zero_division=0)),
        "Recall": float(recall_score(y_true, prediction, zero_division=0)),
        "F1": float(f1_score(y_true, prediction, zero_division=0)),
        "F2": float(fbeta_score(y_true, prediction, beta=2, zero_division=0)),
    }


def main() -> None:
    raise SystemExit(
        "Do not refit a second model with this script. "
        "Execute the original notebook so its export cell writes bankreach_final_model.joblib."
    )
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found: {DATA_PATH}")

    df = pd.read_csv(DATA_PATH, sep=";")
    df_clean = df.drop_duplicates().reset_index(drop=True).copy()
    df_clean = df_clean.drop(columns=LEAKAGE_FEATURES, errors="ignore")

    X_all = df_clean.drop(columns=[TARGET]).copy()
    y_all = (df_clean[TARGET] == "yes").astype(int)

    n_total = len(X_all)
    n_train = int(np.floor(0.70 * n_total))
    n_val = int(np.floor(0.15 * n_total))

    X_train_raw = X_all.iloc[:n_train].copy()
    y_train_raw = y_all.iloc[:n_train].copy()
    X_val_raw = X_all.iloc[n_train:n_train + n_val].copy()
    y_val_raw = y_all.iloc[n_train:n_train + n_val].copy()
    X_test_raw = X_all.iloc[n_train + n_val:].copy()
    y_test_raw = y_all.iloc[n_train + n_val:].copy()

    feature_check = BankReachFeatureEngineer()
    X_train_engineered = feature_check.fit_transform(X_train_raw)
    numeric_features = X_train_engineered.select_dtypes(include=np.number).columns.tolist()
    categorical_features = X_train_engineered.select_dtypes(include=["object", "category"]).columns.tolist()

    base_model = LogisticRegression(
        max_iter=2000,
        class_weight="balanced",
        random_state=RANDOM_STATE,
        C=MODEL_C,
        solver=MODEL_SOLVER,
    )

    # Notebook cells 7.7–7.11: fit on training for validation metrics, then refit on train+validation.
    validation_pipeline = create_model_pipeline(base_model, numeric_features, categorical_features)
    validation_pipeline.fit(X_train_raw, y_train_raw)
    val_probability = validation_pipeline.predict_proba(X_val_raw)[:, 1]
    validation_metrics = classification_metrics(y_val_raw, val_probability, DECISION_THRESHOLD)

    X_development = pd.concat([X_train_raw, X_val_raw], axis=0)
    y_development = pd.concat([y_train_raw, y_val_raw], axis=0)
    final_pipeline = create_model_pipeline(base_model, numeric_features, categorical_features)
    final_pipeline.fit(X_development, y_development)

    test_probability = final_pipeline.predict_proba(X_test_raw)[:, 1]
    test_metrics = classification_metrics(y_test_raw, test_probability, DECISION_THRESHOLD)

    input_columns = X_development.columns.tolist()
    if "duration" in input_columns:
        raise RuntimeError("duration leaked into model inputs")
    if len(input_columns) != 19:
        raise RuntimeError(f"Expected 19 input columns, found {len(input_columns)}")

    model_artifact = {
        "model": final_pipeline,
        "decision_threshold": float(DECISION_THRESHOLD),
        "model_name": "Logistic Regression",
        "target": TARGET,
        "primary_metric": "PR-AUC / Average Precision",
        "threshold_metric": "F2",
        "random_state": RANDOM_STATE,
        "input_columns": input_columns,
        "excluded_leakage_features": LEAKAGE_FEATURES,
        "rows_after_deduplication": int(len(df_clean)),
        "validation_strategy": (
            "Chronological 70/15/15 split; TimeSeriesSplit for development CV and hyperparameter search"
        ),
        "chronology_source": "UCI Machine Learning Repository — Bank Marketing, Dataset ID 222",
    }

    metadata = {
        "project": "BankReach — Term-Deposit Subscription Prediction",
        "model_name": "Logistic Regression",
        "decision_threshold": float(DECISION_THRESHOLD),
        "primary_metric": "PR-AUC / Average Precision",
        "threshold_metric": "F2",
        "best_parameters": {
            "model__C": MODEL_C,
            "model__solver": MODEL_SOLVER,
        },
        "validation_metrics": validation_metrics,
        "test_metrics": test_metrics,
        "random_state": RANDOM_STATE,
        "input_columns": input_columns,
        "excluded_leakage_features": LEAKAGE_FEATURES,
        "rows_after_deduplication": int(len(df_clean)),
        "validation_strategy": (
            "Chronological 70/15/15 split; TimeSeriesSplit for development CV and hyperparameter search"
        ),
        "permutation_importance": {
            "source": (
                "Printed by the executed notebook. Validation-set permutation importance "
                "on the training-fitted pipeline, scored with average precision, 3 repeats."
            ),
            "caveat": "Descriptive predictive contribution only. Not a causal effect and not a live explanation.",
            "features": NOTEBOOK_PERMUTATION_IMPORTANCE,
        },
    }

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model_artifact, MODEL_PATH)
    METADATA_PATH.write_text(json.dumps(metadata, indent=4), encoding="utf-8")

    reloaded = joblib.load(MODEL_PATH)
    sample = X_test_raw.iloc[[0]]
    sample_probability = float(reloaded["model"].predict_proba(sample[reloaded["input_columns"]])[:, 1][0])

    print("Saved:", MODEL_PATH)
    print("Saved:", METADATA_PATH)
    print("Input columns:", input_columns)
    print("Threshold:", reloaded["decision_threshold"])
    print("Validation metrics:", {k: round(v, 4) for k, v in validation_metrics.items()})
    print("Test metrics:", {k: round(v, 4) for k, v in test_metrics.items()})
    print("Campaign threshold:", final_pipeline.named_steps["feature_engineering"].campaign_threshold_)
    print("Reload sample probability:", round(sample_probability, 6))

    notebook_test = {
        "PR-AUC": 0.5753,
        "ROC-AUC": 0.6917,
        "Accuracy": 0.6123,
        "Balanced Accuracy": 0.6332,
        "Precision": 0.4971,
        "Recall": 0.7238,
        "F1": 0.5894,
        "F2": 0.6633,
    }
    print("Notebook test metrics (rounded):", notebook_test)
    for key, expected in notebook_test.items():
        actual = round(test_metrics[key], 4)
        print(f"  {key}: reproduced {actual} | notebook {expected} | delta {round(actual - expected, 4)}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Artifact materialization failed: {exc}", file=sys.stderr)
        raise
