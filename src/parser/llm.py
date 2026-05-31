#!/usr/bin/env python3
"""LLM meal parser — Ollama-backed parser with explicit failure on LLM errors."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from app.food.service import ParsedFood
from .base import MealParser
from .client import OllamaClient
from .deterministic import DeterministicParser, _canonical_item

logger = logging.getLogger(__name__)

_JSON_BLOCK_RE = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL | re.IGNORECASE)


def _extract_json(text: str) -> Any:
    """Extract JSON from LLM response, handling markdown fences and partial output."""
    text = text.strip()
    for candidate in [*_JSON_BLOCK_RE.findall(text), text]:
        candidate = candidate.strip()
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass
        for start in [candidate.find("{"), candidate.find("[")]:
            if start < 0:
                continue
            for end in range(len(candidate), start, -1):
                try:
                    return json.loads(candidate[start:end])
                except json.JSONDecodeError:
                    continue
    raise ValueError("No valid JSON found in LLM response")


def _normalise_food_dict(raw: dict[str, Any]) -> ParsedFood:
    """Convert a raw food dict from LLM into a canonical ParsedFood."""
    item = _canonical_item(str(raw.get("item") or raw.get("name") or raw.get("food") or "unknown"))
    quantity = float(raw.get("quantity", raw.get("qty", 1)) or 1)
    unit = raw.get("unit")
    unit = str(unit).strip().lower() if unit else None
    terms = raw.get("search_terms") or raw.get("search") or []
    if isinstance(terms, str):
        terms = [terms]
    terms = [str(t).strip().lower() for t in terms if str(t).strip()]
    if not terms:
        from .deterministic import _search_terms
        terms = _search_terms(item)
    return ParsedFood(item=item, quantity=quantity, unit=unit, search_terms=terms)


class LLMParserError(RuntimeError):
    """Raised when LLM parsing cannot produce a valid food parse."""


class LLMParser(MealParser):
    """LLM-based meal parser using Ollama.

    LLM mode is intentionally strict: connection failures, invalid JSON, empty
    food lists, or missing prompts raise `LLMParserError` instead of silently
    falling back to deterministic parsing.

    Usage:
        parser = LLMParser()  # Uses default OllamaClient
        foods = parser.parse("pizza and coke")

        # Or with custom client:
        client = OllamaClient(model="custom-model")
        parser = LLMParser(client=client)
    """

    def __init__(
        self,
        client: OllamaClient | None = None,
        hint_parser: DeterministicParser | None = None,
        fallback: DeterministicParser | None = None,
    ):
        self.client = client or OllamaClient()
        # `fallback` is accepted for old callers but is only used for successful
        # parse enrichment; it is never used as a fallback on LLM failure.
        self.hint_parser = hint_parser or fallback or DeterministicParser()

    def parse(self, text: str) -> list[ParsedFood]:
        """Parse meal text via LLM."""
        foods, _ = self.parse_with_raw(text)
        return foods

    def parse_with_raw(self, text: str) -> tuple[list[ParsedFood], dict[str, Any]]:
        """Parse and return foods plus debug metadata."""
        import asyncio

        try:
            asyncio.get_running_loop()
        except RuntimeError:
            # No running loop — we can run async code directly
            return asyncio.run(self._parse_async(text))
        raise LLMParserError("Cannot use synchronous LLM parse inside an active event loop; call parse_async instead")

    async def _parse_async(self, text: str) -> tuple[list[ParsedFood], dict[str, Any]]:
        """Async parse via LLM. Raise on LLM/prompt/parse failures."""
        system = self.client.load_prompt("parser_system.txt")
        if not system:
            raise LLMParserError("LLM parser prompt not found: parser_system.txt")

        logger.info("Parsing meal via Ollama: %s", text)
        content = await self.client.chat_with_retry(system, text)

        if content is None:
            raise LLMParserError(f"Ollama parser failed for model {self.client.model} at {self.client.ollama_url}")

        try:
            data = _extract_json(content)
            if isinstance(data, list):
                foods_raw = data
            elif isinstance(data, dict):
                foods_raw = data.get("foods", [])
            else:
                foods_raw = []

            foods = [_normalise_food_dict(item) for item in foods_raw if isinstance(item, dict)]
            if foods:
                # Enrich successful LLM parses with deterministic unit/search-term hints.
                hint_foods = self.hint_parser.parse(text)
                by_item = {fd.item: fd for fd in hint_foods}
                for food in foods:
                    hint = by_item.get(food.item)
                    if hint:
                        food.unit = food.unit or hint.unit
                        food.search_terms = food.search_terms or hint.search_terms

                logger.info("Ollama parsed %d foods from: %s", len(foods), text)
                return foods, {
                    "llm_used": True,
                    "raw_response": content,
                    "count": len(foods),
                }
        except (ValueError, json.JSONDecodeError) as exc:
            raise LLMParserError(f"LLM response did not contain valid JSON: {exc}") from exc

        raise LLMParserError("LLM response contained no parseable foods")

    async def parse_async(self, text: str) -> tuple[list[ParsedFood], dict[str, Any]]:
        """Explicit async entry point."""
        return await self._parse_async(text)
