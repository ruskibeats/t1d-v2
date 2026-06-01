"""Tests for CompanionPipeline."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.food.service import ParsedFood
from src.pipeline import CompanionPipeline


class TestCompanionPipeline:
    """Test the full pipeline with mocked dependencies."""

    @pytest.fixture
    def pipeline(self):
        mock_parser = MagicMock()
        mock_parser.parse_async = AsyncMock(return_value=([ParsedFood("pizza")], {"llm_used": True}))
        mock_safety = MagicMock()
        mock_safety.validate = MagicMock(return_value={"is_safe": True, "risk_level": "none", "blocked_phrases": []})
        return CompanionPipeline(parser=mock_parser, safety=mock_safety)

    @pytest.mark.asyncio
    async def test_run_with_mocked_parser(self, pipeline):
        with patch("src.pipeline.companion_pipeline.db_manager") as mock_db:
            mock_session = AsyncMock()
            mock_db.get_session = MagicMock()
            mock_db.get_session.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_db.get_session.return_value.__aexit__ = AsyncMock(return_value=False)
            mock_db.init_db = MagicMock()

            with patch("src.pipeline.companion_pipeline.FoodService") as MockService:
                mock_service = MagicMock()
                mock_service.search_food_candidates = AsyncMock(return_value=[])
                MockService.return_value = mock_service

                with patch("src.pipeline.companion_pipeline.calculate_food_evidence") as mock_calc:
                    mock_ev = MagicMock()
                    mock_ev.computed = {"carbs_g": 50}
                    mock_ev.confidence = "medium"
                    mock_ev.carb_range_g = (45, 55)
                    mock_ev.top_uncertainty_reason = ""
                    mock_ev.parsed = {"item": "pizza", "quantity": 1}
                    mock_ev.warnings = []
                    mock_ev.portion_uncertainty_pct = 0.1
                    mock_ev.identity_confidence = "high"
                    mock_calc.return_value = mock_ev

                    with patch("src.pipeline.companion_pipeline.combine_food_evidence") as mock_combine:
                        mock_combine.return_value = {
                            "totals": {"carbs_g": 50, "fat_g": 10, "sugars_g": 5, "protein_g": 8, "kcal": 300},
                            "evidence_items": [],
                            "total_carbs_g_range": (45, 55),
                            "confidence_overall": "medium",
                            "top_carb_contributor": "pizza",
                            "top_uncertainty_items": [],
                            "absorption_profile": "standard",
                        }

                        with patch("src.pipeline.companion_pipeline.generate_patient_config") as mock_gen:
                            from app.simulator.schemas import AnchorType
                            mock_config = MagicMock()
                            mock_config.anchor_type = AnchorType.WELL_CONTROLLED
                            mock_config.basal_glucose_mean = 110
                            mock_config.carb_ratio = 15
                            mock_config.insulin_sensitivity = 40
                            mock_config.fat_delay_hours = 3
                            mock_config.exercise_drop_factor = 1.0
                            mock_gen.return_value = mock_config

                            with patch("src.pipeline.companion_pipeline.generate_profile_json") as mock_json:
                                mock_json.return_value = {"anchor_label": "Well Controlled"}

                                with patch("src.pipeline.companion_pipeline.historical_context_for_meal") as mock_hist:
                                    mock_hist.return_value = {"similar_meals_count": 0}

                                    result = await pipeline.run("pizza", use_llm_parse=False)

        assert result["scenario"] == "pizza"
        assert result["parsed_foods"][0]["item"] == "pizza"
        assert result["profile"]["anchor_label"] == "Well Controlled"
        assert "safety" in result
        # Safety middleware returns is_safe + validation_results
        if isinstance(result["safety"], dict):
            # Check that the pipeline completed (not blocked)
            assert result.get("profile", {}).get("anchor_label") == "Well Controlled"

    @pytest.mark.asyncio
    async def test_early_return_no_food_evidence(self, pipeline):
        with patch("src.pipeline.companion_pipeline.db_manager") as mock_db:
            mock_db.init_db = MagicMock()
            mock_db.get_session = MagicMock(side_effect=RuntimeError("no DB"))

            with patch("src.pipeline.companion_pipeline.combine_food_evidence") as mock_combine:
                mock_combine.return_value = {
                    "totals": {"carbs_g": 0},
                    "evidence_items": [],
                    "total_carbs_g_range": (0, 0),
                    "confidence_overall": "low",
                }

                result = await pipeline.run("pizza", use_llm_parse=False)

        assert result.get("database_error") is not None
        assert "Cannot estimate" in result["response"]
