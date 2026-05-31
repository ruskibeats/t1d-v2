"""Shared safety policy configuration for runtime and LLM prompt context.

This is the single source of truth for banned words, emergency keywords,
dosing patterns, and treatment patterns. Both `app.ai.safety` and
`src.t1d_llm_context` load from here so prompt-level and runtime safety do
not drift.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from src.utils.config_loader import LayeredConfigLoader

DEFAULT_SAFETY_CONFIG: dict[str, Any] = {
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
    "banned_words": [
        "insulin", "bolus", "injection", "dose", "deliver",
        "pump", "basal", "temp basal", "TBR",
        "SMB", "microbolus", "correction",
    ],
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

SAFETY_CONFIG_PATHS = [
    Path("data/safety_policy.json"),
    Path("data/safety_config.json"),
    Path("/root/t1d/data/safety_config.json"),
]


def _merge_safety_config(base: Any, override: Any) -> Any:
    """Merge safety configs while extending list fields with deduplication."""
    if isinstance(base, dict) and isinstance(override, dict):
        result = dict(base)
        for key, value in override.items():
            if key in result:
                result[key] = _merge_safety_config(result[key], value)
            else:
                result[key] = value
        return result
    if isinstance(base, list) and isinstance(override, list):
        return list(dict.fromkeys([*base, *override]))
    return override


def load_safety_config(paths: list[Path | str] | None = None) -> dict[str, Any]:
    """Load shared safety config from defaults plus optional file overrides."""
    loader = LayeredConfigLoader(
        defaults={
            "emergency_keywords": {
                key: list(values)
                for key, values in DEFAULT_SAFETY_CONFIG["emergency_keywords"].items()
            },
            "banned_words": list(DEFAULT_SAFETY_CONFIG["banned_words"]),
            "dosing_patterns": list(DEFAULT_SAFETY_CONFIG["dosing_patterns"]),
            "treatment_patterns": list(DEFAULT_SAFETY_CONFIG["treatment_patterns"]),
        },
        paths=paths or SAFETY_CONFIG_PATHS,
        merger=_merge_safety_config,
    )
    return loader.load()


def get_banned_words() -> list[str]:
    """Return the shared banned word list used by runtime and prompt context."""
    return list(load_safety_config().get("banned_words", []))
