#!/usr/bin/env python3
"""Forecast stage — calibration + orchestration of the forecast pipeline."""

from __future__ import annotations

from typing import Any, Callable

from .model import ForecastResult, MealTotals
from .glucose import forecast_glucose
from ..calibration_constants import RISE_PER_CARB_MAP, BALANCE_MAP


class ForecastStage:
    """Encapsulates per-anchor forecast calibration and the forecast pipeline.

    This is a deep module: a small interface (forecast(totals, hour)) hides
    the calibration constants, kernel composition, and OU simulation.

    Usage:
        stage = ForecastStage.from_profile(profile_config)
        result = stage.forecast(meal_totals, hour=19)
    """

    def __init__(
        self,
        anchor_type: str,
        basal_mg_dl: float,
        carb_ratio: float,
        insulin_sensitivity: float,
        fat_delay_hours: float,
        exercise_drop_factor: float,
    ):
        self.anchor_type = anchor_type
        self.basal_mg_dl = basal_mg_dl
        self.carb_ratio = carb_ratio
        self.insulin_sensitivity = insulin_sensitivity
        self.fat_delay_hours = fat_delay_hours
        self.exercise_drop_factor = exercise_drop_factor

        # Resolve calibration constants from anchor type
        self._rise_per_g = RISE_PER_CARB_MAP.get(anchor_type, 0.6)
        self._balance_factor = BALANCE_MAP.get(anchor_type, 1.2)

    @classmethod
    def from_profile(cls, profile_config: Any) -> ForecastStage:
        """Create a ForecastStage from a PatientConfig-like object."""
        return cls(
            anchor_type=profile_config.anchor_type.value,
            basal_mg_dl=profile_config.basal_glucose_mean,
            carb_ratio=profile_config.carb_ratio,
            insulin_sensitivity=profile_config.insulin_sensitivity,
            fat_delay_hours=profile_config.fat_delay_hours,
            exercise_drop_factor=profile_config.exercise_drop_factor,
        )

    def forecast(
        self,
        totals: MealTotals,
        hour: int = 19,
        carb_range_g: tuple[float, float] | None = None,
    ) -> ForecastResult:
        """Run the full glucose forecast for a meal."""
        return forecast_glucose(
            totals=totals,
            basal_mg_dl=self.basal_mg_dl,
            carb_ratio=self.carb_ratio,
            insulin_sensitivity=self.insulin_sensitivity,
            fat_delay_hours=self.fat_delay_hours,
            exercise_drop_factor=self.exercise_drop_factor,
            anchor_type=self.anchor_type,
            hour=hour,
            carb_range_g=carb_range_g,
        )

    @property
    def calibration(self) -> dict:
        """Return the resolved calibration constants for logging/debugging."""
        return {
            "anchor_type": self.anchor_type,
            "rise_per_g": self._rise_per_g,
            "balance_factor": self._balance_factor,
            "basal_mg_dl": self.basal_mg_dl,
            "carb_ratio": self.carb_ratio,
            "insulin_sensitivity": self.insulin_sensitivity,
            "fat_delay_hours": self.fat_delay_hours,
            "exercise_drop_factor": self.exercise_drop_factor,
        }


def make_forecaster(
    basal_mg_dl: float,
    carb_ratio: float,
    insulin_sensitivity: float,
    fat_delay_hours: float,
    exercise_drop_factor: float,
    anchor_type: str,
) -> Callable[[MealTotals, int], ForecastResult]:
    """Bind profile parameters to the functional pipeline. Convenience wrapper."""
    def _predict(totals: MealTotals, hour: int = 19) -> ForecastResult:
        return forecast_glucose(
            totals,
            basal_mg_dl=basal_mg_dl,
            carb_ratio=carb_ratio,
            insulin_sensitivity=insulin_sensitivity,
            fat_delay_hours=fat_delay_hours,
            exercise_drop_factor=exercise_drop_factor,
            anchor_type=anchor_type,
            hour=hour,
        )
    return _predict
