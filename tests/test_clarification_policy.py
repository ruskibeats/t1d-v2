"""Tests for Issue #39: Uncertainty-driven clarification policy."""

from __future__ import annotations

import pytest

from src.clarification_policy import (
    ClarificationPolicy,
    ClarificationThresholds,
    ClarificationDecision,
)
from app.food.service import FoodEvidence


class TestClarificationDecision:
    """Test ClarificationDecision dataclass."""

    def test_defaults(self):
        d = ClarificationDecision(should_ask=True)
        assert d.should_ask is True
        assert d.target_food == ""
        assert d.fallback is False

    def test_fallback_flag(self):
        d = ClarificationDecision(should_ask=True, fallback=True)
        assert d.fallback is True


class TestClarificationPolicyEvaluate:
    """Test ClarificationPolicy.evaluate()."""

    def setup_method(self):
        self.policy = ClarificationPolicy()

    def test_no_evidence_returns_no_trigger(self):
        decision = self.policy.evaluate([], {"carbs_g": 0})
        assert decision.should_ask is False

    def test_low_carbs_no_trigger(self):
        evidence = [FoodEvidence(
            parsed={"item": "pizza", "quantity": 1},
            selected_match=None,
            computed={"carbs_g": 10},
            confidence="low",
            carb_range_g=(5, 15),
            portion_uncertainty_pct=0.45,
        )]
        decision = self.policy.evaluate(evidence, {"carbs_g": 10})
        assert decision.should_ask is False
        assert "too low" in decision.reason.lower()

    def test_already_asked_no_trigger(self):
        evidence = [FoodEvidence(
            parsed={"item": "pizza", "quantity": 1},
            selected_match=None,
            computed={"carbs_g": 30},
            confidence="low",
            carb_range_g=(15, 45),
            portion_uncertainty_pct=0.45,
        )]
        decision = self.policy.evaluate(evidence, {"carbs_g": 50}, clarification_already_asked=True)
        assert decision.should_ask is False
        assert "Already asked" in decision.reason

    def test_high_uncertainty_pizza_triggers(self):
        evidence = [FoodEvidence(
            parsed={"item": "pizza", "quantity": 1, "unit": None},
            selected_match=None,
            computed={"carbs_g": 30},
            confidence="low",
            carb_range_g=(15, 45),
            portion_uncertainty_pct=0.45,
        )]
        decision = self.policy.evaluate(evidence, {"carbs_g": 50})
        assert decision.should_ask is True
        assert decision.target_food == "pizza"

    def test_specific_unit_no_trigger(self):
        evidence = [FoodEvidence(
            parsed={"item": "pizza", "quantity": 2, "unit": "slice"},
            selected_match=None,
            computed={"carbs_g": 60},
            confidence="low",
            carb_range_g=(30, 90),
            portion_uncertainty_pct=0.45,
        )]
        decision = self.policy.evaluate(evidence, {"carbs_g": 60})
        assert decision.should_ask is False  # specific unit = no trigger

    def test_low_portion_uncertainty_no_trigger(self):
        evidence = [FoodEvidence(
            parsed={"item": "pizza", "quantity": 1, "unit": None},
            selected_match=None,
            computed={"carbs_g": 30},
            confidence="high",
            carb_range_g=(25, 35),
            portion_uncertainty_pct=0.1,  # Low uncertainty
        )]
        decision = self.policy.evaluate(evidence, {"carbs_g": 30})
        assert decision.should_ask is False

    def test_expected_range_reduction_calculated(self):
        evidence = [FoodEvidence(
            parsed={"item": "pizza", "quantity": 1, "unit": None},
            selected_match=None,
            computed={"carbs_g": 30},
            confidence="low",
            carb_range_g=(15, 45),
            portion_uncertainty_pct=0.45,
        )]
        decision = self.policy.evaluate(evidence, {"carbs_g": 50, "carb_range_g": (25, 75)})
        assert decision.should_ask is True
        assert decision.expected_range_reduction_g > 0

    def test_at_most_one_trigger(self):
        """Even with multiple ambiguous foods, only one question is asked."""
        evidence = [
            FoodEvidence(
                parsed={"item": "pizza", "quantity": 1, "unit": None},
                selected_match=None,
                computed={"carbs_g": 30},
                confidence="low",
                carb_range_g=(15, 45),
                portion_uncertainty_pct=0.45,
            ),
            FoodEvidence(
                parsed={"item": "fries", "quantity": 1, "unit": None},
                selected_match=None,
                computed={"carbs_g": 20},
                confidence="low",
                carb_range_g=(10, 30),
                portion_uncertainty_pct=0.35,
            ),
        ]
        decision = self.policy.evaluate(evidence, {"carbs_g": 70})
        # Should trigger (meal has enough carbs) but target only one food
        if decision.should_ask:
            assert decision.target_food in ("pizza", "fries")


class TestClarificationPolicyWithFallback:
    """Test ClarificationPolicy.evaluate_with_fallback()."""

    def test_fallback_for_food_without_evidence(self):
        from app.food.service import ParsedFood

        evidence = []  # No evidence at all
        parsed_foods = [ParsedFood(item="pizza", quantity=1)]
        decision = ClarificationPolicy().evaluate_with_fallback(
            evidence, {"carbs_g": 50}, parsed_foods=parsed_foods
        )
        assert decision.should_ask is True
        assert decision.fallback is True
        assert decision.target_food == "pizza"

    def test_fallback_skips_food_with_evidence(self):
        from app.food.service import ParsedFood

        evidence = [FoodEvidence(
            parsed={"item": "pizza", "quantity": 2, "unit": "slice"},
            selected_match={"score": 0.9},
            computed={"carbs_g": 60},
            confidence="high",
            carb_range_g=(50, 70),
            portion_uncertainty_pct=0.1,
        )]
        parsed_foods = [ParsedFood(item="pizza", quantity=2, unit="slice")]
        decision = ClarificationPolicy().evaluate_with_fallback(
            evidence, {"carbs_g": 60}, parsed_foods=parsed_foods
        )
        # Pizza has evidence and low uncertainty — no trigger
        assert decision.should_ask is False

    def test_no_trigger_when_evidence_is_good(self):
        evidence = [FoodEvidence(
            parsed={"item": "pizza", "quantity": 2, "unit": "slice"},
            selected_match={"score": 0.95},
            computed={"carbs_g": 60},
            confidence="high",
            carb_range_g=(55, 65),
            portion_uncertainty_pct=0.1,
        )]
        decision = ClarificationPolicy().evaluate_with_fallback(
            evidence, {"carbs_g": 60}, parsed_foods=[]
        )
        assert decision.should_ask is False


class TestClarificationThresholds:
    """Test configurable thresholds."""

    def test_custom_thresholds(self):
        policy = ClarificationPolicy(thresholds=ClarificationThresholds(
            min_meal_carbs_g=50.0,
            min_portion_uncertainty=0.5,
        ))
        evidence = [FoodEvidence(
            parsed={"item": "pizza", "quantity": 1, "unit": None},
            selected_match=None,
            computed={"carbs_g": 40},  # Below 50g threshold
            confidence="low",
            carb_range_g=(20, 60),
            portion_uncertainty_pct=0.45,  # Below 0.5 threshold
        )]
        decision = policy.evaluate(evidence, {"carbs_g": 40})
        assert decision.should_ask is False

    def test_low_threshold_triggers_more_often(self):
        policy = ClarificationPolicy(thresholds=ClarificationThresholds(
            min_meal_carbs_g=10.0,
            min_carb_range_spread_g=5.0,
            min_portion_uncertainty=0.1,
        ))
        evidence = [FoodEvidence(
            parsed={"item": "pizza", "quantity": 1, "unit": None},
            selected_match=None,
            computed={"carbs_g": 20},
            confidence="medium",
            carb_range_g=(15, 25),
            portion_uncertainty_pct=0.15,
        )]
        decision = policy.evaluate(evidence, {"carbs_g": 20})
        assert decision.should_ask is True
