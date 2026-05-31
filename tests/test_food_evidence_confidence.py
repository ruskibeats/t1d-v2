from __future__ import annotations

from app.food.service import (
    FoodEvidence,
    ParsedFood,
    calculate_food_evidence,
    combine_food_evidence,
    confidence_tier,
)


def _candidate(name="pizza", *, score=0.95, carbs=30, serving=100):
    return {
        "name": name,
        "serving_g": serving,
        "carbs_per_100g": carbs,
        "fat_per_100g": 10,
        "sugars_per_100g": 4,
        "protein_per_100g": 12,
        "kcal_per_100g": 260,
        "aliases": (),
        "match_score": score,
        "estimated_serving_g": serving,
    }


def test_no_match_populates_all_confidence_fields_and_flags():
    ev = calculate_food_evidence(ParsedFood("mystery food", unit=None), [])

    assert ev.confidence == "low"
    assert ev.identity_confidence == "low"
    assert ev.portion_uncertainty_pct > 0
    assert ev.nutrition_variance_pct > 0
    assert ev.top_uncertainty_reason
    assert ev.top_uncertainty_reason != "none"
    assert "missing_unit" in ev.missing_information_flags
    assert "no_db_match" in ev.missing_information_flags
    assert "portion_estimated" in ev.missing_information_flags
    assert ev.parsed["unit"] == "unspecified"


def test_confidence_tier_uses_weighted_decomposition():
    high = FoodEvidence(
        parsed={}, selected_match={"name": "pizza"}, computed={"carbs_g": 30},
        confidence="high", identity_confidence="high",
        portion_uncertainty_pct=0.05, nutrition_variance_pct=0.05,
    )
    medium = FoodEvidence(
        parsed={}, selected_match={"name": "pizza"}, computed={"carbs_g": 30},
        confidence="high", identity_confidence="high",
        portion_uncertainty_pct=0.45, nutrition_variance_pct=0.45,
    )
    low = FoodEvidence(
        parsed={}, selected_match=None, computed=None,
        confidence="high", identity_confidence="high",
        portion_uncertainty_pct=0.0, nutrition_variance_pct=0.0,
    )

    assert confidence_tier(high) == "high"
    assert confidence_tier(medium) == "medium"
    assert confidence_tier(low) == "low"


def test_calculate_food_evidence_adds_low_similarity_and_variance_flags():
    ev = calculate_food_evidence(
        ParsedFood("pizza", unit="slice"),
        [
            _candidate("pizza snack", score=0.55, carbs=20),
            _candidate("pizza pie", score=0.54, carbs=80),
            _candidate("pizza meal", score=0.52, carbs=10),
        ],
    )

    assert ev.identity_confidence == "low"
    assert ev.confidence == "low"
    assert "low_similarity" in ev.missing_information_flags
    assert "high_nutrition_variance" in ev.missing_information_flags
    assert ev.top_uncertainty_reason != "none"


def test_calculate_food_evidence_downgrades_generic_portion():
    ev = calculate_food_evidence(ParsedFood("pizza", unit="portion"), [_candidate(score=0.95)])

    assert ev.identity_confidence == "high"
    assert ev.confidence == "medium"
    assert "generic_unit" in ev.missing_information_flags
    assert "portion_estimated" in ev.missing_information_flags
    assert ev.top_uncertainty_reason == "portion of pizza unclear"


def test_combine_food_evidence_uses_worst_tier_and_merges_flags():
    high = calculate_food_evidence(ParsedFood("pizza", unit="slice"), [_candidate(score=0.95)])
    low = calculate_food_evidence(ParsedFood("unknown", unit=None), [])

    meal = combine_food_evidence([high, low])

    assert meal["confidence_overall"] == "low"
    assert "missing_unit" in meal["missing_information_flags"]
    assert "no_db_match" in meal["missing_information_flags"]
    assert "missing_information_flags" in meal["evidence_items"][0]
