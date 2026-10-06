"""Allowed raw inputs for the saved BankReach pipeline.

Categories are the values present in the supplied bank-additional-full dataset.
Numeric bounds are the observed dataset domain. ``duration`` is intentionally absent.
"""

from __future__ import annotations

EXPECTED_INPUT_COLUMNS: list[str] = [
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

JOBS: tuple[str, ...] = (
    "admin.",
    "blue-collar",
    "entrepreneur",
    "housemaid",
    "management",
    "retired",
    "self-employed",
    "services",
    "student",
    "technician",
    "unemployed",
    "unknown",
)

MARITAL_STATUSES: tuple[str, ...] = ("divorced", "married", "single", "unknown")

EDUCATION_LEVELS: tuple[str, ...] = (
    "basic.4y",
    "basic.6y",
    "basic.9y",
    "high.school",
    "illiterate",
    "professional.course",
    "university.degree",
    "unknown",
)

DEFAULT_VALUES: tuple[str, ...] = ("no", "yes", "unknown")
HOUSING_VALUES: tuple[str, ...] = ("no", "yes", "unknown")
LOAN_VALUES: tuple[str, ...] = ("no", "yes", "unknown")
CONTACT_VALUES: tuple[str, ...] = ("cellular", "telephone")
MONTHS: tuple[str, ...] = ("mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec")
DAYS_OF_WEEK: tuple[str, ...] = ("mon", "tue", "wed", "thu", "fri")
POUTCOMES: tuple[str, ...] = ("failure", "nonexistent", "success")

# Observed ranges in bank-additional-full.csv.
AGE_MIN, AGE_MAX = 17, 98
CAMPAIGN_MIN, CAMPAIGN_MAX = 1, 56
PREVIOUS_MIN, PREVIOUS_MAX = 0, 7
PDAYS_MIN, PDAYS_MAX = 0, 999
EMP_VAR_RATE_MIN, EMP_VAR_RATE_MAX = -3.4, 1.4
CONS_PRICE_IDX_MIN, CONS_PRICE_IDX_MAX = 92.201, 94.767
CONS_CONF_IDX_MIN, CONS_CONF_IDX_MAX = -50.8, -26.9
EURIBOR3M_MIN, EURIBOR3M_MAX = 0.634, 5.045
NR_EMPLOYED_MIN, NR_EMPLOYED_MAX = 4963.6, 5228.1
