"""Tests for the strict LLM meal parser wrapper."""

from __future__ import annotations

import time

import pytest

from src.parser.llm import LLMParserError
from src.runner import _parse_deterministic, parse_meal_llm


@pytest.mark.asyncio
async def test_parse_llm_raises_when_ollama_timeout():
    """When Ollama is unavailable, LLM mode should error instead of falling back."""
    with pytest.raises(LLMParserError, match="Ollama parser failed"):
        await parse_meal_llm("2 cokes and a pizza", ollama_url="http://127.0.0.1:1")


@pytest.mark.asyncio
async def test_parse_llm_failure_is_fast():
    """Connection failures should surface quickly as errors."""
    start = time.monotonic()
    with pytest.raises(LLMParserError):
        await parse_meal_llm("pizza", ollama_url="http://127.0.0.1:1")
    elapsed = time.monotonic() - start
    assert elapsed < 10, f"took too long: {elapsed:.1f}s"


def test_deterministic_parser_covers_golden_cases():
    """Known meal patterns parse correctly for explicit --no-llm/dev mode."""
    cases = {
        "2 donuts and 3 cokes": {"donut", "coke"},
        "pizza and large fries": {"pizza", "fries"},
        "grilled chicken salad rice": {"chicken", "salad", "rice"},
        "Big Mac": {"big mac"},
    }
    for text, expected in cases.items():
        foods = _parse_deterministic(text)
        items = {f.item for f in foods}
        assert items >= expected, f"{text}: expected {expected}, got {items}"


def test_deterministic_parser_no_duplicates():
    """Explicit deterministic parser should not emit duplicate items."""
    foods = _parse_deterministic("pizza and large fries")
    from collections import Counter
    counts = Counter(f.item for f in foods)
    assert max(counts.values()) == 1, f"duplicates: {counts}"
