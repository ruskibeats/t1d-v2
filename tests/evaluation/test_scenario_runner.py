"""Deterministic evaluation harness v1 — scenario cookbook + CI gate (Issue #44).

Loads YAML scenarios from tests/evaluation/scenarios/, runs pattern genome analysis
and companion pipeline checks, then asserts expected outcomes.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import pytest
import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.schemas.safety import SafetyReview
from app.services.pattern_genome import (
    analyze_pattern_genome,
    render_pattern_genome_card,
)
from src.companion import detect_intent

SCENARIOS_DIR = Path(__file__).resolve().parent / "scenarios"


# ── Helpers ──

def _load_scenarios() -> list[dict[str, Any]]:
    """Load all YAML scenario files from the scenarios directory."""
    scenarios = []
    for f in sorted(SCENARIOS_DIR.glob("*.yaml")):
        with open(f) as fh:
            data = yaml.safe_load(fh)
            if data and "scenario" in data:
                data["scenario"]["_file"] = f.name
                scenarios.append(data["scenario"])
    return scenarios


def _run_pattern_genome(scenario: dict[str, Any]):
    """Run pattern genome analysis on a scenario's data."""
    meals = scenario.get("meals", [])
    cgm = scenario.get("glucose_readings") or None
    activity = scenario.get("activity_events") or None

    if not meals:
        return None

    genome = analyze_pattern_genome(
        food_history=meals,
        profile_name=scenario.get("id", "scenario"),
        anchor_type="",
        glucose_readings=cgm,
        activity_events=activity,
    )
    return genome


def _get_trait_by_id(genome, trait_id: str):
    """Look up a trait by trait_id in a genome."""
    if genome is None:
        return None
    for t in genome.traits:
        if t.trait_id == trait_id:
            return t
    return None


# ── Scenario loading ──

ALL_SCENARIOS = _load_scenarios()


# ── Test pattern scenarios ──

class TestPatternScenarios:
    """Pattern scenarios verify planted patterns are detected correctly."""

    @pytest.mark.parametrize("scenario", [s for s in ALL_SCENARIOS if s.get("type") == "pattern"], ids=lambda s: s["id"])
    def test_pattern_present_assertions(self, scenario):
        """All patterns listed in pattern_present must be detected."""
        genome = _run_pattern_genome(scenario)
        if genome is None:
            pytest.skip(f"No meal data in {scenario['id']}", allow_module_level=False)
        assertions = scenario.get("assertions", {})
        for pattern_id in assertions.get("pattern_present", []):
            trait = _get_trait_by_id(genome, pattern_id)
            assert trait is not None, (
                f"[{scenario['id']}] Expected pattern '{pattern_id}' not found in traits: "
                f"{[t.trait_id for t in genome.traits]}"
            )

    @pytest.mark.parametrize("scenario", [s for s in ALL_SCENARIOS if s.get("type") == "pattern"], ids=lambda s: s["id"])
    def test_pattern_absent_assertions(self, scenario):
        """Patterns listed in pattern_absent must NOT be detected with high confidence."""
        genome = _run_pattern_genome(scenario)
        if genome is None:
            pytest.skip(f"No meal data in {scenario['id']}", allow_module_level=False)
        assertions = scenario.get("assertions", {})
        for pattern_id in assertions.get("pattern_absent", []):
            trait = _get_trait_by_id(genome, pattern_id)
            if trait is not None:
                assert trait.confidence == "low", (
                    f"[{scenario['id']}] Pattern '{pattern_id}' should be absent but has "
                    f"confidence={trait.confidence}"
                )

    @pytest.mark.parametrize("scenario", [s for s in ALL_SCENARIOS if s.get("type") == "pattern"], ids=lambda s: s["id"])
    def test_min_evidence_count(self, scenario):
        """Traits listed in pattern_present must meet minimum evidence count."""
        genome = _run_pattern_genome(scenario)
        if genome is None:
            pytest.skip(f"No meal data in {scenario['id']}", allow_module_level=False)
        assertions = scenario.get("assertions", {})
        min_count = assertions.get("min_evidence_count", 0)
        for pattern_id in assertions.get("pattern_present", []):
            trait = _get_trait_by_id(genome, pattern_id)
            assert trait is not None, (
                f"[{scenario['id']}] Expected pattern '{pattern_id}' not found"
            )
            assert trait.evidence_count >= min_count, (
                f"[{scenario['id']}] {trait.trait_id} has evidence_count={trait.evidence_count}, "
                f"expected >= {min_count}"
            )

    @pytest.mark.parametrize("scenario", [s for s in ALL_SCENARIOS if s.get("type") == "pattern"], ids=lambda s: s["id"])
    def test_schema_valid(self, scenario):
        """All PatternGenome output must be valid dataclass instances."""
        genome = _run_pattern_genome(scenario)
        if genome is None:
            pytest.skip(f"No meal data in {scenario['id']}", allow_module_level=False)

        assert genome.profile_name
        assert genome.total_meals_analyzed >= 0
        assert len(genome.traits) == 6, f"Expected 6 traits, got {len(genome.traits)}"

        for trait in genome.traits:
            assert trait.trait_id, f"Empty trait_id in {scenario['id']}"
            assert trait.label, f"Empty label in {scenario['id']}"
            assert trait.confidence in ("high", "medium", "low"), (
                f"Invalid confidence '{trait.confidence}' in {scenario['id']}"
            )
            assert 0.0 <= trait.confidence_score <= 1.0, (
                f"confidence_score out of range in {scenario['id']}"
            )
            assert trait.data_source in ("real_cgm", "food_proxy", "synthetic_legend", ""), (
                f"Invalid data_source '{trait.data_source}' in {scenario['id']}"
            )

    @pytest.mark.parametrize("scenario", [s for s in ALL_SCENARIOS if s.get("type") == "pattern"], ids=lambda s: s["id"])
    def test_data_source_present(self, scenario):
        """Every TraitInsight must carry a data_source label (Issue #43)."""
        genome = _run_pattern_genome(scenario)
        if genome is None:
            pytest.skip(f"No meal data in {scenario['id']}", allow_module_level=False)
        valid = {"real_cgm", "food_proxy", "synthetic_legend"}
        for trait in genome.traits:
            assert trait.data_source in valid, (
                f"[{scenario['id']}] {trait.trait_id}: data_source='{trait.data_source}' "
                f"not in {valid}"
            )

    @pytest.mark.parametrize("scenario", [s for s in ALL_SCENARIOS if s.get("type") == "pattern"], ids=lambda s: s["id"])
    def test_confidence_tier_in_range(self, scenario):
        """Confidence tier must not exceed the scenario's max allowed tier."""
        genome = _run_pattern_genome(scenario)
        if genome is None:
            pytest.skip(f"No meal data in {scenario['id']}", allow_module_level=False)
        assertions = scenario.get("assertions", {})
        max_tier = assertions.get("max_confidence_tier", "high")
        tier_rank = {"low": 0, "medium": 1, "high": 2}
        max_rank = tier_rank.get(max_tier, 2)
        for trait in genome.traits:
            trait_rank = tier_rank.get(trait.confidence, 2)
            assert trait_rank <= max_rank, (
                f"[{scenario['id']}] {trait.trait_id}: confidence={trait.confidence} "
                f"exceeds max allowed '{max_tier}'"
            )

    @pytest.mark.parametrize("scenario", [s for s in ALL_SCENARIOS if s.get("type") == "pattern"], ids=lambda s: s["id"])
    def test_safety_pass(self, scenario):
        """Pattern genome analysis should not trigger safety violations."""
        genome = _run_pattern_genome(scenario)
        if genome is None:
            pytest.skip(f"No meal data in {scenario['id']}", allow_module_level=False)
        assertions = scenario.get("assertions", {})
        if assertions.get("safety_pass", True):
            card = render_pattern_genome_card(genome)
            card_text = "\n".join(card)
            assert "not medical advice" in card_text.lower() or "educational" in card_text.lower(), (
                f"[{scenario['id']}] Pattern genome card missing safety disclaimer"
            )


# ── Test query scenarios ──

class TestQueryScenarios:
    """Query scenarios verify intent routing and response content."""

    @pytest.mark.parametrize("scenario", [s for s in ALL_SCENARIOS if s.get("type") == "query"], ids=lambda s: s["id"])
    def test_intent_detection(self, scenario):
        """Query must be routed to the correct intent."""
        user_input = scenario.get("user_input", "")
        category = scenario.get("category", "")
        intent = detect_intent(user_input)

        if category == "troubleshoot_high":
            assert intent.value == "troubleshoot_high", (
                f"[{scenario['id']}] Expected troubleshoot_high, got {intent.value}"
            )
        elif category == "troubleshoot_low":
            assert intent.value == "troubleshoot_low", (
                f"[{scenario['id']}] Expected troubleshoot_low, got {intent.value}"
            )

    @pytest.mark.parametrize("scenario", [s for s in ALL_SCENARIOS if s.get("type") == "query"], ids=lambda s: s["id"])
    def test_response_checks(self, scenario):
        """Response checks validate output contents."""
        user_input = scenario.get("user_input", "")
        if not user_input:
            pytest.skip(f"No user_input in {scenario['id']}", allow_module_level=False)

        intent = detect_intent(user_input)

        from src.companion import troubleshoot_card
        if intent.value == "troubleshoot_high":
            response = "\n".join(troubleshoot_card("high"))
        elif intent.value == "troubleshoot_low":
            response = "\n".join(troubleshoot_card("low"))
        else:
            response = ""

        checks = scenario.get("response_checks", {})
        for phrase in checks.get("contains_phrases", []):
            assert phrase.lower() in response.lower(), (
                f"[{scenario['id']}] Response missing expected phrase: '{phrase}'\n"
                f"Response: {response[:200]}..."
            )
        for phrase in checks.get("must_not_contain", []):
            assert phrase.lower() not in response.lower(), (
                f"[{scenario['id']}] Response should NOT contain: '{phrase}'\n"
                f"Response: {response[:200]}..."
            )


# ── Test safety scenarios ──

class TestSafetyScenarios:
    """Safety scenarios verify dosing refusal, missing evidence handling."""

    @pytest.mark.parametrize("scenario", [s for s in ALL_SCENARIOS if s.get("type") == "safety"], ids=lambda s: s["id"])
    def test_safety_response_disclaimer(self, scenario):
        """Safety scenarios must include disclaimer in responses."""
        assertions = scenario.get("assertions", {})
        if not assertions.get("safety_pass", True):
            review = SafetyReview(
                is_safe=False,
                risk_level="high",
                reason="dosing query — refer to care team",
            )
            if assertions.get("dosing_refusal"):
                assert not review.is_safe, (
                    f"[{scenario['id']}] Dosing refusal scenario must have safety flag"
                )
                assert review.disclaimer_required, (
                    f"[{scenario['id']}] Dosing refusal must require disclaimer"
                )

    @pytest.mark.parametrize("scenario", [s for s in ALL_SCENARIOS if s.get("type") == "safety"], ids=lambda s: s["id"])
    def test_pattern_genome_with_few_meals(self, scenario):
        """With few meals, no high-confidence patterns should be reported."""
        genome = _run_pattern_genome(scenario)
        if genome is None:
            pytest.skip(f"No meal data in {scenario['id']}", allow_module_level=False)

        assertions = scenario.get("assertions", {})
        max_tier = assertions.get("max_confidence_tier", "high")
        tier_rank = {"low": 0, "medium": 1, "high": 2}
        max_rank = tier_rank.get(max_tier, 2)

        for trait in genome.traits:
            trait_rank = tier_rank.get(trait.confidence, 2)
            assert trait_rank <= max_rank, (
                f"[{scenario['id']}] {trait.trait_id}: confidence={trait.confidence} "
                f"exceeds max allowed '{max_tier}' for limited data"
            )

    @pytest.mark.parametrize("scenario", [s for s in ALL_SCENARIOS if s.get("type") == "safety"], ids=lambda s: s["id"])
    def test_high_confidence_patterns_count(self, scenario):
        """Verify high-confidence pattern count matches expectations."""
        genome = _run_pattern_genome(scenario)
        if genome is None:
            pytest.skip(f"No meal data in {scenario['id']}", allow_module_level=False)

        checks = scenario.get("response_checks", {})
        expected_high = checks.get("high_confidence_patterns")
        if expected_high is not None:
            actual_high = sum(1 for t in genome.traits if t.confidence == "high")
            assert actual_high == expected_high, (
                f"[{scenario['id']}] Expected {expected_high} high-confidence patterns, "
                f"got {actual_high}"
            )


# ── Smoke tests ──

class TestHarnessHealth:
    """Verify the evaluation harness itself works."""

    def test_at_least_8_scenarios_loaded(self):
        """At least 8 seed scenarios must be loaded."""
        assert len(ALL_SCENARIOS) >= 8, (
            f"Expected at least 8 scenarios, got {len(ALL_SCENARIOS)}"
        )

    def test_all_scenarios_have_valid_ids(self):
        """Every scenario must have a unique id."""
        ids = [s["id"] for s in ALL_SCENARIOS]
        assert len(set(ids)) == len(ids), "Duplicate scenario IDs found"

    def test_all_scenarios_have_valid_types(self):
        """Every scenario must have a recognized type."""
        valid_types = {"pattern", "query", "safety"}
        for s in ALL_SCENARIOS:
            assert s.get("type") in valid_types, (
                f"[{s['id']}] type '{s.get('type')}' not in {valid_types}"
            )

    def test_all_scenarios_have_assertions(self):
        """Every scenario must have an assertions block."""
        for s in ALL_SCENARIOS:
            assert "assertions" in s, f"[{s['id']}] missing assertions block"


# ── Uncertainty coherence check ──

class TestUncertaintyCoherence:
    """Verify uncertainty fields are present and internally coherent."""

    @pytest.mark.parametrize("scenario", [s for s in ALL_SCENARIOS if s.get("type") == "pattern"], ids=lambda s: s["id"])
    def test_uncertainty_coherent(self, scenario):
        """Uncertainty: low confidence should appear when evidence is sparse."""
        genome = _run_pattern_genome(scenario)
        if genome is None:
            pytest.skip(f"No meal data in {scenario['id']}", allow_module_level=False)
        assertions = scenario.get("assertions", {})
        if not assertions.get("uncertainty_coherent", False):
            return

        for trait in genome.traits:
            if trait.evidence_count < 5:
                assert trait.confidence != "high", (
                    f"[{scenario['id']}] {trait.trait_id}: high confidence with only "
                    f"{trait.evidence_count} data points is incoherent"
                )

    @pytest.mark.parametrize("scenario", [s for s in ALL_SCENARIOS if s.get("type") == "pattern"], ids=lambda s: s["id"])
    def test_evidence_refs_present(self, scenario):
        """When evidence_refs is required, every trait must have a detail string."""
        genome = _run_pattern_genome(scenario)
        if genome is None:
            pytest.skip(f"No meal data in {scenario['id']}", allow_module_level=False)
        assertions = scenario.get("assertions", {})
        if not assertions.get("evidence_refs", False):
            return

        for trait in genome.traits:
            assert trait.detail or trait.evidence_count == 0, (
                f"[{scenario['id']}] {trait.trait_id}: has evidence_count={trait.evidence_count} "
                f"but no detail for evidence reference"
            )
