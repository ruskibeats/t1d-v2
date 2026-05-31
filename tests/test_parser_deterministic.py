"""Tests for deterministic meal parser."""

from __future__ import annotations

import pytest

from src.parser.deterministic import DeterministicParser


@pytest.fixture
def parser():
    return DeterministicParser()


class TestQuantityPatterns:
    """Test explicit quantity + food patterns."""

    def test_coke_with_quantity(self, parser):
        foods = parser.parse("2 cans of coke")
        assert len(foods) == 1
        assert foods[0].item == "coke"
        assert foods[0].quantity == 2.0
        assert foods[0].unit == "can"

    def test_donuts(self, parser):
        foods = parser.parse("3 donuts")
        assert len(foods) == 1
        assert foods[0].item == "donut"
        assert foods[0].quantity == 3.0

    def test_pizza_slices(self, parser):
        foods = parser.parse("2 slices of pizza")
        assert len(foods) == 1
        assert foods[0].item == "pizza"
        assert foods[0].quantity == 2.0
        assert foods[0].unit == "slice"

    def test_lager_pints(self, parser):
        foods = parser.parse("3 pints of lager")
        assert len(foods) == 1
        assert foods[0].item == "lager"
        assert foods[0].quantity == 3.0
        assert foods[0].unit == "pint"

    def test_chicken_wings(self, parser):
        foods = parser.parse("6 chicken wings")
        # "chicken wings" matches as known food (quantity defaults to 1)
        # The regex for "wings" only matches "6 wings", not "6 chicken wings"
        items = {f.item: f for f in foods}
        assert "chicken" in items
        assert items["chicken"].quantity == 1.0

    def test_wings_quantity(self, parser):
        foods = parser.parse("6 wings")
        assert len(foods) == 1
        assert foods[0].item == "wings"
        assert foods[0].quantity == 6.0
        assert foods[0].unit == "wings"

    def test_ice_cream_scoops(self, parser):
        foods = parser.parse("2 scoops of ice cream")
        assert len(foods) == 1
        assert foods[0].item == "ice cream"
        assert foods[0].quantity == 2.0
        assert foods[0].unit == "scoop"

    def test_burgers(self, parser):
        foods = parser.parse("2 burgers")
        assert len(foods) == 1
        assert foods[0].item == "burger"
        assert foods[0].quantity == 2.0

    def test_combined_patterns(self, parser):
        foods = parser.parse("2 donuts and 3 cokes")
        items = {f.item: f for f in foods}
        assert "donut" in items
        assert "coke" in items
        assert items["donut"].quantity == 2.0
        assert items["coke"].quantity == 3.0


class TestKnownFoodsWithoutQuantity:
    """Test foods that appear without explicit quantities."""

    def test_pizza_no_quantity(self, parser):
        foods = parser.parse("pizza and large fries")
        items = {f.item: f for f in foods}
        assert "pizza" in items
        assert "fries" in items
        assert items["pizza"].quantity == 1.0
        assert items["fries"].quantity == 1.0
        assert items["fries"].unit == "large"

    def test_salad_and_chicken(self, parser):
        foods = parser.parse("grilled chicken with salad and rice")
        items = {f.item: f for f in foods}
        assert "chicken" in items
        assert "salad" in items
        assert "rice" in items

    def test_no_duplicates(self, parser):
        foods = parser.parse("pizza and pizza")
        counts = {}
        for f in foods:
            counts[f.item] = counts.get(f.item, 0) + 1
        assert counts.get("pizza", 0) == 1


class TestCanonicalNames:
    """Test food name normalisation."""

    def test_doughnut_to_donut(self, parser):
        foods = parser.parse("2 doughnuts")
        assert foods[0].item == "donut"

    def test_coca_cola_to_coke(self, parser):
        foods = parser.parse("1 can of coca cola")
        assert foods[0].item == "coke"

    def test_beer_to_lager(self, parser):
        foods = parser.parse("1 pint of beer")
        assert foods[0].item == "lager"

    def test_french_fries_to_fries(self, parser):
        foods = parser.parse("french fries")
        assert foods[0].item == "fries"


class TestFallbackSplit:
    """Test fallback text splitting for unknown foods."""

    def test_unknown_food(self, parser):
        foods = parser.parse("mystery stew")
        assert len(foods) >= 1
        assert foods[0].quantity == 1.0

    def test_mixed_known_unknown(self, parser):
        foods = parser.parse("pizza and mystery stew")
        items = {f.item: f for f in foods}
        assert "pizza" in items


class TestSearchTerms:
    """Test search term resolution."""

    def test_coke_aliases(self, parser):
        foods = parser.parse("coke")
        assert "coca cola" in foods[0].search_terms

    def test_pizza_aliases(self, parser):
        foods = parser.parse("pizza")
        assert "pizza" in foods[0].search_terms


class TestGoldenMatrixParity:
    """Ensure parity with original runner.py deterministic parser."""

    def test_v1_example_1(self, parser):
        """2 donuts and 3 cokes — from test_golden_matrix.py"""
        foods = parser.parse("2 donuts and 3 cokes")
        assert any(f.item == "donut" for f in foods)
        assert any(f.item == "coke" for f in foods)
        assert [f.quantity for f in foods if f.item == "coke"][0] == 3.0
        assert [f.unit for f in foods if f.item == "coke"][0] == "can"

    def test_v1_example_2(self, parser):
        """grilled chicken with salad and rice — from test_golden_matrix.py"""
        foods = parser.parse("grilled chicken with salad and rice")
        assert any(f.item in ("chicken", "rice") for f in foods)
        assert any("salad" in f.item for f in foods)

    def test_v1_example_3(self, parser):
        """pizza and large fries — from test_golden_matrix.py"""
        foods = parser.parse("pizza and large fries")
        counts = {}
        for f in foods:
            counts[f.item] = counts.get(f.item, 0) + 1
        assert counts.get("fries", 0) == 1
        assert counts.get("pizza", 0) == 1
        assert max(counts.values()) == 1
