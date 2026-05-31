"""Tests for clarification loop detection and refinement."""

import pytest
from src.clarification_loop import (
    detect_ambiguity,
    clarification_card,
    apply_clarification,
    _is_specific_unit,
)


class TestAmbiguityDetection:
    """Test ambiguity detection for the 5 required cases."""
    
    def test_pizza_portion_ambiguous(self):
        """Pizza without size/crust specified triggers clarification."""
        question = detect_ambiguity("pizza", None)
        assert question is not None
        assert "pizza" in question.lower() or "crust" in question.lower() or "size" in question.lower()
    
    def test_pizza_with_slice_is_specific(self):
        """Pizza with explicit unit is specific enough."""
        question = detect_ambiguity("pizza", "slice")
        assert question is None
    
    def test_drink_ambiguity(self):
        """Drink without type specified triggers clarification."""
        question = detect_ambiguity("coke", None)
        assert question is not None
        assert "diet" in question.lower() or "regular" in question.lower()
    
    def test_fries_ambiguity(self):
        """Fries without size triggers clarification."""
        question = detect_ambiguity("fries", None)
        assert question is not None
        assert "size" in question.lower()
    
    def test_cereal_bowl_ambiguity(self):
        """Cereal without bowl size triggers clarification."""
        question = detect_ambiguity("cereal", None)
        assert question is not None
        assert "bowl" in question.lower() or "size" in question.lower()
    
    def test_dessert_ambiguity(self):
        """Dessert without portion triggers clarification."""
        question = detect_ambiguity("ice cream", None)
        assert question is not None
        assert "portion" in question.lower()
    
    def test_clear_food_no_ambiguity(self):
        """Clear food specification doesn't trigger clarification."""
        question = detect_ambiguity("grilled chicken breast", "g")
        assert question is None
    
    def test_specific_unit_not_ambiguous(self):
        """Food with specific unit (grams) is not ambiguous."""
        question = detect_ambiguity("pizza", "150g")
        assert question is None


class TestClarificationCard:
    """Test clarification card rendering."""
    
    def test_card_includes_food_and_question(self):
        """Card includes the food item and question."""
        card = clarification_card("What size?", "pizza")
        assert "pizza" in card
        assert "What size?" in card
        assert "Clarification Needed" in card


class TestApplyClarification:
    """Test applying clarification to refine estimates."""
    
    def test_pizza_large_adjustment(self):
        """Large pizza gets higher adjustment factor."""
        result = apply_clarification(
            "pizza",
            "large thick crust pizza",
            {"item": "pizza", "quantity": 1}
        )
        assert result["adjustment_factor"] == 1.5
    
    def test_pizza_small_adjustment(self):
        """Small pizza gets lower adjustment factor."""
        result = apply_clarification(
            "pizza",
            "small slice",
            {"item": "pizza", "quantity": 1}
        )
        assert result["adjustment_factor"] == 0.7
    
    def test_diet_drink_multiplier(self):
        """Diet drink gets reduced carb multiplier."""
        result = apply_clarification(
            "coke",
            "diet coke",
            {"item": "coke", "quantity": 1}
        )
        assert result["is_diet"] is True
        assert result["carb_multiplier"] == 0.3
    
    def test_regular_drink_multiplier(self):
        """Regular drink gets full carb multiplier."""
        result = apply_clarification(
            "pepsi",
            "regular pepsi",
            {"item": "pepsi", "quantity": 1}
        )
        assert result["is_diet"] is False
        assert result["carb_multiplier"] == 1.0
    
    def test_fries_large_adjustment(self):
        """Large fries get higher adjustment factor."""
        result = apply_clarification(
            "fries",
            "large fries",
            {"item": "fries", "quantity": 1}
        )
        assert result["adjustment_factor"] == 1.5


class TestSpecificUnits:
    """Test unit specificity detection."""
    
    def test_generic_units_are_ambiguous(self):
        """Generic units still need clarification."""
        assert _is_specific_unit("") is False
        assert _is_specific_unit("serving") is False
        assert _is_specific_unit("portion") is False
    
    def test_specific_units_are_clear(self):
        """Specific units provide enough info."""
        assert _is_specific_unit("slice") is True
        assert _is_specific_unit("g") is True
        assert _is_specific_unit("grams") is True
        assert _is_specific_unit("ml") is True


class TestClarificationEndToEnd:
    """End-to-end tests for the clarification pipeline integration."""

    def test_ambiguous_pizza_triggers_clarification(self):
        """Pizza without specific unit triggers clarification when evidence is uncertain."""
        from app.food.service import FoodEvidence, ParsedFood
        from src.pipeline.companion_pipeline import _check_clarification_needed

        foods = [ParsedFood(item="pizza", quantity=1, unit=None)]
        evidence = [FoodEvidence(
            parsed={"item": "pizza", "quantity": 1, "unit": None},
            selected_match=None,
            computed={"carbs_g": 30, "fat_g": 10, "sugars_g": 3, "protein_g": 8, "kcal": 220},
            confidence="low",
            warnings=["Food match is uncertain", "Portion size estimated — check actual serving"],
            carb_range_g=(15.0, 45.0),
            identity_confidence="low",
            portion_uncertainty_pct=0.45,
            nutrition_variance_pct=0.2,
            top_uncertainty_reason="portion of pizza unclear",
        )]
        meal = {"evidence_items": [], "totals": {"carbs_g": 30}}

        result = _check_clarification_needed(foods, evidence, meal)
        assert result is not None
        assert result["food_item"] == "pizza"
        assert "pizza" in result["question"].lower()

    def test_clear_pizza_no_clarification(self):
        """Pizza with explicit slice unit does not trigger clarification."""
        from app.food.service import FoodEvidence, ParsedFood
        from src.pipeline.companion_pipeline import _check_clarification_needed

        foods = [ParsedFood(item="pizza", quantity=2, unit="slice")]
        evidence = [FoodEvidence(
            parsed={"item": "pizza", "quantity": 2, "unit": "slice"},
            selected_match={"match_score": 0.95},
            computed={"carbs_g": 60, "fat_g": 20, "sugars_g": 6, "protein_g": 16, "kcal": 440},
            confidence="high",
            warnings=[],
            carb_range_g=(54.0, 66.0),
            identity_confidence="high",
            portion_uncertainty_pct=0.1,
            nutrition_variance_pct=0.05,
            top_uncertainty_reason="",
        )]
        meal = {"evidence_items": [], "totals": {"carbs_g": 60}}

        result = _check_clarification_needed(foods, evidence, meal)
        assert result is None

    def test_high_portion_uncertainty_triggers_clarification(self):
        """Fries with high portion uncertainty triggers clarification."""
        from app.food.service import FoodEvidence, ParsedFood
        from src.pipeline.companion_pipeline import _check_clarification_needed

        foods = [ParsedFood(item="fries", quantity=1, unit=None)]
        evidence = [FoodEvidence(
            parsed={"item": "fries", "quantity": 1, "unit": None},
            selected_match=None,
            computed={"carbs_g": 40, "fat_g": 18, "sugars_g": 0, "protein_g": 4, "kcal": 340},
            confidence="medium",
            warnings=["Portion size estimated — check actual serving"],
            carb_range_g=(20.0, 60.0),
            identity_confidence="medium",
            portion_uncertainty_pct=0.35,
            nutrition_variance_pct=0.15,
            top_uncertainty_reason="portion of fries unclear",
        )]
        meal = {"evidence_items": [], "totals": {"carbs_g": 40}}

        result = _check_clarification_needed(foods, evidence, meal)
        assert result is not None
        assert result["food_item"] == "fries"
        assert "size" in result["question"].lower()