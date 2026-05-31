"""Tests for Habit Experiment Tracker (Issue #27)."""

import pytest
from datetime import date
from app.services.experiment_tracker import (
    create_experiment,
    analyze_experiment,
    experiment_card,
    list_active_experiments,
    Experiment,
    ExperimentSummary,
    EXPERIMENT_TYPES,
)


class TestCreateExperiment:
    """Test experiment creation."""
    
    def test_create_predefined_experiment(self):
        """Can create a predefined experiment type."""
        exp = create_experiment("walk_after_lunch")
        assert exp.title == "Walk after lunch"
        assert exp.status == "active"
        assert exp.experiment_id.startswith("walk_after_lunch")
    
    def test_experiment_has_dates(self):
        """Experiment has valid start/end dates."""
        exp = create_experiment("same_breakfast")
        assert exp.start_date
        assert exp.end_date
    
    def test_invalid_type_raises(self):
        """Invalid experiment type raises error without custom pattern."""
        with pytest.raises(ValueError):
            create_experiment("invalid_type", custom_pattern=None)
    
    def test_custom_pattern_allowed(self):
        """Can create experiment with custom pattern."""
        exp = create_experiment("custom", custom_pattern="Try intermittent fasting")
        assert exp.title == "custom"
        assert exp.description == "Try intermittent fasting"


class TestAnalyzeExperiment:
    """Test experiment analysis."""
    
    def test_no_outcomes_low_confidence(self):
        """No outcomes yields low confidence."""
        exp = create_experiment("walk_after_lunch")
        summary = analyze_experiment(exp)
        assert summary.confidence_tier == "low"
        assert summary.evidence_count == 0
    
    def test_small_sample_medium_confidence(self):
        """3 outcomes yields medium confidence."""
        exp = create_experiment("walk_after_lunch")
        exp.after_outcomes = [{"peak_mg_dl": 160}, {"peak_mg_dl": 155}, {"peak_mg_dl": 165}]
        summary = analyze_experiment(exp)
        assert summary.confidence_tier == "medium"
    
    def test_enough_data_high_confidence(self):
        """6+ outcomes yields high confidence."""
        exp = create_experiment("walk_after_lunch")
        exp.before_outcomes = [{"peak_mg_dl": 170}] * 3
        exp.after_outcomes = [{"peak_mg_dl": 150}] * 4
        summary = analyze_experiment(exp)
        assert summary.confidence_tier == "high"
    
    def test_association_language_used(self):
        """Analysis uses association language, not causation."""
        exp = create_experiment("walk_after_lunch")
        exp.before_outcomes = [{"peak_mg_dl": 170}] * 3
        exp.after_outcomes = [{"peak_mg_dl": 150}] * 3
        summary = analyze_experiment(exp)
        
        # Should contain association words
        assert "associated" in summary.association_note.lower()
        # Should NOT contain causation words
        assert "caused" not in summary.association_note.lower()
        assert "because" not in summary.association_note.lower()
    
    def test_note_differentiates_directions(self):
        """Notes differ for lower/higher/equal outcomes."""
        exp_lower = create_experiment("walk_after_lunch")
        exp_lower.before_outcomes = [{"peak_mg_dl": 170}]
        exp_lower.after_outcomes = [{"peak_mg_dl": 150}]
        
        exp_higher = create_experiment("walk_after_lunch")
        exp_higher.before_outcomes = [{"peak_mg_dl": 150}]
        exp_higher.after_outcomes = [{"peak_mg_dl": 170}]
        
        summary_lower = analyze_experiment(exp_lower)
        summary_higher = analyze_experiment(exp_higher)
        
        # Both should have different notes
        assert summary_lower.association_note != summary_higher.association_note


class TestExperimentCard:
    """Test experiment card rendering."""
    
    def test_card_includes_all_sections(self):
        """Card includes title, stats, confidence, note."""
        summary = ExperimentSummary(
            experiment_id="test_123",
            title="Walk after lunch",
            status="completed",
            duration_days=7,
            before_stats={"avg_peak_mg_dl": 160, "meals_analyzed": 5},
            after_stats={"avg_peak_mg_dl": 145, "meals_analyzed": 5},
            association_note="test note",
            confidence_tier="medium",
            evidence_count=10,
        )
        
        card = experiment_card(summary)
        full_text = "\n".join(card)
        
        assert "Walk after lunch" in full_text
        assert "completed" in full_text
        assert "145 mg/dL" in full_text
        assert "medium" in full_text
        assert "test note" in full_text
        assert "associated" in full_text.lower()
    
    def test_disclaimer_present(self):
        """Card includes disclaimer about association vs causation."""
        summary = ExperimentSummary(
            experiment_id="test",
            title="Test",
            status="active",
            duration_days=5,
            before_stats={"avg_peak_mg_dl": 150, "meals_analyzed": 3},
            after_stats={"avg_peak_mg_dl": 150, "meals_analyzed": 3},
            association_note="test",
            confidence_tier="low",
            evidence_count=6,
        )
        
        card = experiment_card(summary)
        full_text = "\n".join(card)
        assert "disclaimed" in full_text.lower() or "associated" in full_text.lower()


class TestListExperiments:
    """Test listing experiments."""
    
    def test_no_active_experiments(self):
        """Empty list returns no experiments message."""
        cards = list_active_experiments([])
        assert "No active experiments" in cards[0]
    
    def test_lists_active_only(self):
        """Only active experiments shown."""
        exps = [
            Experiment(
                experiment_id="x1", title="X", description="x",
                start_date="2025-01-01", end_date="2025-01-07", status="completed"
            ),
            Experiment(
                experiment_id="a1", title="A", description="a",
                start_date="2025-01-01", end_date="2025-01-07", status="active"
            ),
        ]
        
        cards = list_active_experiments(exps)
        assert "x1" not in "\n".join(cards)
        assert "A" in "\n".join(cards)


class TestExperimentTypes:
    """Test predefined experiment types."""
    
    def test_all_types_defined(self):
        """All required experiment types exist."""
        assert "walk_after_lunch" in EXPERIMENT_TYPES
        assert "lower_fat_pizza" in EXPERIMENT_TYPES
        assert "earlier_dinner" in EXPERIMENT_TYPES
        assert "same_breakfast" in EXPERIMENT_TYPES
    
    def test_types_have_valid_structure(self):
        """Each type has required fields."""
        for key, exp in EXPERIMENT_TYPES.items():
            assert "title" in exp
            assert "template" in exp