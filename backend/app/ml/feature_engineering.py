"""Custom transformer stored inside the serialized BankReach pipeline.

Joblib needs this class at a stable import path in order to unpickle
``bankreach_final_model.joblib``. The prediction service does not reimplement
these transformations. It calls the saved pipeline, which runs this step itself.

The implementation is the notebook's ``BankReachFeatureEngineer``.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin


class BankReachFeatureEngineer(BaseEstimator, TransformerMixin):
    """Feature engineering with the only learned threshold fitted on input X."""

    def fit(self, X, y=None):
        X = X.copy()
        self.campaign_threshold_ = float(X["campaign"].quantile(0.90))
        return self

    def transform(self, X):
        X = X.copy()

        X["previously_contacted"] = (X["poutcome"] != "nonexistent").astype(int)
        X["days_since_previous_contact"] = X["pdays"].replace(999, np.nan)
        X = X.drop(columns=["pdays"], errors="ignore")

        X["previous_campaign_contacted"] = (X["previous"] > 0).astype(int)
        X["previous_contact_intensity"] = np.log1p(X["previous"])
        X["previous_success"] = (X["poutcome"] == "success").astype(int)
        X["previous_failure"] = (X["poutcome"] == "failure").astype(int)
        X["no_previous_campaign"] = (X["poutcome"] == "nonexistent").astype(int)

        X["campaign_log"] = np.log1p(X["campaign"])
        X["high_campaign_contact"] = (X["campaign"] >= self.campaign_threshold_).astype(int)

        X["age_squared"] = X["age"] ** 2
        X["age_group"] = pd.cut(
            X["age"],
            bins=[0, 25, 35, 45, 55, 65, 100],
            labels=["17-25", "26-35", "36-45", "46-55", "56-65", "66+"],
        )

        X["financial_obligation_count"] = (
            (X["default"] == "yes").astype(int)
            + (X["housing"] == "yes").astype(int)
            + (X["loan"] == "yes").astype(int)
        )

        month_order = {
            "jan": 1,
            "feb": 2,
            "mar": 3,
            "apr": 4,
            "may": 5,
            "jun": 6,
            "jul": 7,
            "aug": 8,
            "sep": 9,
            "oct": 10,
            "nov": 11,
            "dec": 12,
        }
        X["month_num"] = X["month"].map(month_order)
        X["month_sin"] = np.sin(2 * np.pi * X["month_num"] / 12)
        X["month_cos"] = np.cos(2 * np.pi * X["month_num"] / 12)

        day_order = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4}
        X["day_num"] = X["day_of_week"].map(day_order)
        X["day_sin"] = np.sin(2 * np.pi * X["day_num"] / 7)
        X["day_cos"] = np.cos(2 * np.pi * X["day_num"] / 7)

        X["employment_interest_interaction"] = X["emp.var.rate"] * X["euribor3m"]
        X["employment_rate_x_employed"] = X["emp.var.rate"] * X["nr.employed"]

        return X
