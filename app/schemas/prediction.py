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


class Assumption(BaseModel):
    """Explicit assumption made during prediction."""
    assumption: str
    category: Literal["portion", "profile", "physiology", "timing"]


class GlycemicPrediction(BaseModel):
    """Single prediction contract for companion forecasts."""
    predicted_glucose_mg_dl: int = Field(description="Peak predicted glucose")
    time_to_peak_minutes: int = Field(description="Minutes until peak", gt=0)
    baseline_glucose_mg_dl: int = Field(description="Starting glucose", ge=40, le=400)
    confidence_tier: Literal["high", "medium", "low"]
    carb_estimate_total_g: float = Field(ge=0)

    ascii_chart: str | None = None
    explanation_text: str | None = None
    carb_estimate_range_g: tuple[int, int] | None = None
    food_breakdown: list[FoodBreakdown] | None = None
    assumptions: list[Assumption] | None = None


class SafetyReview(BaseModel):
    """Safety validation contract."""
    is_safe: bool
    blocked_phrases: list[str] = Field(default_factory=list)
    risk_level: Literal["none", "low", "moderate", "high"]
    emergency_triggered: bool = False
    disclaimer_required: bool = True
    reason: str | None = None
