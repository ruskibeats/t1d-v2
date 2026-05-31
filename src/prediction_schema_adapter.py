#!/usr/bin/env python3
"""Prediction schema adapter — backward-compatibility re-export.

All functionality has moved to src.adapter.schema.
"""

from __future__ import annotations

from src.adapter.schema import forecast_to_prediction_schema

__all__ = ["forecast_to_prediction_schema"]
