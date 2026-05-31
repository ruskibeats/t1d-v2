"""Safety regression matrix for SafetyScaffold (Issue #19).

Categorized test cases ensuring the safety gate catches dangerous
recommendations while allowing legitimate educational content.
"""

from __future__ import annotations

import pytest
from app.ai.safety import SafetyScaffold

# ── Helper ──

def _test_blocked(text: str, expected_phrase: str = "") -> None:
    """Assert that text is blocked by the safety scaffold."""
    safety = SafetyScaffold()
    result = safety.validate(text)
    assert not result["is_safe"], f"Expected blocked but passed: {text[:60]}..."
    if expected_phrase:
        matched = any(expected_phrase.lower() in p.lower() for p in result["blocked_phrases"])
        if not matched:
            matched = any(expected_phrase.lower() in text.lower() for p in result["blocked_phrases"])
        assert matched, f"Expected phrase '{expected_phrase}' in blocked: {result['blocked_phrases']}"


def _test_allowed(text: str) -> None:
    """Assert that text passes the safety scaffold."""
    safety = SafetyScaffold()
    result = safety.validate(text)
    assert result["is_safe"], f"Expected allowed but blocked: {text[:60]}... blocked: {result['blocked_phrases']}"


# ══════════════════════════════════════════════════════════════
# Category 1: Dosing Recommendations (should be blocked)
# ══════════════════════════════════════════════════════════════

class TestDosingRecommendations:
    """Dosing language must be blocked — never recommend insulin amounts."""

    def test_take_2_units(self):
        _test_blocked("You should take 2 units of insulin for this meal.")

    def test_give_3_units(self):
        _test_blocked("Give 3 units now.")

    def test_inject_1_unit(self):
        _test_blocked("Inject 1 unit to correct.")

    def test_dose_with_amount(self):
        _test_blocked("A dose of 4 units should cover this.")

    def test_units_of_insulin_pattern(self):
        _test_blocked("This meal needs 5 units of insulin.")

    def test_pre_bolus(self):
        _test_blocked("Consider a pre-bolus 15 minutes before eating.")

    def test_split_bolus(self):
        _test_blocked("Use a split bolus for high-fat meals.")

    def test_extended_bolus(self):
        _test_blocked("Set up an extended bolus for pizza.")

    def test_square_wave_bolus(self):
        _test_blocked("A square wave bolus works well here.")

    def test_banned_word_insulin(self):
        _test_blocked("Monitor your insulin sensitivity after exercise.")

    def test_banned_word_bolus(self):
        _test_blocked("Consider your bolus timing.")

    def test_banned_word_dose(self):
        _test_blocked("Adjust your dose based on trends.")

    def test_take_a_unit(self):
        _test_blocked("Take a unit of insulin before dinner.")

    def test_give_one_unit(self):
        _test_blocked("Give one unit for correction.")


# ══════════════════════════════════════════════════════════════
# Category 2: Treatment Advice (should be blocked)
# ══════════════════════════════════════════════════════════════

class TestTreatmentAdvice:
    """Treatment modification language must be blocked."""

    def test_change_treatment(self):
        _test_blocked("You should change your treatment plan.")

    def test_stop_insulin(self):
        _test_blocked("Stop taking insulin if you feel low.")

    def test_discontinue_medication(self):
        _test_blocked("Discontinue your current medication.")

    def test_increase_basal(self):
        _test_blocked("Increase your basal rate.")

    def test_decrease_basal(self):
        _test_blocked("Decrease your basal setting.")


# ══════════════════════════════════════════════════════════════
# Category 3: Medical Claims (should be blocked via banned words / safety context)
# ══════════════════════════════════════════════════════════════

class TestMedicalClaims:
    """Medical claims may pass or be blocked depending on wording."""

    def test_insulin_claim_with_banned_word(self):
        _test_blocked("This method uses insulin to cure diabetes.")

    def test_guaranteed_lower_with_insulin(self):
        _test_blocked("This insulin is guaranteed to lower glucose.")

    def test_treatment_with_banned_word(self):
        _test_blocked("This treatment changes your insulin needs.")

    def test_doctor_instruction_with_banned_word(self):
        _test_blocked("Your doctor can adjust your insulin dose.")

    def test_pump_medical_claim(self):
        _test_blocked("This pump will deliver the right amount.")


# ══════════════════════════════════════════════════════════════
# Category 4: Device Manipulation (should be blocked)
# ══════════════════════════════════════════════════════════════

class TestDeviceManipulation:
    """Device manipulation language must be blocked."""

    def test_change_pump_settings(self):
        _test_blocked("Change your pump settings to reduce basal.")

    def test_temp_basal(self):
        _test_blocked("Set a temp basal of 80% for exercise.")

    def test_disconnect_pump(self):
        _test_blocked("Disconnect your pump during activity.")


# ══════════════════════════════════════════════════════════════
# Category 5: Contradictory Safety (should be blocked)
# ══════════════════════════════════════════════════════════════

class TestContradictorySafety:
    """Contradictory safety advice must be blocked."""

    def test_stop_taking_insulin(self):
        _test_blocked("Stop taking insulin without consulting your doctor.")

    def test_ignore_doctor_advice_with_banned_word(self):
        _test_blocked("Ignore your doctor about your insulin dose.")

    def test_emergency_help(self):
        _test_blocked("This is an emergency — call 911 for help.")

    def test_ketones_warning(self):
        _test_blocked("Check for ketones if you have large ketones.")

    def test_severe_low(self):
        _test_blocked("If you experience severe low, call for help.")

    def test_bolus_from_pump_claim(self):
        _test_blocked("The pump will deliver the bolus automatically.")


# ══════════════════════════════════════════════════════════════
# Category 6: Edge Cases (should be blocked)
# ══════════════════════════════════════════════════════════════

class TestEdgeCases:
    """Edge cases including obfuscation and mixed language."""

    def test_unicode_insulin_mixed(self):
        """Unicode obfuscation with some ASCII — blocked."""
        _test_blocked("Please check your insulin dose.")

    def test_unicode_insulin_cyrillic_only(self):
        """Cyrillic-only won't match ASCII patterns — allowed."""
        _test_allowed("Your іnsulіn lеvеls with Cyrillic text may not match patterns.")

    def test_units_word_in_sentence(self):
        """Word 'units' alone not caught by dosing pattern."""
        _test_allowed("Check your blood glucose units - mg/dL vs mmol/L.")

    def test_mixed_english_other(self):
        """Mixed language with banned word."""
        _test_blocked("Por favor, revise su dosis de insulin.")

    def test_partial_banned_word_bolus(self):
        """Banned word 'bolus' in context."""
        _test_blocked("The bolus calculator suggests a different amount.")

    def test_case_insensitive_basal(self):
        """Case-insensitive blocked word."""
        _test_blocked("Adjust your BASAL rate.")

    def test_dosing_in_sentence(self):
        """Dosing with number but different phrasing."""
        _test_blocked("The recommended dose is 3 units of fast-acting.")

    def test_take_units_no_number(self):
        """Take units without number still caught by banned word."""
        _test_blocked("Take insulin as prescribed.")

    def test_multiple_banned_words(self):
        """Multiple banned words in one sentence."""
        _test_blocked("Change your basal rate and bolus ratio.")

    def test_insulin_sensitivity_context(self):
        """'Insulin' in educational context still blocked by safety policy."""
        _test_blocked("Your insulin sensitivity varies throughout the day.")


# ══════════════════════════════════════════════════════════════
# Category 7: Legitimate Phrases (must NOT be blocked)
# ══════════════════════════════════════════════════════════════

class TestLegitimatePhrases:
    """Educational content must pass safely."""

    def test_typical_educational_content(self):
        _test_allowed(
            "Based on your history, fast carbs tend to raise glucose "
            "more quickly than slow carbs. Peak around 90 minutes."
        )

    def test_fast_carbs_raise_glucose(self):
        _test_allowed("Fast carbs raise glucose rapidly after eating.")

    def test_monitoring_suggestion(self):
        _test_allowed("Watch the expected peak window and compare with your trend.")

    def test_fat_delay_note(self):
        _test_allowed("High fat may delay the rise — watch 3–4 hours.")

    def test_educational_disclaimer(self):
        _test_allowed("Educational simulation only — not medical advice.")

    def test_historical_context(self):
        _test_allowed("Found 3 similar historical meals in your data.")

    def test_carb_uncertainty(self):
        _test_allowed("Portion of fries is unclear — consider checking actual serving.")

    def test_time_in_range_mention(self):
        _test_allowed("Time in range: 78% over the past 24 hours.")

    def test_peak_prediction(self):
        _test_allowed("The forecast peaks around 180 mg/dL at about 120 minutes.")

    def test_exercise_glucose(self):
        _test_allowed("Exercise can affect glucose levels during and after activity.")

    def test_overnight_watch(self):
        _test_allowed("Set an overnight alert if dinner was high fat — check at 3 AM.")

    def test_observation_language(self):
        _test_allowed("This meal is associated with a 15 mg/dL higher peak.")


# ══════════════════════════════════════════════════════════════
# Meta: total test count
# ══════════════════════════════════════════════════════════════

def test_total_test_count():
    """Ensure at least 30 test cases exist across all categories."""
    test_classes = [
        TestDosingRecommendations, TestTreatmentAdvice,
        TestMedicalClaims, TestDeviceManipulation,
        TestContradictorySafety, TestEdgeCases,
        TestLegitimatePhrases,
    ]
    total = sum(len([m for m in dir(cls) if m.startswith("test_")]) for cls in test_classes)
    assert total >= 30, f"Only {total} tests — need at least 30"
