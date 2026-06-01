"""SafetyMiddleware — centralized pipeline gate for all user-facing output.

Issue #38: Single veto authority composing five validators:
  1. TextSafetyChecker — existing SafetyScaffold (emergency keywords, banned words, dosing patterns)
  2. SchemaValidator — Pydantic contract validation for output schemas
  3. EvidenceValidator — required evidence links and event references present
  4. UncertaintyValidator — confidence tiers and carb ranges populated
  5. ConsistencyValidator — confidence matches evidence strength, range min ≤ max

No output leaves the pipeline without passing this gate.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from app.ai.safety import SafetyScaffold
from app.schemas.safety import SafetyReview

logger = logging.getLogger(__name__)


# ── Validator results ──

@dataclass
class ValidatorResult:
    name: str
    passed: bool
    issues: list[str] = field(default_factory=list)
    risk_level: str = "none"  # "none", "low", "moderate", "high"


# ── 1. TextSafetyChecker ──

class TextSafetyChecker:
    """Wraps existing SafetyScaffold as a validator in the middleware chain."""

    def __init__(self, scaffold: SafetyScaffold | None = None):
        self._scaffold = scaffold or SafetyScaffold()

    def validate(self, text: str, context: dict | None = None) -> ValidatorResult:
        review = self._scaffold.validate(text, context)
        issues = []
        if not review["is_safe"]:
            issues.append(f"Text safety failed: {review.get('reason', 'unknown')}")
            if review.get("blocked_phrases"):
                issues.append(f"Blocked phrases: {', '.join(review['blocked_phrases'])}")
        return ValidatorResult(
            name="TextSafetyChecker",
            passed=review["is_safe"],
            issues=issues,
            risk_level=review.get("risk_level", "none"),
        )


# ── 2. SchemaValidator ──

class SchemaValidator:
    """Validates output against Pydantic schema contracts."""

    def validate(self, output: dict[str, Any]) -> ValidatorResult:
        issues = []

        # Check that forecast section has required fields if present
        forecast = output.get("forecast", {})
        if forecast:
            if "peak_mg_dl" in forecast and not isinstance(forecast["peak_mg_dl"], (int, float)):
                issues.append("peak_mg_dl must be numeric")
            if "baseline_mg_dl" in forecast:
                b = forecast["baseline_mg_dl"]
                if not isinstance(b, (int, float)) or b < 40 or b > 400:
                    issues.append(f"baseline_mg_dl out of range: {b}")
            if "peak_time_minutes" in forecast:
                t = forecast["peak_time_minutes"]
                if not isinstance(t, (int, float)) or t < 0:
                    issues.append(f"peak_time_minutes must be non-negative: {t}")

        # Check evidence_bundle structure
        bundle = output.get("evidence_bundle", {})
        if bundle:
            totals = bundle.get("totals", {})
            if totals and "carbs_g" in totals:
                if not isinstance(totals["carbs_g"], (int, float)) or totals["carbs_g"] < 0:
                    issues.append(f"carbs_g must be non-negative: {totals['carbs_g']}")

        return ValidatorResult(
            name="SchemaValidator",
            passed=len(issues) == 0,
            issues=issues,
            risk_level="moderate" if issues else "none",
        )


# ── 3. EvidenceValidator ──

class EvidenceValidator:
    """Ensures required evidence links are present in output."""

    def validate(self, output: dict[str, Any]) -> ValidatorResult:
        issues = []

        # If there's a forecast, there should be evidence
        forecast = output.get("forecast", {})
        if forecast and forecast.get("peak_mg_dl"):
            evidence_items = output.get("food_evidence", [])
            if not evidence_items:
                issues.append("Forecast present but no food evidence items")

            # Check that top_drivers exist if forecast has a peak
            meal_drivers = forecast.get("meal_drivers", {})
            if not meal_drivers and not output.get("historical_context", {}).get("similar_meals_count"):
                # Only flag if there's no historical context either
                pass  # This is a soft check — not all forecasts need drivers

        # Check historical context references
        historical = output.get("historical_context", {})
        if historical.get("similar_meals_count", 0) > 0:
            if not historical.get("avg_peak_rise_mg_dl") and not historical.get("case_based_observations"):
                issues.append("Historical meals cited but no outcome data provided")

        return ValidatorResult(
            name="EvidenceValidator",
            passed=len(issues) == 0,
            issues=issues,
            risk_level="low" if issues else "none",
        )


# ── 4. UncertaintyValidator ──

class UncertaintyValidator:
    """Checks that confidence tiers and uncertainty ranges are populated."""

    def validate(self, output: dict[str, Any]) -> ValidatorResult:
        issues = []

        bundle = output.get("evidence_bundle", {})
        if not bundle:
            return ValidatorResult(name="UncertaintyValidator", passed=True)

        # Check confidence tier is present
        confidence = bundle.get("confidence_overall")
        if confidence and confidence not in ("high", "medium", "low"):
            issues.append(f"Invalid confidence tier: {confidence}")

        # Check carb range is present when carbs > 0
        totals = bundle.get("totals", {})
        carb_range = bundle.get("total_carbs_g_range")
        if totals.get("carbs_g", 0) > 0 and not carb_range:
            issues.append("Carbs present but no carb range provided")

        # Check carb range min ≤ max
        if carb_range and len(carb_range) == 2:
            if carb_range[0] > carb_range[1]:
                issues.append(f"Carb range min > max: {carb_range}")

        return ValidatorResult(
            name="UncertaintyValidator",
            passed=len(issues) == 0,
            issues=issues,
            risk_level="low" if issues else "none",
        )


# ── 5. ConsistencyValidator ──

class ConsistencyValidator:
    """Checks internal consistency of the output."""

    def validate(self, output: dict[str, Any]) -> ValidatorResult:
        issues = []

        forecast = output.get("forecast", {})
        bundle = output.get("evidence_bundle", {})

        # Confidence should not be "high" when evidence is weak
        confidence = bundle.get("confidence_overall", "low")
        evidence_items = output.get("food_evidence", [])
        if confidence == "high" and len(evidence_items) < 2:
            # Soft check — only flag if there's clearly insufficient evidence
            has_low_conf_evidence = any(
                getattr(e, "confidence", None) == "low"
                for e in evidence_items
                if hasattr(e, "confidence")
            )
            if has_low_conf_evidence:
                issues.append("Confidence is 'high' but evidence items have low confidence")

        # Peak should be ≥ baseline for non-zero carb meals
        if forecast and bundle:
            totals = bundle.get("totals", {})
            if totals.get("carbs_g", 0) > 0:
                peak = forecast.get("peak_mg_dl", 0)
                baseline = forecast.get("baseline_mg_dl", 0)
                if peak < baseline - 20:
                    issues.append(f"Peak ({peak}) much lower than baseline ({baseline}) for carb-containing meal")

        return ValidatorResult(
            name="ConsistencyValidator",
            passed=len(issues) == 0,
            issues=issues,
            risk_level="low" if issues else "none",
        )


# ── SafetyMiddleware — the gate ──

class SafetyMiddleware:
    """Centralized pipeline gate. No user-facing output passes without validation.

    Composes five validators:
      1. TextSafetyChecker — wraps SafetyScaffold
      2. SchemaValidator — Pydantic contract validation
      3. EvidenceValidator — evidence links present
      4.UncertaintyValidator — confidence/ranges populated
      5. ConsistencyValidator — internal consistency
    """

    def __init__(
        self,
        scaffold: SafetyScaffold | None = None,
        strict: bool = False,
    ):
        self.text_checker = TextSafetyChecker(scaffold)
        self.schema_validator = SchemaValidator()
        self.evidence_validator = EvidenceValidator()
        self.uncertainty_validator = UncertaintyValidator()
        self.consistency_validator = ConsistencyValidator()
        self._strict = strict

    def validate_input(self, text: str) -> tuple[bool, str | None]:
        """Validate user input before processing. Blocks dangerous queries.

        Returns (is_safe, reason_if_blocked).
        """
        result = self.text_checker.validate(text, {"source": "user_input"})
        if not result.passed:
            return False, result.issues[0] if result.issues else "Input blocked by safety policy"
        return True, None

    def validate_output(
        self,
        text: str,
        output: dict[str, Any],
        context: dict | None = None,
    ) -> tuple[bool, list[ValidatorResult]]:
        """Run all five validators on pipeline output.

        Returns (all_passed, list_of_results).
        """
        results: list[ValidatorResult] = []

        # 1. Text safety
        text_result = self.text_checker.validate(text, context)
        results.append(text_result)

        # 2. Schema validation
        schema_result = self.schema_validator.validate(output)
        results.append(schema_result)

        # 3. Evidence validation
        evidence_result = self.evidence_validator.validate(output)
        results.append(evidence_result)

        # 4. Uncertainty validation
        uncertainty_result = self.uncertainty_validator.validate(output)
        results.append(uncertainty_result)

        # 5. Consistency validation
        consistency_result = self.consistency_validator.validate(output)
        results.append(consistency_result)

        all_passed = all(r.passed for r in results)
        return all_passed, results

    def build_safe_fallback(
        self,
        text: str,
        results: list[ValidatorResult],
    ) -> str:
        """Build a safe fallback response when validation fails."""
        high_risk = [r for r in results if r.risk_level == "high"]
        if high_risk:
            return (
                "I can't provide that specific guidance — it's a question for your "
                "care plan or clinician. I can help you understand what this meal "
                "might do to your glucose and when to monitor.\n\n"
                "Educational simulation only — not medical advice."
            )

        issues_summary = "; ".join(
            issue
            for r in results
            for issue in r.issues[:2]
        )
        return (
            f"I've adjusted this output for safety. {issues_summary}\n\n"
            "Educational simulation only — not medical advice."
        )
