"""Tests for OllamaClient."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from src.parser.client import OllamaClient


class TestChat:
    """Test basic chat completion."""

    @pytest.mark.asyncio
    async def test_chat_success(self):
        client = OllamaClient(ollama_url="http://test:11434", model="test-model")
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "choices": [{"message": {"content": "Parsed result"}}]
        }
        mock_resp.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
            result = await client.chat("system prompt", "user message")
            assert result == "Parsed result"

    @pytest.mark.asyncio
    async def test_chat_timeout(self):
        client = OllamaClient(ollama_url="http://test:11434")

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=httpx.TimeoutException("Timeout")):
            with pytest.raises(httpx.TimeoutException):
                await client.chat("system", "user")

    @pytest.mark.asyncio
    async def test_chat_http_error(self):
        client = OllamaClient(ollama_url="http://test:11434")
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = httpx.HTTPStatusError(
            "500", request=MagicMock(), response=MagicMock(status_code=500)
        )

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
            with pytest.raises(httpx.HTTPStatusError):
                await client.chat("system", "user")


class TestChatWithRetry:
    """Test retry logic."""

    @pytest.mark.asyncio
    async def test_retry_success_on_first_attempt(self):
        client = OllamaClient(ollama_url="http://test:11434", max_retries=2)
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"choices": [{"message": {"content": "OK"}}]}
        mock_resp.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp) as mock_post:
            result = await client.chat_with_retry("system", "user")
            assert result == "OK"
            assert mock_post.call_count == 1

    @pytest.mark.asyncio
    async def test_retry_success_on_second_attempt(self):
        client = OllamaClient(ollama_url="http://test:11434", max_retries=2)
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"choices": [{"message": {"content": "OK"}}]}
        mock_resp.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=[
            httpx.TimeoutException("Timeout"),
            mock_resp,
        ]) as mock_post:
            result = await client.chat_with_retry("system", "user")
            assert result == "OK"
            assert mock_post.call_count == 2

    @pytest.mark.asyncio
    async def test_retry_exhausted_returns_none(self):
        client = OllamaClient(ollama_url="http://test:11434", max_retries=1)

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=httpx.TimeoutException("Timeout")):
            result = await client.chat_with_retry("system", "user")
            assert result is None

    @pytest.mark.asyncio
    async def test_non_retryable_error_returns_none_immediately(self):
        client = OllamaClient(ollama_url="http://test:11434", max_retries=2)

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=ValueError("Bad request")) as mock_post:
            result = await client.chat_with_retry("system", "user")
            assert result is None
            assert mock_post.call_count == 1  # No retry for non-httpx errors


class TestLoadPrompt:
    """Test prompt loading."""

    def test_load_existing_prompt(self, tmp_path):
        prompts_dir = tmp_path / "prompts"
        prompts_dir.mkdir()
        (prompts_dir / "test.txt").write_text("Test prompt content")

        client = OllamaClient(prompts_dir=prompts_dir)
        result = client.load_prompt("test.txt")
        assert result == "Test prompt content"

    def test_load_missing_prompt_returns_empty(self, tmp_path):
        prompts_dir = tmp_path / "prompts"
        prompts_dir.mkdir()

        client = OllamaClient(prompts_dir=prompts_dir)
        result = client.load_prompt("missing.txt")
        assert result == ""


class TestDefaults:
    """Test default configuration."""

    def test_default_url_from_env(self, monkeypatch):
        monkeypatch.setenv("OLLAMA_URL", "http://custom:11434")
        client = OllamaClient()
        assert client.ollama_url == "http://custom:11434"

    def test_default_model_from_env(self, monkeypatch):
        monkeypatch.setenv("T1D_LOCAL_MODEL", "custom-model")
        client = OllamaClient()
        assert client.model == "custom-model"

    def test_repr(self):
        client = OllamaClient(ollama_url="http://test:11434", model="test-model", max_retries=3)
        repr_str = repr(client)
        assert "OllamaClient" in repr_str
        assert "test:11434" in repr_str
        assert "test-model" in repr_str
