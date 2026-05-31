"""Tests for shared safety policy used by runtime and LLM context."""

from __future__ import annotations

from app.ai.safety import SafetyScaffold
from app.ai.safety_policy import get_banned_words, load_safety_config
from src.t1d_llm_context import BANNED_WORDS, check_banned_words, get_context, is_safe_response


def test_llm_context_uses_shared_banned_words():
    """Prompt context and runtime policy derive banned words from one source."""
    shared = get_banned_words()
    assert BANNED_WORDS == shared
    assert get_context()["banned_words"] == shared


def test_runtime_blocks_shared_banned_words():
    safety = SafetyScaffold()
    for word in get_banned_words():
        review = safety.validate(f"This output mentions {word}.")
        assert not review["is_safe"], word
        assert word.lower() in [p.lower() for p in review["blocked_phrases"]]


def test_llm_context_banned_word_helpers_match_policy():
    text = "This mentions insulin and bolus language."
    blocked = check_banned_words(text)
    assert "insulin" in blocked
    assert "bolus" in blocked
    assert not is_safe_response(text)
    assert is_safe_response("Glucose may rise and peak around 90 minutes.")


def test_safety_policy_file_extends_defaults():
    config = load_safety_config()
    for key in ["emergency_keywords", "banned_words", "dosing_patterns", "treatment_patterns"]:
        assert key in config
    assert "insulin" in config["banned_words"]
    assert any("units" in pattern for pattern in config["dosing_patterns"])
