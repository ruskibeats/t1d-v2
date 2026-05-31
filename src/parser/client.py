#!/usr/bin/env python3
"""Ollama client — async LLM client with retry, timeout, and prompt loading."""

from __future__ import annotations

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)

DEFAULT_OLLAMA_URL = "http://192.168.0.137:11434"
DEFAULT_OLLAMA_MODEL = "medgemma:27b"
DEFAULT_PROMPTS_DIR = Path(__file__).resolve().parents[2] / "prompts"


class OllamaClient:
    """Async client for Ollama LLM API with retry and timeout handling.

    Usage:
        client = OllamaClient()
        response = await client.chat("Parse this meal: pizza and coke")
    """

    def __init__(
        self,
        ollama_url: str | None = None,
        model: str | None = None,
        *,
        max_retries: int = 3,
        timeout_seconds: float = 120.0,
        prompts_dir: Path | None = None,
    ):
        self.ollama_url = (ollama_url or os.getenv("OLLAMA_URL") or os.getenv("OLLAMA_HOST", "http://192.168.0.137:11434")).rstrip("/")
        self.model = model or os.getenv("T1D_LOCAL_MODEL", "llama3.1:latest")
        self.max_retries = max_retries
        self.timeout = httpx.Timeout(
            timeout_seconds,
            connect=5.0,
            read=timeout_seconds - 5.0,
        )
        self.prompts_dir = prompts_dir or DEFAULT_PROMPTS_DIR

    async def chat(
        self,
        system: str,
        user: str,
        *,
        temperature: float = 0,
        max_tokens: int = 300,
    ) -> str:
        """Send a chat completion request to Ollama.

        Args:
            system: System prompt content
            user: User message content
            temperature: Sampling temperature (0 = deterministic)
            max_tokens: Max tokens to generate

        Returns:
            Assistant response text

        Raises:
            httpx.TimeoutException: On timeout (caller handles retry)
            httpx.HTTPStatusError: On HTTP error (caller handles retry)
        """
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.ollama_url}/v1/chat/completions",
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
                timeout=self.timeout,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

    async def chat_with_retry(
        self,
        system: str,
        user: str,
        *,
        temperature: float = 0,
        max_tokens: int = 300,
    ) -> str | None:
        """Send chat request with exponential backoff retry.

        Returns response text on success, None if all retries exhausted.
        """
        last_error: Exception | None = None
        for attempt in range(1, self.max_retries + 2):
            try:
                return await self.chat(system, user, temperature=temperature, max_tokens=max_tokens)
            except httpx.TimeoutException as exc:
                logger.warning(
                    "Ollama timeout (attempt %d/%d): %s",
                    attempt, self.max_retries, exc,
                )
                last_error = exc
            except httpx.HTTPStatusError as exc:
                logger.warning(
                    "Ollama HTTP %s (attempt %d/%d): %s",
                    exc.response.status_code, attempt, self.max_retries, exc,
                )
                last_error = exc
            except Exception as exc:
                logger.error(
                    "Ollama call failed (attempt %d/%d): %s",
                    attempt, self.max_retries, exc,
                )
                last_error = exc
                break  # Non-retryable error

            if attempt < self.max_retries + 1:
                await asyncio.sleep(2 ** attempt)

        logger.error("Ollama exhausted retries: %s", last_error)
        return None

    def load_prompt(self, name: str) -> str:
        """Load a prompt file from the prompts directory.

        Args:
            name: Prompt filename (e.g. "parser_system.txt")

        Returns:
            Prompt text, or empty string if not found.
        """
        path = self.prompts_dir / name
        try:
            return path.read_text().strip()
        except FileNotFoundError:
            logger.debug("Prompt file not found: %s", path)
            return ""

    def __repr__(self) -> str:
        return (
            f"OllamaClient(url={self.ollama_url!r}, model={self.model!r}, "
            f"retries={self.max_retries})"
        )
