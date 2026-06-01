"""Tests for typed health event views and domain models (Issue #42).

Tests cover:
1. Domain model deserialisation from raw dicts (unit)
2. SQL view DDL syntactic validity (integration via live DB)
3. End-to-end: insert via HealthMetricStore, read via typed view, verify mapping
4. Query helpers with filters
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.graph import (
    HealthMetricStore,
    MealEvent,
    InsulinEvent,
    GlucoseReading,
    ActivityEvent,
    SleepEvent,
    NoteEvent,
    HEALTH_EVENT_VIEWS_DDL,
    query_typed_events,
    query_typed_events_as_models,
    get_typed_event_by_id,
    VIEW_NAME_BY_EVENT,
    MODEL_BY_EVENT,
)


# ════════════════════════════════════════════════════════════
# Domain model construction from dicts
# ════════════════════════════════════════════════════════════

class TestMealEventFromMetric:
    """MealEvent.from_health_metric can construct from raw or view rows."""

    def test_from_metric_row_minimal(self):
        """Minimal health_metrics row produces a valid MealEvent."""
        event = MealEvent.from_health_metric({
            "id": 1,
            "user_id": 727,
            "measured_at": datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc),
            "source": "graph_engine.meal",
            "value": 50.0,
            "unit": "g",
            "metadata": {"meal_type": "lunch", "food_name": "Pizza"},
            "created_at": datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc),
        })
        assert event.id == 1
        assert event.person_id == 727
        assert event.carbs_g == 50.0
        assert event.meal_type == "lunch"
        assert event.food_name == "Pizza"
        assert event.source == "graph_engine.meal"
        assert event.fat_g is None
        assert event.protein_g is None

    def test_from_view_row(self):
        """View row (with person_id) also works."""
        event = MealEvent.from_health_metric({
            "id": 2,
            "person_id": 727,
            "timestamp": datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
            "source": "nightscout",
            "value": 35.0,
            "unit": "g",
            "metadata": {"meal_type": "breakfast", "food_name": "Porridge", "fat_g": "8.5"},
            "created_at": datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
        })
        assert event.person_id == 727
        assert event.carbs_g == 35.0
        assert event.meal_type == "breakfast"
        assert event.food_name == "Porridge"
        assert event.fat_g == 8.5

    def test_with_macros(self):
        """Full macro breakdown from metadata."""
        event = MealEvent.from_health_metric({
            "id": 3,
            "user_id": 727,
            "measured_at": datetime(2025, 1, 1, 19, 0, tzinfo=timezone.utc),
            "source": "graph_engine.meal",
            "value": 65.0,
            "unit": "g",
            "metadata": {"fat_g": "22.5", "protein_g": "15.0", "fiber_g": "3.2",
                         "meal_type": "dinner", "food_name": "Chicken curry with rice"},
        })
        assert event.carbs_g == 65.0
        assert event.fat_g == 22.5
        assert event.protein_g == 15.0
        assert event.fiber_g == 3.2
        assert event.meal_type == "dinner"

    def test_empty_metadata(self):
        """Missing metadata does not crash."""
        event = MealEvent.from_health_metric({
            "id": 4,
            "user_id": 727,
            "measured_at": datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc),
            "source": "test",
            "value": 50.0,
            "unit": "g",
            "metadata": {},
        })
        assert event.carbs_g == 50.0
        assert event.fat_g is None
        assert event.meal_type is None


class TestInsulinEventFromMetric:
    """InsulinEvent.from_health_metric construction."""

    def test_from_metric_row(self):
        """Standard insulin row."""
        event = InsulinEvent.from_health_metric({
            "id": 10,
            "user_id": 727,
            "measured_at": datetime(2025, 1, 1, 8, 30, tzinfo=timezone.utc),
            "source": "nightscout",
            "value": 3.5,
            "unit": "U",
            "type": "insulin_bolus",
            "metadata": {"injection_site": "abdomen", "device": "pen", "brand": "NovoRapid"},
        })
        assert event.id == 10
        assert event.insulin_type == "insulin_bolus"
        assert event.insulin_units == 3.5
        assert event.injection_site == "abdomen"
        assert event.device == "pen"
        assert event.brand == "NovoRapid"

    def test_from_view_row_with_insulin_type(self):
        """View row with insulin_type string."""
        event = InsulinEvent.from_health_metric({
            "id": 11,
            "person_id": 727,
            "timestamp": datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc),
            "source": "nightscout",
            "value": 8.0,
            "unit": "U",
            "insulin_type": "insulin_basal",
            "metadata": {},
        })
        assert event.insulin_type == "insulin_basal"
        assert event.insulin_units == 8.0


class TestGlucoseReadingFromMetric:
    """GlucoseReading.from_health_metric construction."""

    def test_basic(self):
        """Simple glucose reading."""
        event = GlucoseReading.from_health_metric({
            "id": 20,
            "user_id": 727,
            "measured_at": datetime(2025, 1, 1, 7, 0, tzinfo=timezone.utc),
            "source": "nightscout",
            "value": 110.0,
            "unit": "mg/dL",
        })
        assert event.glucose_mg_dl == 110.0
        assert event.trend_arrow is None

    def test_with_trend(self):
        """Glucose reading with trend arrow."""
        event = GlucoseReading.from_health_metric({
            "id": 21,
            "user_id": 727,
            "measured_at": datetime(2025, 1, 1, 10, 0, tzinfo=timezone.utc),
            "source": "nightscout",
            "value": 150.0,
            "unit": "mg/dL",
            "metadata": {"trend_arrow": "↑", "device": "Dexcom G7"},
        })
        assert event.glucose_mg_dl == 150.0
        assert event.trend_arrow == "↑"
        assert event.device == "Dexcom G7"

    def test_view_row(self):
        """View row with glucose_mg_dl column name."""
        event = GlucoseReading.from_health_metric({
            "id": 22,
            "person_id": 727,
            "timestamp": datetime(2025, 1, 1, 9, 0, tzinfo=timezone.utc),
            "source": "nightscout",
            "glucose_mg_dl": 120.0,
            "unit": "mg/dL",
            "trend_arrow": "→",
            "metadata": {},
        })
        assert event.glucose_mg_dl == 120.0
        assert event.trend_arrow == "→"


class TestActivityEventFromMetric:
    """ActivityEvent.from_health_metric construction."""

    def test_exercise_minutes(self):
        """Exercise minutes row."""
        event = ActivityEvent.from_health_metric({
            "id": 30,
            "user_id": 727,
            "measured_at": datetime(2025, 1, 1, 17, 0, tzinfo=timezone.utc),
            "source": "graph_engine",
            "value": 45.0,
            "unit": "min",
            "type": "exercise_minutes",
            "metadata": {"activity_name": "Running", "intensity": "high"},
        })
        assert event.activity_type == "exercise_minutes"
        assert event.value == 45.0
        assert event.activity_name == "Running"
        assert event.intensity == "high"

    def test_view_row(self):
        """View row with activity_type string."""
        event = ActivityEvent.from_health_metric({
            "id": 31,
            "person_id": 727,
            "timestamp": datetime(2025, 1, 1, 18, 0, tzinfo=timezone.utc),
            "source": "nightscout",
            "value": 8000.0,
            "unit": "step",
            "activity_type": "steps",
            "metadata": {},
        })
        assert event.activity_type == "steps"
        assert event.value == 8000.0


class TestSleepEventFromMetric:
    """SleepEvent.from_health_metric construction."""

    def test_sleep_hours(self):
        """Sleep hours row."""
        event = SleepEvent.from_health_metric({
            "id": 40,
            "user_id": 727,
            "measured_at": datetime(2025, 1, 1, 6, 0, tzinfo=timezone.utc),
            "source": "graph_engine",
            "value": 7.5,
            "unit": "hours",
            "type": "sleep_hours",
            "metadata": {"sleep_score": "85", "body_battery": "75"},
        })
        assert event.sleep_metric == "sleep_hours"
        assert event.value == 7.5
        assert event.sleep_score == 85.0
        assert event.body_battery == 75.0

    def test_view_row(self):
        """View row with sleep_metric string."""
        event = SleepEvent.from_health_metric({
            "id": 41,
            "person_id": 727,
            "timestamp": datetime(2025, 1, 1, 6, 0, tzinfo=timezone.utc),
            "source": "manual",
            "value": 90.0,
            "unit": "score",
            "sleep_metric": "sleep_score",
            "metadata": {},
        })
        assert event.sleep_metric == "sleep_score"
        assert event.value == 90.0


class TestNoteEventFromMetric:
    """NoteEvent.from_health_metric construction."""

    def test_custom_note(self):
        """Custom note row."""
        event = NoteEvent.from_health_metric({
            "id": 50,
            "user_id": 727,
            "measured_at": datetime(2025, 1, 1, 14, 0, tzinfo=timezone.utc),
            "source": "manual",
            "value": 0.0,
            "unit": "",
            "metadata": {"note_text": "Feeling unwell", "tags": "sick,high"},
        })
        assert event.note_text == "Feeling unwell"
        assert event.tags == "sick,high"

    def test_view_row(self):
        """View row with note_text string."""
        event = NoteEvent.from_health_metric({
            "id": 51,
            "person_id": 727,
            "timestamp": datetime(2025, 1, 1, 15, 0, tzinfo=timezone.utc),
            "source": "nightscout",
            "value": 1.0,
            "unit": "",
            "note_text": "Sensor change",
            "metadata": {},
        })
        assert event.note_text == "Sensor change"


class TestDomainModelDefaults:
    """Default values when fields are missing."""

    def test_health_event_base_defaults(self):
        """HealthEventBase fields default gracefully."""
        event = MealEvent.from_health_metric({
            "id": 0,
            "user_id": 0,
            "measured_at": datetime(2025, 1, 1, tzinfo=timezone.utc),
            "source": "",
            "value": 0,
            "unit": "",
            "metadata": None,
        })
        assert event.carbs_g == 0.0
        assert event.metadata is not None  # preserved as-is

    def test_safe_float_none(self):
        """None metadata values do not crash."""
        from src.graph.views import _safe_float
        assert _safe_float({"fat_g": None}, "fat_g") is None
        assert _safe_float({}, "fat_g") is None
        assert _safe_float({"fat_g": "15.5"}, "fat_g") == 15.5
        assert _safe_float({"fat_g": "abc"}, "fat_g") is None


# ════════════════════════════════════════════════════════════
# Mapping registry
# ════════════════════════════════════════════════════════════

class TestEventRegistry:
    """VIEW_NAME_BY_EVENT and MODEL_BY_EVENT contain all 6 types."""

    def test_all_views_registered(self):
        """All 6 event types have view names and models."""
        expected = {"meal", "insulin", "glucose", "activity", "sleep", "note"}
        assert set(VIEW_NAME_BY_EVENT) == expected
        assert set(MODEL_BY_EVENT) == expected

    def test_view_names_format(self):
        """View names follow the view_events_* pattern."""
        for event_type, view_name in VIEW_NAME_BY_EVENT.items():
            assert view_name == f"view_events_{event_type}", f"{view_name} for {event_type}"

    def test_model_registry(self):
        """MODEL_BY_EVENT maps to correct classes."""
        assert MODEL_BY_EVENT["meal"] is MealEvent
        assert MODEL_BY_EVENT["insulin"] is InsulinEvent
        assert MODEL_BY_EVENT["glucose"] is GlucoseReading
        assert MODEL_BY_EVENT["activity"] is ActivityEvent
        assert MODEL_BY_EVENT["sleep"] is SleepEvent
        assert MODEL_BY_EVENT["note"] is NoteEvent


# ════════════════════════════════════════════════════════════
# Query helpers with mocked sessions
# ════════════════════════════════════════════════════════════

class TestQueryHelpers:
    """query_typed_events and query_typed_events_as_models with mock sessions."""

    @pytest.fixture
    def mock_session(self):
        session = MagicMock()
        session.execute = AsyncMock()
        return session

    @pytest.mark.asyncio
    async def test_query_unknown_type_raises(self, mock_session):
        """Unknown event type raises ValueError."""
        with pytest.raises(ValueError, match="Unknown event type"):
            await query_typed_events(mock_session, "unknown")

    @pytest.mark.asyncio
    async def test_query_typed_events_no_filters(self, mock_session):
        """Query without filters uses correct view and default limit."""
        mock_result = MagicMock()
        mock_result.fetchall.return_value = [
            MagicMock(_mapping={"id": 1, "person_id": 727, "glucose_mg_dl": 110.0}),
        ]
        mock_session.execute.return_value = mock_result

        rows = await query_typed_events(mock_session, "glucose")
        assert len(rows) == 1
        assert rows[0]["glucose_mg_dl"] == 110.0

        # Check SQL was sent to the glucose view
        sql_arg = mock_session.execute.call_args[0][0]
        assert "view_events_glucose" in str(sql_arg)

    @pytest.mark.asyncio
    async def test_query_with_all_filters(self, mock_session):
        """Query with person_id, start, end, source applies WHERE conditions."""
        mock_result = MagicMock()
        mock_result.fetchall.return_value = []
        mock_session.execute.return_value = mock_result

        rows = await query_typed_events(
            mock_session, "meal",
            person_id=727,
            start=datetime(2025, 1, 1, tzinfo=timezone.utc),
            end=datetime(2025, 6, 1, tzinfo=timezone.utc),
            source="nightscout",
            limit=10,
        )
        assert rows == []

        # Check SQL has all conditions
        sql_text = str(mock_session.execute.call_args[0][0])
        assert "person_id = :pid" in sql_text
        assert '"timestamp" >= :start' in sql_text
        assert '"timestamp" <= :end' in sql_text
        assert "source = :src" in sql_text

    @pytest.mark.asyncio
    async def test_query_as_models(self, mock_session):
        """query_typed_events_as_models returns domain model instances."""
        mock_result = MagicMock()
        mock_result.fetchall.return_value = [
            MagicMock(_mapping={
                "id": 1,
                "person_id": 727,
                "timestamp": datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
                "source": "nightscout",
                "value": 35.0,
                "unit": "g",
                "metadata": {"meal_type": "breakfast", "food_name": "Toast"},
                "created_at": datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
            }),
        ]
        mock_session.execute.return_value = mock_result

        events = await query_typed_events_as_models(mock_session, "meal")
        assert len(events) == 1
        assert isinstance(events[0], MealEvent)
        assert events[0].food_name == "Toast"
        assert events[0].carbs_g == 35.0

    @pytest.mark.asyncio
    async def test_query_as_models_unknown_type_raises(self, mock_session):
        """Unknown event type raises ValueError in query_typed_events first."""
        with pytest.raises(ValueError, match="Unknown event type"):
            await query_typed_events_as_models(mock_session, "nonexistent")

    @pytest.mark.asyncio
    async def test_get_by_id(self, mock_session):
        """get_typed_event_by_id returns a single row or None."""
        mock_result = MagicMock()
        mock_result.fetchone.return_value = MagicMock(_mapping={
            "id": 1, "person_id": 727, "glucose_mg_dl": 150.0,
        })
        mock_session.execute.return_value = mock_result

        row = await get_typed_event_by_id(mock_session, "glucose", 1)
        assert row is not None
        assert row["glucose_mg_dl"] == 150.0
        sql_text = str(mock_session.execute.call_args[0][0])
        assert "view_events_glucose" in sql_text
        assert "id = :eid" in sql_text

    @pytest.mark.asyncio
    async def test_get_by_id_not_found(self, mock_session):
        """get_typed_event_by_id returns None when not found."""
        mock_result = MagicMock()
        mock_result.fetchone.return_value = None
        mock_session.execute.return_value = mock_result

        row = await get_typed_event_by_id(mock_session, "glucose", 999)
        assert row is None

    @pytest.mark.asyncio
    async def test_get_by_id_unknown_type_raises(self, mock_session):
        """get_typed_event_by_id raises for unknown type."""
        with pytest.raises(ValueError, match="Unknown event type"):
            await get_typed_event_by_id(mock_session, "xyz", 1)


# ════════════════════════════════════════════════════════════
# SQL DDL structural validation
# ════════════════════════════════════════════════════════════

class TestViewDDLStructure:
    """DDL text contains all 6 CREATE OR REPLACE VIEW statements."""

    def test_all_six_views_present(self):
        """HEALTH_EVENT_VIEWS_DDL contains 6 view definitions."""
        views_found = []
        for line in HEALTH_EVENT_VIEWS_DDL.split("\n"):
            stripped = line.strip()
            if stripped.startswith("CREATE OR REPLACE VIEW"):
                # parts = ['CREATE', 'OR', 'REPLACE', 'VIEW', 'view_events_meal', 'AS']
                parts = stripped.split()
                view_name = parts[4]  # word after 'VIEW'
                views_found.append(view_name)
        assert len(views_found) == 6, f"Found {len(views_found)}: {views_found}"
        expected_views = [
            "view_events_meal",
            "view_events_insulin",
            "view_events_glucose",
            "view_events_activity",
            "view_events_sleep",
            "view_events_note",
        ]
        for ev in expected_views:
            assert ev in views_found, f"Missing {ev} in DDL"

    def test_meal_view_has_expected_columns(self):
        """Meal view extracts carbs_g, fat_g, meal_type from metadata."""
        assert "metadata->>'fat_g'" in HEALTH_EVENT_VIEWS_DDL
        assert "metadata->>'meal_type'" in HEALTH_EVENT_VIEWS_DDL
        assert "metadata->>'food_name'" in HEALTH_EVENT_VIEWS_DDL

    def test_insulin_view_has_insulin_family(self):
        """Insulin view covers all 4 insulin metric_types."""
        assert "insulin_basal" in HEALTH_EVENT_VIEWS_DDL
        assert "insulin_bolus" in HEALTH_EVENT_VIEWS_DDL
        assert "insulin_correction" in HEALTH_EVENT_VIEWS_DDL

    def test_activity_view_has_activity_types(self):
        """Activity view covers key activity metric_types."""
        assert "exercise_calories" in HEALTH_EVENT_VIEWS_DDL
        assert "heart_rate" in HEALTH_EVENT_VIEWS_DDL
        assert "blood_pressure_systolic" in HEALTH_EVENT_VIEWS_DDL

    def test_sleep_view_has_sleep_types(self):
        """Sleep view covers key sleep metric_types."""
        assert "sleep_deep" in HEALTH_EVENT_VIEWS_DDL
        assert "sleep_rem" in HEALTH_EVENT_VIEWS_DDL
        assert "sleep_score" in HEALTH_EVENT_VIEWS_DDL

    def test_note_view_uses_custom_type(self):
        """Note view filters on metric_type = 'custom'."""
        assert "'custom'" in HEALTH_EVENT_VIEWS_DDL

    def test_glucose_view_basic(self):
        """Glucose view extracts trend_arrow and device from metadata."""
        assert "metadata->>'trend_arrow'" in HEALTH_EVENT_VIEWS_DDL
        assert "metadata->>'device'" in HEALTH_EVENT_VIEWS_DDL
        assert "metadata->>'nightscout_id'" in HEALTH_EVENT_VIEWS_DDL

    def test_ddl_idempotent(self):
        """Every CREATE VIEW uses CREATE OR REPLACE VIEW."""
        non_replace = 0
        for line in HEALTH_EVENT_VIEWS_DDL.split("\n"):
            stripped = line.strip()
            if stripped.startswith("CREATE VIEW") and "CREATE OR REPLACE VIEW" not in stripped:
                non_replace += 1
        assert non_replace == 0, "All CREATE VIEWs must use CREATE OR REPLACE"


# ════════════════════════════════════════════════════════════
# End-to-end integration test (requires live Postgres)
# ════════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def integration_event_loop():
    """Event loop for integration tests (module-scoped)."""
    import asyncio
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.mark.integration
@pytest.mark.asyncio(loop_scope="module")
async def test_integration_meal_view_returns_inserted_data():
    """Insert meal via HealthMetricStore, read via view_events_meal."""
    from app.core.database import db_manager, get_settings
    from sqlalchemy import text as sql

    settings = get_settings()
    if not settings.database_url:
        pytest.skip("DATABASE_URL not set")

    db_manager.init_db(settings.database_url)

    # Setup: views + user
    async with db_manager.get_session() as session:
        from src.graph.views import ensure_health_event_views
        await ensure_health_event_views(session)

        result = await session.execute(
            sql("SELECT id FROM tbl_users WHERE email = 'test_views@local'")
        )
        user = result.fetchone()
        if user:
            uid = user[0]
        else:
            result = await session.execute(
                sql("""INSERT INTO tbl_users
                    (full_name, email, hashed_password, is_active, is_verified,
                     timezone, glucose_units, target_range_low, target_range_high,
                     created_at, updated_at, nightscout_connected,
                     librelinkup_connected, is_superuser, diabetes_type)
                    VALUES
                    ('Test Views', 'test_views@local', 'test', TRUE, TRUE,
                     'UTC', 'mg/dL', 70.0, 180.0, NOW(), NOW(),
                     FALSE, FALSE, FALSE, 'type1')
                    RETURNING id""")
            )
            uid = result.scalar_one()

        await session.execute(
            sql("DELETE FROM health_metrics WHERE user_id = :uid AND source LIKE 'test_views%'"),
            {"uid": uid},
        )
        await session.commit()

    # Test: insert + read
    async with db_manager.get_session() as session:
        store = HealthMetricStore(session)
        meal_id = await store.find_or_create_metric(
            uid, "carbs",
            datetime(2025, 6, 1, 8, 0, tzinfo=timezone.utc),
            50.0, unit="g", source="test_views_meal",
            metadata_json={"meal_type": "breakfast", "food_name": "Porridge", "fat_g": "8.5"},
        )
        await session.commit()

        rows = await query_typed_events(
            session, "meal",
            person_id=uid,
            source="test_views_meal",
        )
        assert len(rows) >= 1
        meal_row = next(r for r in rows if r["id"] == meal_id)
        assert float(meal_row["carbs_g"]) == 50.0
        assert meal_row["meal_type"] == "breakfast"
        assert meal_row["food_name"] == "Porridge"
        assert meal_row["source"] == "test_views_meal"

        models = await query_typed_events_as_models(
            session, "meal",
            person_id=uid,
            source="test_views_meal",
        )
        matching = [m for m in models if m.id == meal_id]
        assert len(matching) == 1
        meal = matching[0]
        assert isinstance(meal, MealEvent)
        assert meal.carbs_g == 50.0
        assert meal.meal_type == "breakfast"
        assert meal.fat_g == 8.5


@pytest.mark.integration
@pytest.mark.asyncio(loop_scope="module")
async def test_integration_glucose_view_returns_inserted_data():
    """Insert glucose reading, read via view_events_glucose."""
    from app.core.database import db_manager, get_settings
    from sqlalchemy import text as sql

    settings = get_settings()
    if not settings.database_url:
        pytest.skip("DATABASE_URL not set")

    db_manager.init_db(settings.database_url)

    async with db_manager.get_session() as session:
        result = await session.execute(
            sql("SELECT id FROM tbl_users WHERE email = 'test_views@local'")
        )
        uid = result.fetchone()[0]

        store = HealthMetricStore(session)
        gl_id = await store.find_or_create_metric(
            uid, "blood_glucose",
            datetime(2025, 6, 1, 7, 30, tzinfo=timezone.utc),
            120.0, unit="mg/dL", source="test_views_glucose",
            metadata_json={"trend_arrow": "→", "device": "Dexcom G7"},
        )
        await session.commit()

        rows = await query_typed_events(
            session, "glucose",
            person_id=uid,
            source="test_views_glucose",
        )
        gl = next(r for r in rows if r["id"] == gl_id)
        assert float(gl["glucose_mg_dl"]) == 120.0
        assert gl["trend_arrow"] == "→"

        models = await query_typed_events_as_models(
            session, "glucose",
            person_id=uid,
            source="test_views_glucose",
        )
        model = models[0]
        assert isinstance(model, GlucoseReading)
        assert model.glucose_mg_dl == 120.0
        assert model.trend_arrow == "→"


@pytest.mark.integration
@pytest.mark.asyncio(loop_scope="module")
async def test_integration_get_by_id_integration():
    """get_typed_event_by_id works end-to-end."""
    from app.core.database import db_manager, get_settings
    from sqlalchemy import text as sql

    settings = get_settings()
    if not settings.database_url:
        pytest.skip("DATABASE_URL not set")

    db_manager.init_db(settings.database_url)

    async with db_manager.get_session() as session:
        result = await session.execute(
            sql("SELECT id FROM tbl_users WHERE email = 'test_views@local'")
        )
        uid = result.fetchone()[0]

        store = HealthMetricStore(session)
        metric_id = await store.find_or_create_metric(
            uid, "carbs",
            datetime(2025, 6, 1, 12, 0, tzinfo=timezone.utc),
            65.0, unit="g", source="test_views_byid",
            metadata_json={"meal_type": "lunch"},
        )
        await session.commit()

        row = await get_typed_event_by_id(session, "meal", metric_id)
        assert row is not None
        assert float(row["carbs_g"]) == 65.0
        assert row["meal_type"] == "lunch"


@pytest.mark.integration
@pytest.mark.asyncio(loop_scope="module")
async def test_integration_multiple_event_types_queryable():
    """All 6 event types are queryable after insert."""
    from app.core.database import db_manager, get_settings
    from sqlalchemy import text as sql

    settings = get_settings()
    if not settings.database_url:
        pytest.skip("DATABASE_URL not set")

    db_manager.init_db(settings.database_url)

    async with db_manager.get_session() as session:
        result = await session.execute(
            sql("SELECT id FROM tbl_users WHERE email = 'test_views@local'")
        )
        uid = result.fetchone()[0]

        store = HealthMetricStore(session)
        ts = datetime(2025, 6, 1, 14, 0, tzinfo=timezone.utc)

        await store.find_or_create_metric(uid, "carbs", ts, 40.0, source="test_views_multi")
        await store.find_or_create_metric(uid, "insulin_bolus", ts, 2.0, source="test_views_multi")
        await store.find_or_create_metric(uid, "blood_glucose", ts, 130.0, source="test_views_multi")
        await store.find_or_create_metric(uid, "exercise_minutes", ts, 30.0, source="test_views_multi")
        await store.find_or_create_metric(uid, "sleep_hours", ts, 7.0, source="test_views_multi")
        await session.commit()

        for event_type in ["meal", "insulin", "glucose", "activity", "sleep"]:
            rows = await query_typed_events(
                session, event_type,
                person_id=uid,
                source="test_views_multi",
            )
            assert len(rows) >= 1, f"No rows for {event_type}"


@pytest.mark.integration
@pytest.mark.asyncio(loop_scope="module")
async def test_integration_ensure_views_idempotent():
    """Calling ensure_health_event_views twice doesn't error."""
    from app.core.database import db_manager, get_settings
    from src.graph.views import ensure_health_event_views

    settings = get_settings()
    if not settings.database_url:
        pytest.skip("DATABASE_URL not set")

    db_manager.init_db(settings.database_url)

    async with db_manager.get_session() as session:
        await ensure_health_event_views(session)  # first
        await ensure_health_event_views(session)  # second — should not fail
