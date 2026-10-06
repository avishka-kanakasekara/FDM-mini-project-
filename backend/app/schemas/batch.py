"""Contracts for scoring a whole campaign file with the saved pipeline."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class BatchRecord(BaseModel):
    """One scored customer, in the same raw columns the model expects."""

    model_config = ConfigDict(populate_by_name=True)

    row_number: int
    probability: float = Field(..., ge=0, le=1)
    decision: Literal["priority", "lower_priority"]
    decision_label: str
    above_threshold: bool
    age: int
    job: str
    marital: str
    education: str
    default: str
    housing: str
    loan: str
    contact: str
    month: str
    day_of_week: str
    campaign: int
    pdays: int
    previous: int
    poutcome: str
    emp_var_rate: float = Field(..., alias="emp.var.rate")
    cons_price_idx: float = Field(..., alias="cons.price.idx")
    cons_conf_idx: float = Field(..., alias="cons.conf.idx")
    euribor3m: float
    nr_employed: float = Field(..., alias="nr.employed")


class BatchInvalidRow(BaseModel):
    row_number: int
    message: str


class BatchGroup(BaseModel):
    decision: Literal["priority", "lower_priority"]
    label: str
    decision_label: str
    count: int
    share: float
    average_probability: float | None
    guidance: str


class BatchSummary(BaseModel):
    file_rows: int
    scored_rows: int
    invalid_rows: int
    invalid_details_truncated: bool
    threshold: float
    model_name: str
    average_probability: float | None
    groups: list[BatchGroup]
    ignored_columns: list[str]
    notes: list[str]
    disclaimer: str


class BatchScoreResponse(BaseModel):
    summary: BatchSummary
    records: list[BatchRecord]
    invalid: list[BatchInvalidRow]
