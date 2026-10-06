"""Request and response contracts for a single-customer assessment."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.domain.options import (
    AGE_MAX,
    AGE_MIN,
    CAMPAIGN_MAX,
    CAMPAIGN_MIN,
    CONS_CONF_IDX_MAX,
    CONS_CONF_IDX_MIN,
    CONS_PRICE_IDX_MAX,
    CONS_PRICE_IDX_MIN,
    CONTACT_VALUES,
    DAYS_OF_WEEK,
    DEFAULT_VALUES,
    EDUCATION_LEVELS,
    EMP_VAR_RATE_MAX,
    EMP_VAR_RATE_MIN,
    EURIBOR3M_MAX,
    EURIBOR3M_MIN,
    HOUSING_VALUES,
    JOBS,
    LOAN_VALUES,
    MARITAL_STATUSES,
    MONTHS,
    NR_EMPLOYED_MAX,
    NR_EMPLOYED_MIN,
    PDAYS_MAX,
    PDAYS_MIN,
    POUTCOMES,
    PREVIOUS_MAX,
    PREVIOUS_MIN,
)

_RANGE_TOLERANCE = 1e-6

EXAMPLE_REQUEST = {
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
    "nr.employed": 5017.5,
}


def _category(value: str, allowed: tuple[str, ...], label: str) -> str:
    if value not in allowed:
        raise ValueError(f"{label} must be one of the supported categories.")
    return value


def _within(value: float, low: float, high: float, label: str) -> float:
    if value < low - _RANGE_TOLERANCE or value > high + _RANGE_TOLERANCE:
        raise ValueError(f"{label} must be between {low} and {high}.")
    return value


class PredictionRequest(BaseModel):
    """Raw model inputs. Names match the saved pipeline. ``duration`` is not accepted."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    age: int = Field(..., ge=AGE_MIN, le=AGE_MAX, description="Customer age in years.", examples=[29])
    job: str = Field(..., description="Occupation category from the campaign dataset.", examples=["self-employed"])
    marital: str = Field(..., description="Marital status.", examples=["single"])
    education: str = Field(..., description="Education level.", examples=["university.degree"])
    default: str = Field(..., description="Credit default status.", examples=["no"])
    housing: str = Field(..., description="Has a housing loan.", examples=["yes"])
    loan: str = Field(..., description="Has a personal loan.", examples=["no"])
    contact: str = Field(..., description="Contact channel.", examples=["cellular"])
    month: str = Field(..., description="Month of the last contact in this campaign.", examples=["sep"])
    day_of_week: str = Field(..., description="Weekday of the last contact in this campaign.", examples=["tue"])
    campaign: int = Field(
        ...,
        ge=CAMPAIGN_MIN,
        le=CAMPAIGN_MAX,
        description="Number of contacts performed during this campaign.",
        examples=[2],
    )
    pdays: int = Field(
        ...,
        ge=PDAYS_MIN,
        le=PDAYS_MAX,
        description="Days since the previous contact. 999 means the customer was not previously contacted.",
        examples=[999],
    )
    previous: int = Field(
        ...,
        ge=PREVIOUS_MIN,
        le=PREVIOUS_MAX,
        description="Number of contacts before this campaign.",
        examples=[0],
    )
    poutcome: str = Field(..., description="Outcome of the previous campaign.", examples=["nonexistent"])
    emp_var_rate: float = Field(
        ...,
        alias="emp.var.rate",
        allow_inf_nan=False,
        description="Employment variation rate.",
        examples=[-3.4],
    )
    cons_price_idx: float = Field(
        ...,
        alias="cons.price.idx",
        allow_inf_nan=False,
        description="Consumer price index.",
        examples=[92.379],
    )
    cons_conf_idx: float = Field(
        ...,
        alias="cons.conf.idx",
        allow_inf_nan=False,
        description="Consumer confidence index.",
        examples=[-29.8],
    )
    euribor3m: float = Field(
        ...,
        allow_inf_nan=False,
        description="Euribor 3-month rate.",
        examples=[0.788],
    )
    nr_employed: float = Field(
        ...,
        alias="nr.employed",
        allow_inf_nan=False,
        description="Employment level indicator.",
        examples=[5017.5],
    )

    @field_validator("job")
    @classmethod
    def _job(cls, value: str) -> str:
        return _category(value, JOBS, "Occupation")

    @field_validator("marital")
    @classmethod
    def _marital(cls, value: str) -> str:
        return _category(value, MARITAL_STATUSES, "Marital status")

    @field_validator("education")
    @classmethod
    def _education(cls, value: str) -> str:
        return _category(value, EDUCATION_LEVELS, "Education")

    @field_validator("default")
    @classmethod
    def _default(cls, value: str) -> str:
        return _category(value, DEFAULT_VALUES, "Credit default")

    @field_validator("housing")
    @classmethod
    def _housing(cls, value: str) -> str:
        return _category(value, HOUSING_VALUES, "Housing loan")

    @field_validator("loan")
    @classmethod
    def _loan(cls, value: str) -> str:
        return _category(value, LOAN_VALUES, "Personal loan")

    @field_validator("contact")
    @classmethod
    def _contact(cls, value: str) -> str:
        return _category(value, CONTACT_VALUES, "Contact method")

    @field_validator("month")
    @classmethod
    def _month(cls, value: str) -> str:
        return _category(value, MONTHS, "Campaign month")

    @field_validator("day_of_week")
    @classmethod
    def _day(cls, value: str) -> str:
        return _category(value, DAYS_OF_WEEK, "Campaign day")

    @field_validator("poutcome")
    @classmethod
    def _poutcome(cls, value: str) -> str:
        return _category(value, POUTCOMES, "Previous campaign outcome")

    @field_validator("emp_var_rate")
    @classmethod
    def _check_emp_var_rate(cls, value: float) -> float:
        return _within(value, EMP_VAR_RATE_MIN, EMP_VAR_RATE_MAX, "Employment variation rate")

    @field_validator("cons_price_idx")
    @classmethod
    def _check_cons_price_idx(cls, value: float) -> float:
        return _within(value, CONS_PRICE_IDX_MIN, CONS_PRICE_IDX_MAX, "Consumer price index")

    @field_validator("cons_conf_idx")
    @classmethod
    def _check_cons_conf_idx(cls, value: float) -> float:
        return _within(value, CONS_CONF_IDX_MIN, CONS_CONF_IDX_MAX, "Consumer confidence index")

    @field_validator("euribor3m")
    @classmethod
    def _check_euribor(cls, value: float) -> float:
        return _within(value, EURIBOR3M_MIN, EURIBOR3M_MAX, "Euribor 3-month rate")

    @field_validator("nr_employed")
    @classmethod
    def _check_nr_employed(cls, value: float) -> float:
        return _within(value, NR_EMPLOYED_MIN, NR_EMPLOYED_MAX, "Number of employees")

    @model_validator(mode="after")
    def _campaign_history_is_consistent(self) -> PredictionRequest:
        """Match relationships that always hold in the campaign dataset.

        No previous contacts always pairs with outcome ``nonexistent`` and ``pdays`` 999.
        A previous contact count above zero always has outcome failure or success.
        ``pdays`` may still be 999 in that case, because thousands of dataset rows do.
        """
        if self.previous == 0 and self.poutcome != "nonexistent":
            raise ValueError("Select no previous campaign when previous contacts is 0.")
        if self.previous == 0 and self.pdays != 999:
            raise ValueError("Use 999 for days since previous contact when previous contacts is 0.")
        if self.previous > 0 and self.poutcome == "nonexistent":
            raise ValueError("Select failure or success when this customer was contacted before.")
        if self.pdays != 999 and self.poutcome == "nonexistent":
            raise ValueError("A recorded previous contact day requires an outcome of failure or success.")
        return self


class PredictionResponse(BaseModel):
    probability: float = Field(..., ge=0, le=1, description="Estimated subscription probability.")
    decision: Literal["priority", "lower_priority"]
    decision_label: str
    threshold: float = Field(..., gt=0, lt=1)
    model_name: str
    target: str
    message: str
    explanation: str
    above_threshold: bool
    disclaimer: str


class ErrorResponse(BaseModel):
    error: str
    message: str
