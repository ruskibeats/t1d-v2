from .schemas import AnchorType, PatientConfig

def generate_patient_config(anchor_type, seed=42):
    profiles = {
        AnchorType.WELL_CONTROLLED: {"basal_glucose_mean": 110, "carb_ratio": 10, "fat_delay_hours": 2},
        AnchorType.HIGH_FAT_DELAYED: {"basal_glucose_mean": 112, "carb_ratio": 15, "fat_delay_hours": 3.5},
        AnchorType.EXERCISE_SENSITIVE: {"basal_glucose_mean": 110, "carb_ratio": 15, "fat_delay_hours": 2.5},
    }
    p = profiles.get(anchor_type.value, profiles["well_controlled"])
    return PatientConfig(anchor_type=anchor_type, **p)

def generate_profile_json(config):
    return {"anchor_type": config.anchor_type.value, "anchor_label": config.anchor_type.value}
