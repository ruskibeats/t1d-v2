#!/usr/bin/env python3
"""Forecast model dataclasses — the type definitions for glucose forecasts."""

from __future__ import annotations

from typing import Any
from dataclasses import dataclass, field


@dataclass
class MealTotals:
    carbs_g: float = 0.0
    fat_g: float = 0.0
    sugars_g: float = 0.0
    protein_g: float = 0.0
    kcal: float = 0.0

    @classmethod
    def from_dict(cls, d: dict[str, float]) -> MealTotals:
        return cls(
            carbs_g=d.get("carbs_g", 0),
            fat_g=d.get("fat_g", 0),
            sugars_g=d.get("sugars_g", 0),
            protein_g=d.get("protein_g", 0),
            kcal=d.get("kcal", 0),
        )


@dataclass
class ForecastPoint:
    hour: int
    glucose_mg_dl: int


@dataclass
class NighttimePoint:
    time: str
    hours_after_meal: int
    glucose_mg_dl: int
    note: str = ""


@dataclass
class ForecastScenario:
    """One forecast scenario within a carb uncertainty band."""
    label: str
    carbs_g: float
    peak_mg_dl: int
    peak_time_minutes: int
    forecast_points: list[ForecastPoint] = field(default_factory=list)


@dataclass
class ForecastUncertaintyBand:
    """Low/point/high forecasts induced by carb-estimation uncertainty."""
    low: ForecastScenario
    point: ForecastScenario
    high: ForecastScenario
    peak_range_mg_dl: tuple[int, int]
    peak_time_range_minutes: tuple[int, int]


@dataclass
class ForecastResult:
    baseline_mg_dl: int
    peak_mg_dl: int
    peak_time_minutes: int
    forecast_points: list[ForecastPoint] = field(default_factory=list)
    nighttime: list[NighttimePoint] = field(default_factory=list)
    exercise_heat_modifier: float = 1.0
    meal_drivers: dict[str, Any] = field(default_factory=dict)
    uncertainty_band: ForecastUncertaintyBand | None = None

    # Evidence/provenance fields (Phase 2 guardrails)
    top_drivers: list[str] = field(default_factory=list)
    historical_similarity_score: float | None = None
    profile_assumptions: dict[str, Any] = field(default_factory=dict)
    missing_information_flags: list[str] = field(default_factory=list)
    evidence_items: list[dict] = field(default_factory=list)
