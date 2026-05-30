"""Tests for the LLM meal parser (uses deterministic fallback when Ollama unavailable)."""

from __future__ import annotations

import asyncio
import json
from unittest.mock import AsyncMock, patch

import pytest

from app.food.service import ParsedFood
from src.runner import _parse_deterministic, parse_meal_llm, DEFAULT_OLLAMA_URL, DEFAULT_OLLAMA_MODEL


@pytest.mark.asyncio
async def test_parse_llm_falls_back_when_ollama_timeout():
    """When Ollama times out, the deterministic parser should be used."""
    foods, raw = await parse_meal_llm("2 cokes and a pizza", ollama_url="http://127.0.0.1:1")
    assert len(foods) >= 2
    assert any(f.item == "coke" for f in foods)
    assert any(f.item == "pizza" for f in foods)
    assert raw is not None and "retries" in raw


@pytest.mark.asyncio
async def test_parse_llm_deterministic_fallback_produces_valid_output():
    """Even without Ollama, the deterministic parser produces ParsedFood items."""
    foods, raw = await parse_meal_llm(
        "grilled chicken with salad and rice",
        ollama_url="http://127.0.0.1:2",
    )
    assert all(isinstance(f, ParsedFood) for f in foods)
    assert any(f.item == "chicken" for f in foods), [f.item for f in foods]
    assert raw is not None


def test_deterministic_parser_covers_golden_cases():
    """Known meal patterns parse correctly."""
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
    """Parser should not emit duplicate items for the same food."""
    foods = _parse_deterministic("pizza and large fries")
    from collections import Counter
    counts = Counter(f.item for f in foods)
    assert max(counts.values()) == 1, f"duplicates: {counts}"


@pytest.mark.asyncio
async def test_llm_parse_fast_fallback():
    """Parse should complete quickly even when Ollama is not reachable."""
    import time
    start = time.monotonic()
    await parse_meal_llm("pizza", ollama_url="http://127.0.0.1:1")
    elapsed = time.monotonic() - start
    # Should fall back fast (connection refused + retry backoff capped)
    assert elapsed < 10, f"took too long: {elapsed:.1f}s"
