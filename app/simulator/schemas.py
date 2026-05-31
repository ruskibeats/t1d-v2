from enum import Enum
from dataclasses import dataclass

class AnchorType(str, Enum):
    WELL_CONTROLLED = "well_controlled"
    HIGH_FAT_DELAYED = "high_fat_delayed"
    POST_MEAL_SPIKE = "post_meal_spike"
    BRITTLE = "brittle"
    DAWN_PHENOMENON = "dawn_phenomenon"
    OVERNIGHT_HYPO = "overnight_hypo"
    EXERCISE_SENSITIVE = "exercise_sensitive"
    EXERCISE_REGIMEN = "exercise_regimen"
    INSULIN_SENSITIVE = "insulin_sensitive"
    INSULIN_RESISTANT = "insulin_resistant"
    HIGH_VARIABILITY = "high_variability"
    NEWLY_DIAGNOSED = "newly_diagnosed"
    FOOT2FLOOR = "foot_to_floor"

@dataclass
class PatientConfig:
    anchor_type: AnchorType
    seed: int = 42
    basal_glucose_mean: float = 110
    basal_glucose_amplitude: float = 15
    meal_rise_factor: float = 2.0
    insulin_sensitivity: float = 40
    carb_ratio: float = 15
    fat_delay_hours: float = 3
    exercise_drop_factor: float = 1.0
