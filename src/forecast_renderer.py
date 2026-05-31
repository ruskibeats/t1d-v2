#!/usr/bin/env python3
"""Forecast renderer — backward-compatibility re-export.

All functionality has moved to src.forecast.renderer.
"""

from __future__ import annotations

from .forecast.renderer import render_forecast, build_historical_timeline

__all__ = ["render_forecast", "build_historical_timeline"]
