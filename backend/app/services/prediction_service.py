"""Turn a raw customer profile into a business-facing assessment.

Feature engineering stays inside the saved pipeline. This service only
validates the call shape, applies the stored threshold, and writes the response.
"""

from __future__ import annotations

import logging

from app.core.exceptions import PredictionUnavailableError
from app.schemas.prediction import PredictionRequest, PredictionResponse
from app.services.model_service import BankReachModelService

logger = logging.getLogger(__name__)

DISCLAIMER = (
    "Prediction is a probabilistic decision-support signal and should be considered "
    "alongside professional judgement and campaign policy."
)
PRIORITY_EXPLANATION = (
    "The model estimates a relatively high likelihood of term-deposit subscription. "
    "The customer may be considered for higher-priority outreach, subject to human "
    "judgement and campaign policy."
)
LOWER_PRIORITY_EXPLANATION = (
    "The estimated likelihood is below the model's operational threshold. "
    "The customer may receive lower outreach priority, but this does not mean they will not subscribe."
)


def classify_probability(probability: float, threshold: float) -> tuple[str, str, bool]:
    """Apply the artifact threshold. The label is an outreach order, not a refusal."""
    if probability >= threshold:
        return "priority", "Prioritize Outreach", True
    return "lower_priority", "Lower Priority", False


def build_assessment(probability: float, threshold: float, model_name: str) -> PredictionResponse:
    decision, label, above = classify_probability(probability, threshold)
    percent = probability * 100
    explanation = PRIORITY_EXPLANATION if above else LOWER_PRIORITY_EXPLANATION

    return PredictionResponse(
        probability=round(probability, 6),
        decision=decision,
        decision_label=label,
        threshold=threshold,
        model_name=model_name,
        target="Term Deposit Subscription",
        message=f"This customer has an estimated {percent:.1f}% probability of subscribing.",
        explanation=explanation,
        above_threshold=above,
        disclaimer=DISCLAIMER,
    )


class PredictionService:
    def __init__(self, model_service: BankReachModelService) -> None:
        self._model_service = model_service

    def predict(self, request: PredictionRequest) -> PredictionResponse:
        payload = request.model_dump(by_alias=True)
        if "duration" in payload:
            raise PredictionUnavailableError("duration cannot be used for this assessment.")

        probability = self._model_service.predict_probability(payload)
        threshold = self._model_service.decision_threshold
        assessment = build_assessment(probability, threshold, self._model_service.model_name)
        logger.info(
            "Scored profile probability=%.4f decision=%s threshold=%.4f",
            probability,
            assessment.decision,
            threshold,
        )
        return assessment
