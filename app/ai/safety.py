"""Safety scaffold for T1D Companion v2.

Recovered and simplified from V1. This is the final local veto gate for
assistant-facing output: detect emergencies, block dosing/treatment instructions,
and require educational disclaimers.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_DEFAULT_CONFIG: dict[str, Any] = {
    "emergency_keywords": {
        "diabetes_emergency": [
            "severe low", "can't wake", "unconscious", "seizure", "convulsion",
            "glucagon", "passed out", "blackout", "diabetic shock", "insulin shock",
            "dk symptoms", "diabetic ketoacidosis", "ketones", "large ketones",
            "moderate ketones", "fruity breath", "extremely high", "over 600", "bg 600",
        ],
        "mental_health_crisis": [
            "kill myself", "suicide", "end it", "give up", "want to die",
            "no reason to live", "hurt myself", "self harm", "self-harm", "overdose on purpose",
        ],
        "general_medical": [
            "emergency", "urgent", "help", "911", "emergency room", "er now",
            "hospital now", "can't breathe", "chest pain", "confused", "stroke",
            "heart attack", "allergic reaction", "anaphylaxis", "unresponsive",
        ],
    },
    "dosing_patterns": [
        r"\btake\b\s+\d+(?:\.\d+)?\s*(?:units?|u)\b",
        r"\bgive\b\s+\d+(?:\.\d+)?\s*(?:units?|u)\b",
        r"\binject\b\s+\d+(?:\.\d+)?\s*(?:units?|u)\b",
        r"\bdose\b\s+\d+(?:\.\d+)?\s*(?:units?|u)\b",
        r"\b\d+(?:\.\d+)?\s*(?:units?|u)\s+of\s+insulin\b",
        r"\b(?:take|give|inject)\b\s+(?:a\s+)?\d+(?:\.\d+)?\s*(?:unit|u)\b",
        r"\b(?:pre[- ]?bolus|split bolus|extended bolus|square wave)\b",
    ],
    "treatment_patterns": [
        r"\bchange\b.*\btreatment\b",
        r"\bstop\b.*\binsulin\b",
        r"\bdiscontinue\b.*\bmedication\b",
        r"\bincrease\b.*\bbasal\b",
        r"\bdecrease\b.*\bbasal\b",
    ],
}

_CONFIG_PATHS = [
    Path("data/safety_policy.json"),
    Path("data/safety_config.json"),
    Path("/root/t1d/data/safety_config.json"),
]


def _load_config() -> dict[str, Any]:
    config = {
        "emergency_keywords": {k: list(v) for k, v in _DEFAULT_CONFIG["emergency_keywords"].items()},
        "dosing_patterns": list(_DEFAULT_CONFIG["dosing_patterns"]),
        "treatment_patterns": list(_DEFAULT_CONFIG["treatment_patterns"]),
    }
    for path in _CONFIG_PATHS:
        if not path.exists():
            continue
        try:
            file_config = json.loads(path.read_text())
        except (OSError, json.JSONDecodeError) as exc:
            logger.warning("Failed to load safety config %s: %s", path, exc)
            continue
        if isinstance(file_config.get("emergency_keywords"), dict):
            for key, value in file_config["emergency_keywords"].items():
                if isinstance(value, list):
                    config["emergency_keywords"][key] = value
        if isinstance(file_config.get("dosing_patterns"), list):
            # File config extends rather than replaces the local hard safety net.
            config["dosing_patterns"] = list(dict.fromkeys([
                *config["dosing_patterns"],
                *file_config["dosing_patterns"],
            ]))
        if isinstance(file_config.get("treatment_patterns"), list):
            config["treatment_patterns"] = list(dict.fromkeys([
                *config["treatment_patterns"],
                *file_config["treatment_patterns"],
            ]))
        break
    return config


class SafetyScaffold:
    """Emergency and policy validation for T1D companion text."""

    def __init__(self) -> None:
        self._config = _load_config()
        self._compiled_keywords = {
            condition: re.compile(r"(?:" + "|".join(re.escape(k) for k in keywords) + r")", re.IGNORECASE)
            for condition, keywords in self._config["emergency_keywords"].items()
        }
        all_keywords = [k for keywords in self._config["emergency_keywords"].values() for k in keywords]
        self._compiled_keywords["all"] = re.compile(
            r"(?:" + "|".join(re.escape(k) for k in all_keywords) + r")",
            re.IGNORECASE,
        )
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

        for pattern in [*self._dosing_patterns, *self._treatment_patterns]:
            match = pattern.search(content)
            if match:
                blocked_phrases.append(match.group())
                risk_level = "high"
                reason = "Detected dosing or treatment instruction"

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
