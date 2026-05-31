#!/usr/bin/env python3
"""Layered config loader — defaults + file overrides with merge strategies."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Callable

logger = logging.getLogger(__name__)


def _deep_merge(base: Any, override: Any) -> Any:
    """Deep merge two structures. Dicts are merged, lists are extended (deduped), scalars are replaced."""
    if isinstance(base, dict) and isinstance(override, dict):
        result = dict(base)
        for key, value in override.items():
            if key in result:
                result[key] = _deep_merge(result[key], value)
            else:
                result[key] = value
        return result
    if isinstance(base, list) and isinstance(override, list):
        combined = list(base)
        for item in override:
            if item not in combined:
                combined.append(item)
        return combined
    return override


class LayeredConfigLoader:
    """Load configuration from defaults + layered file overrides.

    Usage:
        loader = LayeredConfigLoader(
            defaults={"emergency": {"keywords": ["low"]}, "dosing": []},
            paths=["data/safety_policy.json", "~/.t1d/config.json"],
            merger=_deep_merge,
        )
        config = loader.load()
    """

    def __init__(
        self,
        defaults: dict[str, Any],
        paths: list[Path | str],
        *,
        merger: Callable[[Any, Any], Any] | None = None,
    ):
        self.defaults = defaults
        self.paths = [Path(p) if isinstance(p, str) else p for p in paths]
        self.merger = merger or _deep_merge

    def load(self) -> dict[str, Any]:
        """Build config by applying file overrides to defaults in order."""
        config = dict(self.defaults)
        for path in self.paths:
            if not path.exists():
                continue
            try:
                file_config = json.loads(path.read_text())
            except (OSError, json.JSONDecodeError) as exc:
                logger.warning("Failed to load config %s: %s", path, exc)
                continue
            config = self.merger(config, file_config)
        return config
