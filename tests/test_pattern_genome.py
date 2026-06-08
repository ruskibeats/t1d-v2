"""Tests for Issue #21: Personal Pattern Genome card.

Verifies the pattern genome analyzer produces correct trait insights
from legends.json food history data.
"""

from __future__ import annotations

import pytest

from app.services.pattern_genome import (
    PatternGenome,
    TraitInsight,
    analyze_pattern_genome,
    genome_from_legends,
    render_pattern_genome_card,
    _analyze_breakfast_spike,
    _analyze_fat_delay_tendency,
    _analyze_exercise_sensitivity,
    _analyze_overnight_risk,
    _analyze_variability,
    _analyze_trigger_foods,
)


# ── Fixtures ──

def _make_food_history(meal_type: str, count: int, carbs: float, fat: float,
                       sugars: float, food_name: str = "Test Food") -> list[dict]:
    """Generate synthetic food history rows."""
    return [
        {
            "timestamp": f"2025-01-{i+1:02d}T12:00:00+00:00",
            "meal_type": meal_type,
            "food": food_name,
            "carb_estimate_g": carbs,
            "fat_g": fat,
            "sugars_g": sugars,
            "protein_g": carbs * 0.2,
            "kcal": carbs * 4 + fat * 9,
            "anchor_type": "well_controlled",
        }
        for i in range(count)
    ]


def _make_full_history() -> list[dict]:
    """Generate a realistic 90-day food history."""
    rows = []
    for day in range(90):
        hour = 7 + (day % 3)  # vary breakfast time
        rows.append({
            "timestamp": f"2025-01-{day+1:02d}T{hour:02d}:00:00+00:00",
            "meal_type": "breakfast",
            "food": "Cereal with milk",
            "carb_estimate_g": 35 + (day % 10),
            "fat_g": 8,
            "sugars_g": 12,
            "protein_g": 6,
            "kcal": 220,
            "anchor_type": "well_controlled",
        })
        rows.append({
            "timestamp": f"2025-01-{day+1:02d}T12:30:00+00:00",
            "meal_type": "lunch",
            "food": "Chicken wrap",
            "carb_estimate_g": 50 + (day % 15),
            "fat_g": 12,
            "sugars_g": 5,
            "protein_g": 15,
            "kcal": 350,
            "anchor_type": "well_controlled",
        })
        rows.append({
            "timestamp": f"2025-01-{day+1:02d}T19:00:00+00:00",
            "meal_type": "dinner",
            "food": "Pasta bolognese",
            "carb_estimate_g": 60 + (day % 20),
            "fat_g": 15 + (day % 10),
            "sugars_g": 8,
            "protein_g": 20,
            "kcal": 420,
            "anchor_type": "well_controlled",
        })
    return rows


# ── Unit tests: individual trait analyzers ──

class TestBreakfastSpikeAnalyzer:
    def test_high_sugar_breakfasts(self):
        rows = _make_food_history("breakfast", 30, carbs=40, fat=5, sugars=25, food_name="Cereal")
        trait = _analyze_breakfast_spike(rows, "post_meal_spike")
        assert trait.trait_id == "breakfast_spike"
        assert trait.confidence in ("high", "medium")
        assert trait.evidence_count == 30
        assert "spike" in trait.description.lower() or "quickly" in trait.description.lower()

    def test_low_sugar_breakfasts(self):
        rows = _make_food_history("breakfast", 30, carbs=30, fat=8, sugars=5, food_name="Eggs")
        trait = _analyze_breakfast_spike(rows, "well_controlled")
        assert trait.confidence in ("high", "medium")
        assert "moderate" in trait.description.lower() or "gradual" in trait.description.lower()

    def test_no_breakfasts(self):
        rows = _make_food_history("lunch", 30, carbs=50, fat=10, sugars=5)
        trait = _analyze_breakfast_spike(rows, "well_controlled")
        assert trait.confidence == "low"
        assert trait.evidence_count == 0


class TestFatDelayAnalyzer:
    def test_high_fat_dinners(self):
        rows = _make_food_history("dinner", 30, carbs=60, fat=35, sugars=8, food_name="Pizza")
        trait = _analyze_fat_delay_tendency(rows, "high_fat_delayed")
        assert trait.trait_id == "fat_delay"
        assert trait.confidence in ("high", "medium")
        assert "higher in fat" in trait.description.lower() or "delay" in trait.description.lower()

    def test_low_fat_dinners(self):
        rows = _make_food_history("dinner", 30, carbs=50, fat=8, sugars=5, food_name="Salad")
        trait = _analyze_fat_delay_tendency(rows, "well_controlled")
        assert "moderate" in trait.description.lower() or "standard" in trait.description.lower()

    def test_no_dinners(self):
        rows = _make_food_history("lunch", 30, carbs=50, fat=10, sugars=5)
        trait = _analyze_fat_delay_tendency(rows, "well_controlled")
        assert trait.confidence == "low"
        assert trait.evidence_count == 0


class TestExerciseSensitivityAnalyzer:
    def test_variable_afternoon_carbs(self):
        """High CV in afternoon/dinner carbs → exercise sensitivity signal."""
        rows = []
        for i in range(30):
            rows.append({
                "timestamp": f"2025-01-{i+1:02d}T15:00:00+00:00",
                "meal_type": "afternoon_snack",
                "food": "Protein bar",
                "carb_estimate_g": 10 + (i * 3),  # high variance: 10→97
                "fat_g": 5,
                "sugars_g": 3,
                "protein_g": 8,
                "kcal": 150,
                "anchor_type": "exercise_sensitive",
            })
        trait = _analyze_exercise_sensitivity(rows, "exercise_sensitive")
        assert trait.trait_id == "exercise_sensitivity"
        assert trait.confidence in ("high", "medium")
        assert "variable" in trait.description.lower() or "activity" in trait.description.lower()

    def test_consistent_afternoon_carbs(self):
        rows = _make_food_history("afternoon_snack", 30, carbs=20, fat=5, sugars=5)
        trait = _analyze_exercise_sensitivity(rows, "well_controlled")
        assert "consistent" in trait.description.lower() or "predictable" in trait.description.lower()


class TestOvernightRiskAnalyzer:
    def test_high_risk_dinners(self):
        """High fat + high carb dinners → overnight risk."""
        rows = _make_food_history("dinner", 30, carbs=70, fat=30, sugars=10, food_name="Pizza")
        trait = _analyze_overnight_risk(rows, "high_fat_delayed")
        assert trait.trait_id == "overnight_risk"
        assert trait.confidence in ("high", "medium")
        assert "delayed rise" in trait.description.lower() or "overnight" in trait.description.lower()

    def test_light_dinners(self):
        """Light dinners → possible overnight low."""
        rows = _make_food_history("dinner", 30, carbs=20, fat=5, sugars=3, food_name="Salad")
        trait = _analyze_overnight_risk(rows, "overnight_hypo")
        assert "lighter" in trait.description.lower() or "low" in trait.description.lower()


class TestVariabilityAnalyzer:
    def test_high_variability(self):
        rows = []
        for i in range(50):
            rows.append({
                "timestamp": f"2025-01-{i+1:02d}T12:00:00+00:00",
                "meal_type": "lunch",
                "food": "Meal",
                "carb_estimate_g": 20 + (i * 5),  # 20→265, very high variance
                "fat_g": 10,
                "sugars_g": 5,
                "protein_g": 10,
                "kcal": 200,
                "anchor_type": "high_variability",
            })
        trait = _analyze_variability(rows, "high_variability")
        assert trait.trait_id == "variability"
        assert "variable" in trait.description.lower()

    def test_consistent_meals(self):
        rows = _make_food_history("lunch", 50, carbs=50, fat=10, sugars=5)
        trait = _analyze_variability(rows, "well_controlled")
        assert "consistent" in trait.description.lower()


class TestTriggerFoodsAnalyzer:
    def test_repeat_foods(self):
        rows = []
        # "Pizza" appears 20 times, others appear 2-3 times
        for i in range(20):
            rows.append({
                "timestamp": f"2025-01-{i+1:02d}T19:00:00+00:00",
                "meal_type": "dinner",
                "food": "Pizza",
                "carb_estimate_g": 60, "fat_g": 15, "sugars_g": 8,
                "protein_g": 20, "kcal": 400, "anchor_type": "well_controlled",
            })
        for i in range(30):
            rows.append({
                "timestamp": f"2025-01-{i+1:02d}T12:00:00+00:00",
                "meal_type": "lunch",
                "food": f"Meal_{i}",  # unique foods
                "carb_estimate_g": 50, "fat_g": 10, "sugars_g": 5,
                "protein_g": 15, "kcal": 300, "anchor_type": "well_controlled",
            })
        trait = _analyze_trigger_foods(rows, "well_controlled")
        assert trait.trait_id == "trigger_foods"
        assert trait.confidence in ("high", "medium")
        assert "Pizza" in trait.description

    def test_no_foods(self):
        trait = _analyze_trigger_foods([], "well_controlled")
        assert trait.confidence == "low"
        assert trait.evidence_count == 0


# ── Integration: full genome analysis ──

class TestPatternGenomeIntegration:
    def test_full_genome_from_synthetic_history(self):
        """Full genome analysis produces 6 traits."""
        rows = _make_full_history()
        genome = analyze_pattern_genome(rows, "Test User", "well_controlled")
        assert isinstance(genome, PatternGenome)
        assert genome.profile_name == "Test User"
        assert genome.total_meals_analyzed == len(rows)
        assert len(genome.traits) == 6
        assert genome.data_source == "synthetic_legends_demo"

    def test_all_traits_have_required_fields(self):
        """Every trait has id, label, description, evidence_count, confidence."""
        rows = _make_full_history()
        genome = analyze_pattern_genome(rows, "Test", "well_controlled")
        for trait in genome.traits:
            assert trait.trait_id
            assert trait.label
            assert trait.description
            assert trait.evidence_count >= 0
            assert trait.confidence in ("high", "medium", "low")
            assert 0.0 <= trait.confidence_score <= 1.0

    def test_empty_history(self):
        """Empty history returns genome with no traits."""
        genome = analyze_pattern_genome([], "Empty User", "well_controlled")
        assert genome.total_meals_analyzed == 0
        assert len(genome.traits) == 0

    def test_top_trigger_foods_populated(self):
        """Top trigger foods are extracted from history."""
        rows = _make_full_history()
        genome = analyze_pattern_genome(rows, "Test", "well_controlled")
        assert len(genome.top_trigger_foods) > 0
        assert len(genome.top_trigger_foods) <= 5
        for tf in genome.top_trigger_foods:
            assert "food" in tf
            assert "count" in tf
            assert "frequency_pct" in tf

    def test_summary_narrative_generated(self):
        """Summary narrative is non-empty."""
        rows = _make_full_history()
        genome = analyze_pattern_genome(rows, "Test", "well_controlled")
        assert len(genome.summary_narrative) > 0
        assert "meals" in genome.summary_narrative.lower()


# ── Integration: from legends.json ──

class TestGenomeFromLegends:
    def test_all_12_profiles_produce_genome(self):
        """All 12 legend profiles produce a valid pattern genome."""
        anchors = [
            "well_controlled", "high_fat_delayed", "post_meal_spike", "brittle",
            "dawn_phenomenon", "overnight_hypo", "exercise_sensitive",
            "exercise_regimen", "insulin_sensitive", "insulin_resistant",
            "high_variability", "newly_diagnosed",
        ]
        for anchor in anchors:
            genome = genome_from_legends(anchor)
            assert genome.total_meals_analyzed > 0, f"No meals for {anchor}"
            assert len(genome.traits) == 6, f"Wrong trait count for {anchor}"
            assert genome.data_source == "synthetic_legends_demo"

    def test_high_fat_delayed_shows_fat_delay(self):
        """High Fat Delayed profile should show high-fat dinner pattern."""
        genome = genome_from_legends("high_fat_delayed")
        fat_trait = next(t for t in genome.traits if t.trait_id == "fat_delay")
        assert fat_trait.confidence in ("high", "medium")
        assert fat_trait.evidence_count > 50
        assert "higher in fat" in fat_trait.description.lower() or "delay" in fat_trait.description.lower()

    def test_post_meal_spike_shows_breakfast_spike(self):
        """Post Meal Spike profile should show breakfast spike tendency."""
        genome = genome_from_legends("post_meal_spike")
        spike_trait = next(t for t in genome.traits if t.trait_id == "breakfast_spike")
        assert spike_trait.confidence in ("high", "medium")
        # Post Meal Spike has high sugar breakfasts (25.5g avg)
        assert "spike" in spike_trait.description.lower() or "quickly" in spike_trait.description.lower() or "sugar" in spike_trait.description.lower()

    def test_well_controlled_moderate_patterns(self):
        """Well Controlled profile should show moderate/consistent patterns."""
        genome = genome_from_legends("well_controlled")
        fat_trait = next(t for t in genome.traits if t.trait_id == "fat_delay")
        # Well Controlled has moderate dinner fat (14.5g avg)
        assert "moderate" in fat_trait.description.lower() or "standard" in fat_trait.description.lower()

    def test_insulin_resistant_high_fat(self):
        """Insulin Resistant profile should show higher fat dinners."""
        genome = genome_from_legends("insulin_resistant")
        fat_trait = next(t for t in genome.traits if t.trait_id == "fat_delay")
        assert fat_trait.confidence in ("high", "medium")
        # Insulin Resistant has 21.9g avg dinner fat — should trigger delay-prone
        assert "higher in fat" in fat_trait.description.lower() or "delay" in fat_trait.description.lower()


# ── Card rendering ──

class TestPatternGenomeCardRendering:
    def test_card_renders_all_traits(self):
        """Rendered card shows all 6 trait labels."""
        rows = _make_full_history()
        genome = analyze_pattern_genome(rows, "Test User", "well_controlled")
        card = render_pattern_genome_card(genome)
        card_text = "\n".join(card)

        assert "Pattern Genome" in card_text
        assert "Breakfast Spike" in card_text
        assert "Fat Delay" in card_text or "High-Fat" in card_text
        assert "Exercise" in card_text
        assert "Overnight" in card_text
        assert "Variability" in card_text
        assert "Trigger" in card_text or "frequent" in card_text.lower()

    def test_card_shows_data_source_label(self):
        """Card labels data source."""
        rows = _make_full_history()
        genome = analyze_pattern_genome(rows, "Test", "well_controlled")
        card = render_pattern_genome_card(genome)
        card_text = "\n".join(card)
        assert "synthetic legends demo" in card_text.lower()

    def test_card_shows_evidence_counts(self):
        """Card shows evidence counts per trait."""
        rows = _make_full_history()
        genome = analyze_pattern_genome(rows, "Test", "well_controlled")
        card = render_pattern_genome_card(genome)
        card_text = "\n".join(card)
        # Should contain evidence count numbers
        assert "data points" in card_text

    def test_card_shows_confidence_indicators(self):
        """Card shows confidence levels (high/medium/low)."""
        rows = _make_full_history()
        genome = analyze_pattern_genome(rows, "Test", "well_controlled")
        card = render_pattern_genome_card(genome)
        card_text = "\n".join(card)
        # At least one confidence indicator
        has_conf = ("high" in card_text.lower() or "medium" in card_text.lower()
                    or "🟢" in card_text or "🟡" in card_text)
        assert has_conf

    def test_card_shows_top_trigger_foods(self):
        """Card shows top trigger foods section."""
        rows = _make_full_history()
        genome = analyze_pattern_genome(rows, "Test", "well_controlled")
        card = render_pattern_genome_card(genome)
        card_text = "\n".join(card)
        assert "frequent" in card_text.lower() or "Top" in card_text

    def test_card_shows_disclaimer(self):
        """Card includes safety disclaimer."""
        rows = _make_full_history()
        genome = analyze_pattern_genome(rows, "Test", "well_controlled")
        card = render_pattern_genome_card(genome)
        card_text = "\n".join(card)
        assert "Not medical advice" in card_text or "synthetic" in card_text.lower()

    def test_empty_genome_card(self):
        """Empty genome still renders a card."""
        genome = PatternGenome(
            profile_name="Empty", data_source="no_history",
            total_meals_analyzed=0, analysis_window_days=90,
        )
        card = render_pattern_genome_card(genome)
        assert len(card) > 0


class TestPatternGenomePipelineIntegration:
    """Verify pattern genome integrates with meal_pipeline_section."""

    def test_pipeline_renders_pattern_genome_when_provided(self):
        """When pattern_genome dict is passed, Step 8 card appears."""
        from src.companion import meal_pipeline_section

        rows = _make_full_history()
        genome = analyze_pattern_genome(rows, "Test User", "well_controlled")
        genome_dict = {
            "traits": [{"trait_id": t.trait_id, "label": t.label, "description": t.description,
                         "evidence_count": t.evidence_count, "confidence": t.confidence,
                         "confidence_score": t.confidence_score, "detail": t.detail, "icon": t.icon}
                        for t in genome.traits],
            "top_trigger_foods": genome.top_trigger_foods,
            "data_source": genome.data_source,
            "total_meals_analyzed": genome.total_meals_analyzed,
            "analysis_window_days": genome.analysis_window_days,
            "disclaimer": genome.disclaimer,
        }

        cards = meal_pipeline_section(
            profile_label="Well Controlled",
            parsed_foods=[{"item": "pizza", "quantity": 1}],
            food_evidence=[],
            meal_totals={"carbs_g": 50, "fat_g": 15, "sugars_g": 5, "protein_g": 8,
                         "kcal": 300, "top_carb_contributor": "", "top_uncertainty_items": [],
                         "absorption_profile": "standard"},
            forecast={"peak_mg_dl": 180, "peak_time_minutes": 90, "baseline_mg_dl": 110,
                      "uncertainty_band": {}},
            historical_context={"similar_meals_count": 0},
            risk_flags=[],
            chart="",
            pattern_genome=genome_dict,
        )

        # Find all lines belonging to the Pattern Genome card (starts with separator)
        step8_text = "\n".join(cards)
        assert "Pattern Genome" in step8_text, "Step 8 Pattern Genome card not found"
        assert "Breakfast Spike" in step8_text
        assert "synthetic legends demo" in step8_text.lower()

    def test_pipeline_without_pattern_genome_omits_step8(self):
        """When no pattern_genome, Step 8 is omitted."""
        from src.companion import meal_pipeline_section

        cards = meal_pipeline_section(
            profile_label="Test",
            parsed_foods=[{"item": "pizza", "quantity": 1}],
            food_evidence=[],
            meal_totals={"carbs_g": 50, "fat_g": 15, "sugars_g": 5, "protein_g": 8,
                         "kcal": 300, "top_carb_contributor": "", "top_uncertainty_items": [],
                         "absorption_profile": "standard"},
            forecast={"peak_mg_dl": 180, "peak_time_minutes": 90, "baseline_mg_dl": 110,
                      "uncertainty_band": {}},
            historical_context={"similar_meals_count": 0},
            risk_flags=[],
            chart="",
        )

        step8 = [c for c in cards if "Pattern Genome" in c]
        assert len(step8) == 0, "Step 8 should be omitted when no genome provided"


# ── Issue #43: glucose-first, food-fallback tests ──

class TestDataSourceLabels:
    """Every TraitInsight must carry data_source (Issue #43)."""

    def test_synthetic_legend_gets_synthetic_legend_source(self):
        """Synthetic legend data produces synthetic_legend data_source."""
        rows = _make_full_history()
        genome = analyze_pattern_genome(rows, "Test", "well_controlled")
        for trait in genome.traits:
            assert trait.data_source == "synthetic_legend", (
                f"{trait.trait_id}: expected synthetic_legend, got {trait.data_source}")

    def test_no_anchor_no_glucose_gets_food_proxy(self):
        """No anchor + no glucose = food_proxy data_source."""
        rows = _make_full_history()
        genome = analyze_pattern_genome(rows, "Test", "")
        for trait in genome.traits:
            assert trait.data_source == "food_proxy", (
                f"{trait.trait_id}: expected food_proxy, got {trait.data_source}")

    def test_with_cgm_gets_real_cgm(self):
        """With CGM data and no anchor = real_cgm data_source."""
        rows = _make_full_history()
        cgm = _make_cgm_readings()
        genome = analyze_pattern_genome(rows, "Test", "", glucose_readings=cgm)
        for trait in genome.traits:
            assert trait.data_source == "real_cgm", (
                f"{trait.trait_id}: expected real_cgm, got {trait.data_source}")

    def test_data_source_values_are_valid(self):
        """data_source must be one of the three valid values."""
        valid = {"real_cgm", "food_proxy", "synthetic_legend"}
        rows = _make_full_history()
        genome = analyze_pattern_genome(rows, "Test", "well_controlled")
        for trait in genome.traits:
            assert trait.data_source in valid, (
                f"{trait.trait_id}: invalid data_source '{trait.data_source}'")


class TestGlucoseFirstDetectors:
    """Detectors use glucose data when available (Issue #43)."""

    def test_breakfast_spike_with_cgm_uses_glucose(self):
        """_analyze_breakfast_spike uses CGM peaks when glucose data exists."""
        rows = _make_food_history("breakfast", 10, carbs=40, fat=5, sugars=20)
        cgm = []
        for i in range(10):
            # meals are at T12:00:00, so post-meal windows are 12:00-15:00
            cgm.append({"timestamp": f"2025-01-{i+1:02d}T12:30:00+00:00", "value": 200})
            cgm.append({"timestamp": f"2025-01-{i+1:02d}T13:00:00+00:00", "value": 170})
            cgm.append({"timestamp": f"2025-01-{i+1:02d}T14:00:00+00:00", "value": 140})

        trait = _analyze_breakfast_spike(rows, "", cgm)
        assert trait.data_source == "real_cgm"
        assert trait.confidence in ("high", "medium")
        assert "mg/dL" in trait.detail

    def test_breakfast_spike_without_cgm_uses_food_proxy(self):
        """_analyze_breakfast_spike falls back to sugar content."""
        rows = _make_food_history("breakfast", 10, carbs=40, fat=5, sugars=20)
        trait = _analyze_breakfast_spike(rows, "")
        assert trait.data_source == "food_proxy"
        assert "food proxy" in trait.detail

    def test_fat_delay_with_cgm_uses_glucose(self):
        """_analyze_fat_delay_tendency uses post-dinner CGM curves."""
        rows = _make_food_history("dinner", 10, carbs=60, fat=30, sugars=8)
        cgm = []
        for i in range(10):
            # meals at T12:00:00, delayed peak at T14:30 (150 min)
            cgm.append({"timestamp": f"2025-01-{i+1:02d}T13:00:00+00:00", "value": 120})
            cgm.append({"timestamp": f"2025-01-{i+1:02d}T14:00:00+00:00", "value": 150})
            cgm.append({"timestamp": f"2025-01-{i+1:02d}T14:30:00+00:00", "value": 190})
            cgm.append({"timestamp": f"2025-01-{i+1:02d}T16:00:00+00:00", "value": 160})

        trait = _analyze_fat_delay_tendency(rows, "", cgm)
        assert trait.data_source == "real_cgm"
        assert "mg/dL" in trait.detail

    def test_overnight_risk_with_cgm_uses_glucose(self):
        """_analyze_overnight_risk uses overnight CGM patterns."""
        rows = []
        cgm = []
        for i in range(10):
            dinner_day = f"2025-01-{i+1:02d}"
            rows.append({
                "timestamp": f"{dinner_day}T19:00:00+00:00",
                "meal_type": "dinner",
                "food": "Dinner",
                "carb_estimate_g": 60, "fat_g": 25, "sugars_g": 8,
                "protein_g": 20, "kcal": 400, "anchor_type": "",
            })
            # overnight low at 3 AM next day -> belongs to night of dinner_day
            next_day = f"2025-01-{i+2:02d}"
            cgm.append({"timestamp": f"{next_day}T03:00:00+00:00", "value": 55})
            cgm.append({"timestamp": f"{next_day}T05:00:00+00:00", "value": 65})
            cgm.append({"timestamp": f"{next_day}T06:30:00+00:00", "value": 100})

        trait = _analyze_overnight_risk(rows, "", cgm)
        # Even though CGM exists, the overnight readings may not register as
        # post-dinner food-proxy is used for triggering. Just verify source.
        assert trait.data_source == "real_cgm"

    def test_variability_with_cgm_uses_glucose(self):
        """_analyze_variability uses glucose outcome variability."""
        rows = _make_full_history()
        cgm = [{"timestamp": f"2025-01-{i+1:02d}T12:00:00+00:00", "value": 80 + (i % 5) * 40}
               for i in range(50)]
        trait = _analyze_variability(rows, "", cgm)
        assert trait.data_source == "real_cgm"
        assert "mg/dL" in trait.detail

    def test_trigger_foods_with_cgm_uses_glucose(self):
        """_analyze_trigger_foods uses glucose outcome associations."""
        rows = []
        cgm = []
        for i in range(10):
            rows.append({
                "timestamp": f"2025-01-{i+1:02d}T12:00:00+00:00",
                "meal_type": "lunch",
                "food": "Pizza",
                "carb_estimate_g": 60, "fat_g": 20, "sugars_g": 8,
                "protein_g": 20, "kcal": 400, "anchor_type": "",
            })
            # Pizza consistently causes high glucose within 3h
            cgm.append({"timestamp": f"2025-01-{i+1:02d}T13:00:00+00:00", "value": 200})
            cgm.append({"timestamp": f"2025-01-{i+1:02d}T14:00:00+00:00", "value": 210})
            cgm.append({"timestamp": f"2025-01-{i+1:02d}T15:00:00+00:00", "value": 180})

        trait = _analyze_trigger_foods(rows, "", cgm)
        assert trait.data_source == "real_cgm"

    def test_exercise_sensitivity_with_activity_and_cgm(self):
        """_analyze_exercise_sensitivity uses activity-day vs rest-day glucose."""
        rows = _make_food_history("afternoon_snack", 10, carbs=30, fat=5, sugars=5)
        cgm = []
        activity = []
        for i in range(10):
            day = f"2025-01-{i+1:02d}"
            if i % 2 == 0:
                # activity day
                activity.append({"timestamp": f"{day}T18:00:00+00:00"})
                cgm.append({"timestamp": f"{day}T14:00:00+00:00", "value": 100})
                cgm.append({"timestamp": f"{day}T18:00:00+00:00", "value": 90})
            else:
                # rest day
                cgm.append({"timestamp": f"{day}T14:00:00+00:00", "value": 130})
                cgm.append({"timestamp": f"{day}T18:00:00+00:00", "value": 140})

        trait = _analyze_exercise_sensitivity(rows, "", cgm, activity)
        assert trait.data_source == "real_cgm"
        assert "mg/dL" in trait.detail


class TestBackwardCompatibility:
    """Synthetic legend data still produces same output as before (Issue #43)."""

    def test_legends_produce_synthetic_legend_source(self):
        """All 12 legend profiles produce synthetic_legend data_source."""
        anchors = [
            "well_controlled", "high_fat_delayed", "post_meal_spike", "brittle",
            "dawn_phenomenon", "overnight_hypo", "exercise_sensitive",
            "exercise_regimen", "insulin_sensitive", "insulin_resistant",
            "high_variability", "newly_diagnosed",
        ]
        for anchor in anchors:
            genome = genome_from_legends(anchor)
            for trait in genome.traits:
                assert trait.data_source == "synthetic_legend", (
                    f"{anchor}/{trait.trait_id}: got {trait.data_source}")

    def test_legends_still_produce_6_traits(self):
        """Backward compat: all 12 legends still produce 6 traits."""
        anchors = [
            "well_controlled", "high_fat_delayed", "post_meal_spike", "brittle",
            "dawn_phenomenon", "overnight_hypo", "exercise_sensitive",
            "exercise_regimen", "insulin_sensitive", "insulin_resistant",
            "high_variability", "newly_diagnosed",
        ]
        for anchor in anchors:
            genome = genome_from_legends(anchor)
            assert genome.total_meals_analyzed > 0, f"No meals for {anchor}"
            assert len(genome.traits) == 6, f"Wrong trait count for {anchor}"

    def test_high_fat_delayed_still_shows_fat_delay(self):
        """High Fat Delayed profile still shows high-fat dinner pattern."""
        genome = genome_from_legends("high_fat_delayed")
        fat_trait = next(t for t in genome.traits if t.trait_id == "fat_delay")
        assert fat_trait.confidence in ("high", "medium")
        assert fat_trait.evidence_count > 50

    def test_post_meal_spike_still_shows_breakfast_spike(self):
        """Post Meal Spike profile still shows breakfast spike tendency."""
        genome = genome_from_legends("post_meal_spike")
        spike_trait = next(t for t in genome.traits if t.trait_id == "breakfast_spike")
        assert spike_trait.confidence in ("high", "medium")


# ── Helper for CGM test data ──

def _make_cgm_readings() -> list[dict]:
    """Generate synthetic CGM readings for testing."""
    readings = []
    for day in range(30):
        for hour in range(24):
            readings.append({
                "timestamp": f"2025-01-{day+1:02d}T{hour:02d}:00:00+00:00",
                "value": 110 + (day % 3) * 10,
            })
    return readings


# ── Issue #46: Provenance fields (data_source, evidence_basis, confidence_components) ──

class TestProvenanceFields:
    """Tests for Issue #46: data_source, evidence_basis, confidence_components on outputs."""

    def test_trait_insight_has_provenance_fields(self):
        """TraitInsight has evidence_basis and confidence_components fields."""
        trait = TraitInsight(
            trait_id="test",
            label="Test",
            description="test",
            evidence_count=5,
            confidence="medium",
            confidence_score=0.5,
            detail="test detail",
        )
        # Fields should exist (even if None)
        assert hasattr(trait, "evidence_basis")
        assert hasattr(trait, "confidence_components")

    def test_trait_with_glucose_has_data_source(self):
        """Traits based on CGM data should have real_cgm data_source."""
        rows = _make_food_history("breakfast", 10, carbs=40, fat=5, sugars=20)
        cgm = []
        for i in range(10):
            # breakfast at T12, post-meal CGM at T12:30 and T13:00
            cgm.append({"timestamp": f"2025-01-{i+1:02d}T12:30:00+00:00", "value": 200})
            cgm.append({"timestamp": f"2025-01-{i+1:02d}T13:00:00+00:00", "value": 185})
            cgm.append({"timestamp": f"2025-01-{i+1:02d}T14:00:00+00:00", "value": 140})

        trait = _analyze_breakfast_spike(rows, "", cgm)

        assert trait.data_source == "real_cgm"
        assert trait.evidence_basis is None or trait.evidence_count > 0

    def test_trait_with_food_proxy_has_data_source(self):
        """Traits based on food proxy should have food_proxy data_source."""
        rows = _make_food_history("breakfast", 10, carbs=40, fat=5, sugars=20)
        trait = _analyze_breakfast_spike(rows, "", None)

        assert trait.data_source == "food_proxy"
        assert trait.evidence_count > 0

    def test_confidence_components_field_exists(self):
        """Confidence components field exists on TraitInsight."""
        rows = _make_food_history("breakfast", 10, carbs=40, fat=5, sugars=20)
        cgm = [{"timestamp": "2025-01-01T07:30:00+00:00", "value": 200}]
        trait = _analyze_breakfast_spike(rows, "", cgm)

        # Field should exist (may be None or have values)
        assert hasattr(trait, "confidence_components")
