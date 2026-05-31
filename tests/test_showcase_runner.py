from __future__ import annotations

import subprocess

import pytest

from src import cli
from src.cli import _SHOWCASE_CHECKLIST, _situation_category


def _run_cli(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["python3", "-m", "src.cli", *args],
        capture_output=True,
        text=True,
        timeout=30,
    )


def test_product_demo_runs_cleanly_without_llm():
    result = _run_cli("--demo", "product", "--legend", "1", "--no-interactive", "--no-llm")

    assert result.returncode == 0, result.stderr
    assert "data source: synthetic/demo" in result.stdout
    assert "Product demo Coverage Checklist" in result.stdout
    assert "All forecasts shown are educational simulations" in result.stdout


def test_all_cards_exercises_all_card_families_without_llm():
    result = _run_cli("--all-cards", "--no-interactive", "--no-llm")

    assert result.returncode == 0, result.stderr
    assert "Clarification Needed" in result.stdout
    assert "Daily Debrief" in result.stdout
    assert "What-If" in result.stdout
    assert "Showcase Coverage Checklist" in result.stdout
    assert "Product story:" in result.stdout


def test_coverage_checklist_contains_expected_feature_keys():
    labels = {label for _, label in _SHOWCASE_CHECKLIST}

    expected = {
        "Meal pipeline",
        "Food evidence + uncertainty",
        "Forecast chart",
        "Meal memory / historical context",
        "Counterfactual scenarios",
        "Data quality / confidence",
        "Pattern genome",
        "Experiment context",
        "Clarification flow",
        "Daily debrief",
    }
    assert expected <= labels


def test_investor_demo_completes_all_five_steps_without_llm():
    result = _run_cli("--demo", "investor", "--no-llm")

    assert result.returncode == 0, result.stderr
    for idx in range(1, 6):
        assert f"Step {idx}/5" in result.stdout
    assert "Investor demo Coverage Checklist" in result.stdout
    assert "Product story:" in result.stdout


def test_situation_card_routing_for_all_categories():
    assert _situation_category("it is hot and sunny") == "heat"
    assert _situation_category("I went to the gym") == "exercise"
    assert _situation_category("I had a beer") == "alcohol"
    assert _situation_category("I am sick with flu") == "illness"


def test_llm_failure_exits_cleanly(monkeypatch, capsys):
    async def fake_showcase(*args, **kwargs):
        raise RuntimeError("Ollama parser failed for model test at http://test")

    monkeypatch.setattr(cli, "run_showcase", fake_showcase)
    monkeypatch.setattr(cli.sys, "argv", ["src.cli", "--all-cards", "--no-interactive"])

    with pytest.raises(SystemExit) as exc:
        cli.main()

    captured = capsys.readouterr()
    assert exc.value.code == 1
    assert "LLM error:" in captured.err
    assert "Ollama parser failed" in captured.err
    assert "Traceback" not in captured.err
