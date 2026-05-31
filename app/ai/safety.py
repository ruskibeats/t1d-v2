"""Safety scaffold for T1D Companion v2.

This is the final local veto gate for assistant-facing output: detect
emergencies, block dosing/treatment instructions, block shared banned words,
and require educational disclaimers.
"""

from __future__ import annotations

import re
from typing import Any

from app.ai.safety_policy import load_safety_config


class SafetyScaffold:
    """Emergency and policy validation for T1D companion text."""

    def __init__(self) -> None:
        self._config = load_safety_config()
        self._compiled_keywords = {
            condition: re.compile(r"(?:" + "|".join(re.escape(k) for k in keywords) + r")", re.IGNORECASE)
            for condition, keywords in self._config["emergency_keywords"].items()
        }
        all_keywords = [k for keywords in self._config["emergency_keywords"].values() for k in keywords]
        self._compiled_keywords["all"] = re.compile(
            r"(?:" + "|".join(re.escape(k) for k in all_keywords) + r")",
            re.IGNORECASE,
        )
        self._banned_word_patterns = [
            re.compile(r"\b" + re.escape(word) + r"\b", re.IGNORECASE)
            for word in self._config.get("banned_words", [])
        ]
        self._dosing_patterns = [re.compile(p, re.IGNORECASE) for p in self._config["dosing_patterns"]]
        self._treatment_patterns = [re.compile(p, re.IGNORECASE) for p in self._config["treatment_patterns"]]

    def validate(self, content: str, context: dict | None = None) -> dict[str, Any]:
        """Validate content and return SafetyReview-compatible dict."""
        matched_conditions: list[str] = []
        for condition, pattern in self._compiled_keywords.items():
            if condition != "all" and pattern.search(content):
                matched_conditions.append(condition)

        blocked_phrases: list[str] = []
        reason: str | None = None
        risk_level = "none"

        if "diabetes_emergency" in matched_conditions or "mental_health_crisis" in matched_conditions:
            risk_level = "high"
            reason = "Emergency keyword detected"
        elif "general_medical" in matched_conditions:
            risk_level = "moderate"
            reason = "Medical urgency keyword detected"

        for pattern in [*self._banned_word_patterns, *self._dosing_patterns, *self._treatment_patterns]:
            match = pattern.search(content)
            if match:
                blocked_phrases.append(match.group())
                risk_level = "high"
                reason = "Detected banned dosing or treatment language"

        return {
            "is_safe": risk_level == "none" and not blocked_phrases,
            "blocked_phrases": blocked_phrases,
            "risk_level": risk_level,
            "emergency_triggered": bool(matched_conditions),
            "disclaimer_required": True,
            "reason": reason,
        }

    def contains_emergency_keywords(self, text: str) -> bool:
        return bool(self._compiled_keywords["all"].search(text))


DEFAULT_SAFETY = SafetyScaffold()


def validate_output(content: str, context: dict | None = None) -> dict[str, Any]:
    """Convenience wrapper around the default scaffold."""
    return DEFAULT_SAFETY.validate(content, context)
