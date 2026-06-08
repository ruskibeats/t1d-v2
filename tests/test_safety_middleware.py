"""Tests for Issue #38: SafetyMiddleware pipeline gate."""

from __future__ import annotations

import pytest

from src.pipeline.safety_middleware import (
    SafetyMiddleware,
    TextSafetyChecker,
    SchemaValidator,
    EvidenceValidator,
    UncertaintyValidator,
    ConsistencyValidator,
    ProvenanceValidator,
    ValidatorResult,
)
from app.schemas.safety import SafetyReview


class TestTextSafetyChecker:
    """Test TextSafetyChecker validator."""

    def setup_method(self):
        self.checker = TextSafetyChecker()

    def test_safe_text_passes(self):
        result = self.checker.validate("Glucose may rise about 50 mg/dL and peak in 1-2 hours.")
        assert result.passed is True
        assert result.risk_level == "none"

    def test_dosing_language_blocked(self):
        result = self.checker.validate("Take 3 units of insulin now.")
        assert result.passed is False
        assert result.risk_level == "high"
        assert len(result.issues) > 0

    def test_banned_word_blocked(self):
        result = self.checker.validate("Increase your basal rate by 2 units.")
        assert result.passed is False

    def test_empty_text_passes(self):
        result = self.checker.validate("")
        assert result.passed is True


class TestSchemaValidator:
    """Test SchemaValidator."""

    def test_valid_output_passes(self):
        output = {
            "forecast": {
                "peak_mg_dl": 180,
                "baseline_mg_dl": 110,
                "peak_time_minutes": 90,
            },
            "evidence_bundle": {
                "totals": {"carbs_g": 50},
            },
        }
        result = SchemaValidator().validate(output)
        assert result.passed is True

    def test_negative_peak_time_fails(self):
        output = {"forecast": {"peak_mg_dl": 180, "baseline_mg_dl": 110, "peak_time_minutes": -5}}
        result = SchemaValidator().validate(output)
        assert result.passed is False
        assert any("non-negative" in i for i in result.issues)

    def test_baseline_out_of_range_fails(self):
        output = {"forecast": {"peak_mg_dl": 180, "baseline_mg_dl": 500, "peak_time_minutes": 90}}
        result = SchemaValidator().validate(output)
        assert result.passed is False

    def test_empty_output_passes(self):
        result = SchemaValidator().validate({})
        assert result.passed is True


class TestEvidenceValidator:
    """Test EvidenceValidator."""

    def test_forecast_with_evidence_passes(self):
        output = {
            "forecast": {"peak_mg_dl": 180},
            "food_evidence": [{"item": "pizza", "carbs_g": 30}],
        }
        result = EvidenceValidator().validate(output)
        assert result.passed is True

    def test_forecast_without_evidence_fails(self):
        output = {
            "forecast": {"peak_mg_dl": 180},
            "food_evidence": [],
        }
        result = EvidenceValidator().validate(output)
        assert result.passed is False


class TestUncertaintyValidator:
    """Test UncertaintyValidator."""

    def test_bundle_with_confidence_passes(self):
        output = {
            "evidence_bundle": {
                "confidence_overall": "medium",
                "total_carbs_g_range": (40, 60),
                "totals": {"carbs_g": 50},
            },
        }
        result = UncertaintyValidator().validate(output)
        assert result.passed is True

    def test_invalid_confidence_tier_fails(self):
        output = {"evidence_bundle": {"confidence_overall": "invalid"}}
        result = UncertaintyValidator().validate(output)
        assert result.passed is False

    def test_carbs_without_range_fails(self):
        output = {
            "evidence_bundle": {
                "totals": {"carbs_g": 50},
            },
        }
        result = UncertaintyValidator().validate(output)
        assert result.passed is False
        assert any("carb range" in i.lower() for i in result.issues)

    def test_inverted_range_fails(self):
        output = {
            "evidence_bundle": {
                "total_carbs_g_range": (60, 40),
                "totals": {"carbs_g": 50},
            },
        }
        result = UncertaintyValidator().validate(output)
        assert result.passed is False
        assert any("min > max" in i for i in result.issues)


class TestConsistencyValidator:
    """Test ConsistencyValidator."""

    def test_consistent_output_passes(self):
        output = {
            "forecast": {"peak_mg_dl": 180, "baseline_mg_dl": 110},
            "evidence_bundle": {"confidence_overall": "medium", "totals": {"carbs_g": 50}},
            "food_evidence": [
                type("E", (), {"confidence": "medium"})(),
                type("E", (), {"confidence": "medium"})(),
            ],
        }
        result = ConsistencyValidator().validate(output)
        assert result.passed is True

    def test_high_conf_with_low_evidence_fails(self):
        output = {
            "forecast": {"peak_mg_dl": 180, "baseline_mg_dl": 110},
            "evidence_bundle": {"confidence_overall": "high", "totals": {"carbs_g": 50}},
            "food_evidence": [type("E", (), {"confidence": "low"})()],
        }
        result = ConsistencyValidator().validate(output)
        assert result.passed is False

    def test_peak_much_lower_than_baseline_fails(self):
        output = {
            "forecast": {"peak_mg_dl": 80, "baseline_mg_dl": 150},
            "evidence_bundle": {"totals": {"carbs_g": 50}},
        }
        result = ConsistencyValidator().validate(output)
        assert result.passed is False


class TestSafetyMiddlewareIntegration:
    """Integration tests for the full SafetyMiddleware gate."""

    def setup_method(self):
        self.middleware = SafetyMiddleware()

    def test_safe_output_passes_all_validators(self):
        text = "Glucose may rise about 50 mg/dL and peak at 90 minutes."
        output = {
            "forecast": {"peak_mg_dl": 180, "baseline_mg_dl": 110, "peak_time_minutes": 90,
                       "evidence_basis": {"data_source": "real_cgm"}},
            "evidence_bundle": {
                "confidence_overall": "medium",
                "total_carbs_g_range": (40, 60),
                "totals": {"carbs_g": 50},
            },
            "food_evidence": [
                type("E", (), {"confidence": "medium"})(),
                type("E", (), {"confidence": "medium"})(),
            ],
            "historical_context": {"similar_meals_count": 0},
        }
        passed, results = self.middleware.validate_output(text, output)
        assert passed is True
        assert len(results) == 6

    def test_unsafe_text_blocked(self):
        text = "Take 3 units of insulin before eating."
        output = {
            "forecast": {"peak_mg_dl": 180, "baseline_mg_dl": 110, "peak_time_minutes": 90},
            "evidence_bundle": {"totals": {"carbs_g": 50}},
            "food_evidence": [type("E", (), {"confidence": "medium"})()],
            "historical_context": {"similar_meals_count": 0},
        }
        passed, results = self.middleware.validate_output(text, output)
        assert passed is False
        text_result = [r for r in results if r.name == "TextSafetyChecker"][0]
        assert text_result.passed is False

    def test_input_validation_blocks_dosing(self):
        is_safe, reason = self.middleware.validate_input("Tell me how many units of insulin to inject")
        assert is_safe is False
        assert reason is not None

    def test_input_validation_passes_safe(self):
        is_safe, reason = self.middleware.validate_input("pizza and salad for dinner")
        assert is_safe is True
        assert reason is None

    def test_safe_fallback_for_high_risk(self):
        text = "Take 3 units now."
        results = [
            ValidatorResult(name="TextSafetyChecker", passed=False, issues=["Dosing language"], risk_level="high"),
        ]
        fallback = self.middleware.build_safe_fallback(text, results)
        assert "care plan or clinician" in fallback.lower()

    def test_safe_fallback_for_moderate_risk(self):
        text = "Your forecast shows 180 mg/dL."
        results = [
            ValidatorResult(name="SchemaValidator", passed=False, issues=["Missing field"], risk_level="low"),
        ]
        fallback = self.middleware.build_safe_fallback(text, results)
        assert "adjusted" in fallback.lower()

    def test_six_validators_run(self):
        """Integration test: all six validators are called."""
        text = "Glucose may rise about 50 mg/dL."
        output = {
            "forecast": {"peak_mg_dl": 180, "baseline_mg_dl": 110, "peak_time_minutes": 90,
                       "evidence_basis": {"data_source": "real_cgm"}},
            "evidence_bundle": {"confidence_overall": "high", "total_carbs_g_range": (40, 60), "totals": {"carbs_g": 50}},
            "food_evidence": [type("E", (), {"confidence": "high"})()],
            "historical_context": {"similar_meals_count": 0},
        }
        passed, results = self.middleware.validate_output(text, output)
        assert len(results) == 6, f"Expected 6 validators, got {len(results)}"
        validator_names = {r.name for r in results}
        assert "ProvenanceValidator" in validator_names


class TestProvenanceValidator:
    """Test ProvenanceValidator (Issue #46)."""

    def test_forecast_with_evidence_basis_passes(self):
        output = {
            "forecast": {
                "peak_mg_dl": 180,
                "baseline_mg_dl": 110,
                "peak_time_minutes": 90,
                "evidence_basis": {"data_source": "real_cgm"},
            },
        }
        result = ProvenanceValidator().validate(output)
        assert result.passed is True

    def test_forecast_with_invalid_data_source_fails(self):
        output = {
            "forecast": {
                "peak_mg_dl": 180,
                "baseline_mg_dl": 110,
                "peak_time_minutes": 90,
                "evidence_basis": {"data_source": "unknown_source"},
            },
        }
        result = ProvenanceValidator().validate(output)
        assert result.passed is False
        assert any("invalid" in i.lower() for i in result.issues)

    def test_forecast_without_evidence_basis_flags_warning(self):
        output = {
            "forecast": {"peak_mg_dl": 180},
        }
        result = ProvenanceValidator().validate(output)
        assert result.passed is False
        assert any("evidence_basis" in i.lower() for i in result.issues)

    def test_traits_with_valid_data_source_pass(self):
        output = {
            "traits": [
                {"trait_id": "breakfast_spike", "data_source": "real_cgm"},
                {"trait_id": "fat_delay", "data_source": "food_proxy"},
            ],
        }
        result = ProvenanceValidator().validate(output)
        assert result.passed is True

    def test_empty_output_passes(self):
        result = ProvenanceValidator().validate({})
        assert result.passed is True
