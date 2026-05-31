"""Tests for daily debrief service."""

import pytest
from app.services.daily_debrief import (
    generate_daily_debrief,
    _identify_top_driver,
    _identify_unusual_events,
    _assess_delayed_rise_risk,
    _overnight_watch_items,
    _tomorrow_watch_outs,
)


class TestDailyDebrief:
    """Test daily debrief generation."""
    
    def test_basic_debrief_structure(self):
        """Debrief has all required sections."""
        result = generate_daily_debrief(
            foods_logged=["pizza", "salad"],
            carb_totals={"carbs_g": 60, "fat_g": 20, "sugars_g": 10},
        )
        
        assert "foods_logged" in result
        assert "top_driver" in result
        assert "unusual_events" in result
        assert "stable_window" in result
        assert "delayed_rise_risk" in result
        assert "overnight_watch" in result
        assert "tomorrow_watch" in result
        assert "evidence_counts" in result
        assert "most_useful_observation" in result
    
    def test_high_fat_delayed_rise(self):
        """High fat meals trigger delayed rise watch."""
        result = generate_daily_debrief(
            foods_logged=["pizza"],
            carb_totals={"carbs_g": 45, "fat_g": 25},
        )
        
        assert result["delayed_rise_risk"]["risk_level"] == "high"
        assert "3-5 hours" in result["delayed_rise_risk"]["hours_to_watch"]
    
    def test_large_carb_overdue_watch(self):
        """Large carb loads trigger overnight watch."""
        result = generate_daily_debrief(
            foods_logged=["pasta"],
            carb_totals={"carbs_g": 90, "fat_g": 5},
        )
        
        assert len(result["overnight_watch"]) > 0
        assert any("large" in w.lower() for w in result["overnight_watch"])


class TestTopDriver:
    """Test top driver identification."""
    
    def test_carbs_is_top_driver(self):
        """Carbs dominated meal identifies carbs as driver."""
        result = _identify_top_driver(
            {"carbs_g": 60, "fat_g": 10, "sugars_g": 5},
            None
        )
        assert result["driver_type"] == "carbs"
        assert result["amount_g"] == 60


class TestUnusualEvents:
    """Test unusual event detection."""
    
    def test_high_variance_detected(self):
        """High variance in responses triggers event."""
        context = {
            "peak_rise_range_mg_dl": [120, 200],
        }
        events = _identify_unusual_events(context)
        assert any(e["type"] == "high_variance" for e in events)
    
    def test_spike_detected(self):
        """High peak triggers spike event."""
        context = {
            "peak_rise_range_mg_dl": [180, 250],
        }
        events = _identify_unusual_events(context)
        assert any(e["type"] == "spike" for e in events)


class TestEvidenceCounts:
    """Test evidence count extraction."""
    
    def test_evidence_counts_no_context(self):
        """No context returns zero counts."""
        counts = generate_daily_debrief(
            foods_logged=[],
            carb_totals={},
        )["evidence_counts"]
        
        assert counts["similar_meals_analyzed"] == 0
        assert counts["confidence_tier"] == "no_data"