"""Patient profile factory for deterministic simulator anchors."""

from __future__ import annotations

from .schemas import AnchorType, PatientConfig


_PROFILE_OVERRIDES: dict[AnchorType, dict] = {
    AnchorType.WELL_CONTROLLED: {
        "basal_glucose_mean": 110,
        "basal_glucose_amplitude": 12,
        "meal_rise_factor": 1.5,
        "insulin_sensitivity": 45,
        "carb_ratio": 10,
        "fat_delay_hours": 2.0,
        "exercise_drop_factor": 1.0,
    },
    AnchorType.HIGH_FAT_DELAYED: {
        "basal_glucose_mean": 112,
        "basal_glucose_amplitude": 15,
        "meal_rise_factor": 3.0,
        "insulin_sensitivity": 50,
        "carb_ratio": 15,
        "fat_delay_hours": 3.5,
        "exercise_drop_factor": 1.0,
    },
    AnchorType.POST_MEAL_SPIKE: {
        "basal_glucose_mean": 118,
        "basal_glucose_amplitude": 18,
        "meal_rise_factor": 3.0,
        "insulin_sensitivity": 38,
        "carb_ratio": 14,
        "fat_delay_hours": 2.0,
        "exercise_drop_factor": 1.0,
    },
    AnchorType.BRITTLE: {
        "basal_glucose_mean": 125,
        "basal_glucose_amplitude": 35,
        "meal_rise_factor": 2.8,
        "insulin_sensitivity": 55,
        "carb_ratio": 16,
        "fat_delay_hours": 3.0,
        "exercise_drop_factor": 1.2,
    },
    AnchorType.DAWN_PHENOMENON: {
        "basal_glucose_mean": 130,
        "basal_glucose_amplitude": 28,
        "meal_rise_factor": 1.7,
        "insulin_sensitivity": 42,
        "carb_ratio": 13,
        "fat_delay_hours": 2.5,
        "exercise_drop_factor": 1.0,
    },
    AnchorType.OVERNIGHT_HYPO: {
        "basal_glucose_mean": 95,
        "basal_glucose_amplitude": 22,
        "meal_rise_factor": 1.4,
        "insulin_sensitivity": 60,
        "carb_ratio": 17,
        "fat_delay_hours": 2.5,
        "exercise_drop_factor": 1.3,
    },
    AnchorType.EXERCISE_SENSITIVE: {
        "basal_glucose_mean": 110,
        "basal_glucose_amplitude": 18,
        "meal_rise_factor": 1.5,
        "insulin_sensitivity": 55,
        "carb_ratio": 15,
        "fat_delay_hours": 2.5,
        "exercise_drop_factor": 1.6,
    },
    AnchorType.EXERCISE_REGIMEN: {
        "basal_glucose_mean": 108,
        "basal_glucose_amplitude": 15,
        "meal_rise_factor": 1.4,
        "insulin_sensitivity": 50,
        "carb_ratio": 14,
        "fat_delay_hours": 2.5,
        "exercise_drop_factor": 1.4,
    },
    AnchorType.INSULIN_SENSITIVE: {
        "basal_glucose_mean": 105,
        "basal_glucose_amplitude": 14,
        "meal_rise_factor": 1.3,
        "insulin_sensitivity": 70,
        "carb_ratio": 20,
        "fat_delay_hours": 2.5,
        "exercise_drop_factor": 1.2,
    },
    AnchorType.INSULIN_RESISTANT: {
        "basal_glucose_mean": 125,
        "basal_glucose_amplitude": 20,
        "meal_rise_factor": 2.5,
        "insulin_sensitivity": 25,
        "carb_ratio": 8,
        "fat_delay_hours": 3.0,
        "exercise_drop_factor": 1.0,
    },
    AnchorType.HIGH_VARIABILITY: {
        "basal_glucose_mean": 120,
        "basal_glucose_amplitude": 32,
        "meal_rise_factor": 2.6,
        "insulin_sensitivity": 45,
        "carb_ratio": 15,
        "fat_delay_hours": 3.0,
        "exercise_drop_factor": 1.2,
    },
    AnchorType.NEWLY_DIAGNOSED: {
        "basal_glucose_mean": 115,
        "basal_glucose_amplitude": 25,
        "meal_rise_factor": 2.8,
        "insulin_sensitivity": 65,
        "carb_ratio": 18,
        "fat_delay_hours": 2.5,
        "exercise_drop_factor": 1.1,
    },
}


def _coerce_anchor_type(anchor_type: AnchorType | str) -> AnchorType:
    """Accept either AnchorType or raw anchor string."""
    if isinstance(anchor_type, AnchorType):
        return anchor_type
    return AnchorType(str(anchor_type))


def generate_patient_config(anchor_type: AnchorType | str, seed: int = 42) -> PatientConfig:
    """Generate a deterministic PatientConfig for every documented anchor."""
    anchor = _coerce_anchor_type(anchor_type)
    overrides = _PROFILE_OVERRIDES[anchor]
    return PatientConfig(anchor_type=anchor, seed=seed, **overrides)


def generate_profile_json(config: PatientConfig) -> dict:
    """Serialize profile metadata for evidence/narration bundles."""
    return {
        "anchor_type": config.anchor_type.value,
        "anchor_label": config.anchor_type.value.replace("_", " ").title(),
        "basal_glucose_mean": config.basal_glucose_mean,
        "carb_ratio": config.carb_ratio,
        "insulin_sensitivity": config.insulin_sensitivity,
        "fat_delay_hours": config.fat_delay_hours,
        "exercise_drop_factor": config.exercise_drop_factor,
    }
