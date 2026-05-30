# T1D Companion v2

Glucose forecasting and meal explanation system (NOT medical advice).

## Features

- 3-compartment gut model for physiology-based predictions
- Safety-enforced LLM integration (banned word checking)
- Calibration framework for Nightscout/Dexcom integration
- Evidence fields for explainable predictions

## Quick Start

```bash
# Install (no external dependencies required for core)
pip install pydantic httpx

# Use the forecast engine
python3 -c "
from src.forecast_engine import ForecastStage, MealTotals
totals = MealTotals(carbs_g=50, fat_g=20)
stage = ForecastStage(
    anchor_type='high_fat_delayed',
    basal_mg_dl=112, carb_ratio=15, insulin_sensitivity=50,
    fat_delay_hours=3.5, exercise_drop_factor=1.0
)
result = stage.forecast(totals)
print(f'Peak: {result.peak_mg_dl} mg/dL')
"
```

## Documentation

See [docs/T1D_COMPANION_DOCS.html](docs/T1D_COMPANION_DOCS.html) for complete guide.

## Structure

- `src/forecast_engine.py` - Core forecasting logic
- `src/physiology_model.py` - 3-compartment model
- `src/t1d_llm_context.py` - Safety validation
- `app/simulator/` - Minimal stubs for profile generation

## License

MIT
