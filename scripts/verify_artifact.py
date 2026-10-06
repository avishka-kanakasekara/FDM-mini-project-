"""Load the notebook joblib and check it. This script does not modify the artifact."""

from __future__ import annotations

import __main__
import sys
from pathlib import Path

import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.ml.feature_engineering import BankReachFeatureEngineer  # noqa: E402

__main__.BankReachFeatureEngineer = BankReachFeatureEngineer

ARTIFACT = ROOT / "backend" / "artifacts" / "bankreach_final_model.joblib"
EXPECTED_COLUMNS = [
    "age",
    "job",
    "marital",
    "education",
    "default",
    "housing",
    "loan",
    "contact",
    "month",
    "day_of_week",
    "campaign",
    "pdays",
    "previous",
    "poutcome",
    "emp.var.rate",
    "cons.price.idx",
    "cons.conf.idx",
    "euribor3m",
    "nr.employed",
]
SAMPLE = {
    "age": 35,
    "job": "technician",
    "marital": "single",
    "education": "university.degree",
    "default": "no",
    "housing": "yes",
    "loan": "no",
    "contact": "cellular",
    "month": "may",
    "day_of_week": "mon",
    "campaign": 2,
    "pdays": 999,
    "previous": 0,
    "poutcome": "nonexistent",
    "emp.var.rate": -1.8,
    "cons.price.idx": 92.893,
    "cons.conf.idx": -46.2,
    "euribor3m": 1.313,
    "nr.employed": 5099.1,
}


def main() -> None:
    if not ARTIFACT.is_file():
        raise SystemExit(f"Missing artifact: {ARTIFACT}")

    before = ARTIFACT.stat().st_mtime
    artifact = joblib.load(ARTIFACT)
    if ARTIFACT.stat().st_mtime != before:
        raise SystemExit("Verification changed the artifact file.")

    model = artifact.get("model")
    threshold = artifact.get("decision_threshold")
    columns = artifact.get("input_columns")
    if not isinstance(model, Pipeline):
        raise SystemExit("artifact['model'] is not a scikit-learn pipeline.")
    if not isinstance(threshold, (int, float)) or not 0 < float(threshold) < 1:
        raise SystemExit("artifact['decision_threshold'] is missing or outside (0, 1).")
    if columns != EXPECTED_COLUMNS:
        raise SystemExit(f"Unexpected input columns: {columns}")
    if "duration" in columns or "y" in columns:
        raise SystemExit("Target or duration is present in the model inputs.")
    steps = set(model.named_steps)
    if not {"feature_engineering", "preprocessing", "model"} <= steps:
        raise SystemExit(f"Pipeline steps are incomplete: {sorted(steps)}")
    if not isinstance(model.named_steps["model"], LogisticRegression):
        raise SystemExit("The saved estimator is not logistic regression.")
    if artifact.get("model_name") != "Logistic Regression":
        raise SystemExit(f"Unexpected model name: {artifact.get('model_name')}")

    frame = pd.DataFrame([SAMPLE])[columns]
    probability = float(model.predict_proba(frame)[:, 1][0])
    if not 0 <= probability <= 1:
        raise SystemExit(f"Invalid probability: {probability}")
    decision = "priority" if probability >= float(threshold) else "lower_priority"

    print("artifact:", ARTIFACT)
    print("model:", artifact["model_name"])
    print("threshold:", threshold)
    print("inputs:", len(columns))
    print("duration excluded: yes")
    print("sample probability:", round(probability, 6))
    print("sample decision:", decision)
    print("verification: passed")


if __name__ == "__main__":
    main()
