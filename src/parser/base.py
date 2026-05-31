#!/usr/bin/env python3
"""Meal parser base — abstract contract for all meal parsers."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from app.food.service import ParsedFood


class MealParser(ABC):
    """Abstract base for meal text parsers.

    Implementations:
      - DeterministicParser: regex-based parser for explicit dev/debug mode
      - LLMParser: strict Ollama-backed parser that raises on LLM failures
    """

    @abstractmethod
    def parse(self, text: str) -> list[ParsedFood]:
        """Parse meal text into a list of ParsedFood items.

        Args:
            text: Raw user meal description (e.g. "2 donuts and 3 cokes")

        Returns:
            List of ParsedFood items. Implementations may raise when their
            configured parsing backend cannot produce a valid parse.
        """
        ...

    @abstractmethod
    def parse_with_raw(self, text: str) -> tuple[list[ParsedFood], Any]:
        """Parse and return both foods and raw parser output (for debugging).

        Returns:
            (foods, raw_output) where raw_output is implementation-specific.
        """
        ...
