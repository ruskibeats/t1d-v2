"""Tests for LLMParser."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from src.parser.llm import LLMParser, LLMParserError, _extract_json, _normalise_food_dict
from src.parser.client import OllamaClient


class TestExtractJson:
    """Test JSON extraction from LLM responses."""

    def test_plain_json(self):
        raw = '{"foods": [{"item": "pizza", "quantity": 2}]}'
        result = _extract_json(raw)
        assert result == {"foods": [{"item": "pizza", "quantity": 2}]}

    def test_json_with_markdown_fences(self):
        raw = '```json\n{"foods": [{"item": "coke"}]}\n```'
        result = _extract_json(raw)
        assert result == {"foods": [{"item": "coke"}]}

    def test_chatty_response(self):
        raw = """Sure! Here's the parsed meal:

{
    "foods": [
        {"name": "chicken", "qty": 1},
        {"name": "rice", "qty": 1}
    ]
}

This is my best guess."""
        result = _extract_json(raw)
        assert len(result["foods"]) == 2

    def test_no_valid_json_raises(self):
        with pytest.raises(ValueError, match="No valid JSON"):
            _extract_json("Just some text without JSON")


class TestNormaliseFoodDict:
    """Test food dict normalisation."""

    def test_basic_dict(self):
        raw = {"item": "pizza", "quantity": 2, "unit": "slice"}
        food = _normalise_food_dict(raw)
        assert food.item == "pizza"
        assert food.quantity == 2.0
        assert food.unit == "slice"

    def test_name_alias(self):
        raw = {"name": "coke", "qty": 1}
        food = _normalise_food_dict(raw)
        assert food.item == "coke"
        assert food.quantity == 1.0

    def test_search_terms(self):
        raw = {"item": "pizza", "search_terms": ["pepperoni"]}
        food = _normalise_food_dict(raw)
        assert "pepperoni" in food.search_terms

    def test_defaults_for_missing(self):
        raw = {"item": "donut"}
        food = _normalise_food_dict(raw)
        assert food.quantity == 1.0
        assert food.unit is None


class TestLLMParserSync:
    """Test synchronous parse interface."""

    def test_no_prompt_raises(self):
        client = MagicMock(spec=OllamaClient)
        client.load_prompt.return_value = ""
        parser = LLMParser(client=client)
        with pytest.raises(LLMParserError, match="prompt not found"):
            parser.parse("2 donuts and 3 cokes")

    def test_parse_inside_async_context_raises(self):
        import asyncio

        client = MagicMock(spec=OllamaClient)
        client.load_prompt.return_value = "system prompt"
        parser = LLMParser(client=client)

        async def inner():
            return parser.parse("pizza")

        with pytest.raises(LLMParserError, match="parse_async"):
            asyncio.run(inner())


class TestLLMParserAsync:
    """Test async parse interface."""

    @pytest.mark.asyncio
    async def test_successful_llm_parse(self):
        client = MagicMock(spec=OllamaClient)
        client.load_prompt.return_value = "system prompt"
        client.chat_with_retry = AsyncMock(return_value='{"foods": [{"item": "pizza", "quantity": 2, "unit": "slice"}]}')

        parser = LLMParser(client=client)
        foods, meta = await parser.parse_async("2 slices of pizza")

        assert len(foods) == 1
        assert foods[0].item == "pizza"
        assert foods[0].quantity == 2.0
        assert meta["llm_used"] is True

    @pytest.mark.asyncio
    async def test_ollama_failure_raises(self):
        client = MagicMock(spec=OllamaClient)
        client.load_prompt.return_value = "system prompt"
        client.chat_with_retry = AsyncMock(return_value=None)
        client.model = "test-model"
        client.ollama_url = "http://ollama"

        parser = LLMParser(client=client)
        with pytest.raises(LLMParserError, match="Ollama parser failed"):
            await parser.parse_async("2 donuts and 3 cokes")

    @pytest.mark.asyncio
    async def test_invalid_json_raises(self):
        client = MagicMock(spec=OllamaClient)
        client.load_prompt.return_value = "system prompt"
        client.chat_with_retry = AsyncMock(return_value="not json at all")

        parser = LLMParser(client=client)
        with pytest.raises(LLMParserError, match="valid JSON"):
            await parser.parse_async("pizza")

    @pytest.mark.asyncio
    async def test_empty_foods_list_raises(self):
        client = MagicMock(spec=OllamaClient)
        client.load_prompt.return_value = "system prompt"
        client.chat_with_retry = AsyncMock(return_value='{"foods": []}')

        parser = LLMParser(client=client)
        with pytest.raises(LLMParserError, match="no parseable foods"):
            await parser.parse_async("2 donuts and 3 cokes")

    @pytest.mark.asyncio
    async def test_enriches_with_deterministic_hints_after_successful_llm_parse(self):
        client = MagicMock(spec=OllamaClient)
        client.load_prompt.return_value = "system prompt"
        client.chat_with_retry = AsyncMock(return_value='{"foods": [{"item": "coke", "quantity": 3}]}')

        parser = LLMParser(client=client)
        foods, meta = await parser.parse_async("3 cokes")

        assert meta["llm_used"] is True
        assert foods[0].item == "coke"
        assert foods[0].quantity == 3.0
        assert foods[0].unit == "can"

    @pytest.mark.asyncio
    async def test_list_response_format(self):
        client = MagicMock(spec=OllamaClient)
        client.load_prompt.return_value = "system prompt"
        client.chat_with_retry = AsyncMock(return_value='[{"item": "pizza"}, {"item": "coke"}]')

        parser = LLMParser(client=client)
        foods, meta = await parser.parse_async("pizza and coke")

        assert len(foods) == 2
        assert meta["llm_used"] is True
