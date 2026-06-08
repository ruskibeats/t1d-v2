"""Canonical prediction schemas for T1D Companion v2."""

from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


class FoodBreakdown(BaseModel):
    """Per-item nutritional contribution to prediction."""
    item_name: str
    carbs_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    estimated_glucose_impact_mg_dl: float

    # Provenance fields (Issue #46)
    source: str | None = Field(default=None, description="Provenance source: db_match, estimate, or proxy")
    evidence_refs: list[str] | None = Field(default=None, description="Event IDs or data references")


class Assumption(BaseModel):
    """Explicit assumption made during prediction."""
    assumption: str
    category: Literal["portion", "profile", "physiology", "timing"]
    confidence_component: str | None = Field(default=None, description="Which confidence component this affects")


class ConfidenceComponents(BaseModel):
    """Breakdown of confidence factors (Issue #46)."""
    identity: float = Field(default=0.0, description="How sure we are about food identity (0-1)")
    portion: float = Field(default=0.0, description="How sure we are about portion size (0-1)")
    nutrition: float = Field(default=0.0, description="How sure we are about nutrition values (0-1)")
    timing: float = Field(default=0.0, description="How sure we are about meal timing (0-1)")


class EvidenceBasis(BaseModel):
    """Evidence supporting a prediction or insight (Issue #46)."""
    data_source: str = Field(description="Where the data came from: real_cgm, food_proxy, synthetic_legend, etc.")
    evidence_refs: list[str] | None = Field(default=None, description="Event IDs or data references")
    data_window_days: int | None = Field(default=None, description="How many days of data were analyzed")
    similar_meals_count: int | None = Field(default=None, description="Number of similar historical meals")
    glucose_outcomes_count: int | None = Field(default=None, description="Number of glucose readings linked to this")


class GlycemicPrediction(BaseModel):
    """Single prediction contract for companion forecasts."""
    predicted_glucose_mg_dl: int = Field(description="Peak predicted glucose")
    time_to_peak_minutes: int = Field(description="Minutes until peak", gt=0)
    baseline_glucose_mg_dl: int = Field(description="Starting glucose", ge=40, le=400)
    confidence_tier: Literal["high", "medium", "low"]
    carb_estimate_total_g: float = Field(ge=0)

    # Provenance fields (Issue #46)
    evidence_basis: EvidenceBasis | None = Field(default=None, description="What evidence supports this prediction")
    confidence_components: ConfidenceComponents | None = Field(default=None, description="Breakdown of confidence factors")

    ascii_chart: str | None = None
    explanation_text: str | None = None
    carb_estimate_range_g: tuple[int, int] | None = None
    food_breakdown: list[FoodBreakdown] | None = None
    assumptions: list[Assumption] | None = None


# SafetyReview is defined in app/schemas/safety.py (canonical location)
