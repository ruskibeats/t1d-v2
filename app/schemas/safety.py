"""Safety schema for T1D Companion v2."""

from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


class SafetyReview(BaseModel):
    """Single output contract for safety validation."""
    is_safe: bool
    blocked_phrases: list[str] = Field(default_factory=list)
    risk_level: Literal["none", "low", "moderate", "high"]
    emergency_triggered: bool = False
    disclaimer_required: bool = True
    reason: str | None = None
