from __future__ import annotations

from datetime import datetime, timezone
import subprocess

from app.services.care_team_export import render_care_team_export_markdown, write_care_team_export_markdown
from src.cli import _load_legends


def _legend() -> dict:
    return _load_legends()[0]


def test_render_care_team_export_contains_required_sections():
    report = render_care_team_export_markdown(
        _legend(),
        generated_at=datetime(2026, 1, 2, 3, 4, tzinfo=timezone.utc),
    )

    assert "# Clinician / Care-Team Export Pack" in report
    assert "## Overview" in report
    assert "## Meals Logged" in report
    assert "## Recurring Patterns" in report
    assert "## Uncertainty & Evidence Quality" in report
    assert "## Example Meals For Discussion" in report
    assert "## Questions For Clinician / Care Team" in report
    assert "## Safety Boundary" in report


def test_render_care_team_export_labels_synthetic_demo_data():
    report = render_care_team_export_markdown(_legend())

    assert "Synthetic/demo data source: synthetic_legends_demo" in report
    assert "simulator outputs" in report


def test_render_care_team_export_has_no_dosing_or_treatment_recommendation_terms():
    forbidden = ["dose", "dosing", "bolus", "insulin", "injection", "inject", "units of", "treatment"]

    for legend in _load_legends():
        report = render_care_team_export_markdown(legend).lower()
        for term in forbidden:
            assert term not in report


def test_write_care_team_export_markdown(tmp_path):
    out = write_care_team_export_markdown(_legend(), tmp_path / "care-team-export.md")

    assert out.exists()
    text = out.read_text()
    assert "Clinician / Care-Team Export Pack" in text
    assert "Synthetic/demo data source" in text


def test_cli_export_care_team_writes_markdown(tmp_path):
    out = tmp_path / "export.md"
    result = subprocess.run(
        ["python3", "-m", "src.cli", "--export-care-team", str(out), "--legend", "1"],
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert out.exists()
    assert "Wrote care-team export" in result.stdout
    assert "Synthetic/demo data source" in out.read_text()
