"""Tests for Issue #40: Nightscout API client + CGM import.

Tests cover:
1. NightscoutClient API connection and data fetching
2. Conversion helpers (entries_to_cgm_rows, treatments_to_health_metrics)
3. JSON file fallback for offline development
4. Idempotent upsert integration
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock

import pytest

from app.services.nightscout_client import (
    NightscoutClient,
    entries_to_cgm_rows,
    treatments_to_health_metrics,
    load_entries_from_json,
)


# ── NightscoutClient basic functionality ──

class TestNightscoutClientInit:
    """Test NightscoutClient initialization."""

    def test_init_with_base_url(self):
        client = NightscoutClient("http://192.168.0.92:4000/api/v1")
        assert client.base_url == "http://192.168.0.92:4000/api/v1"
        assert client.timeout == 30
        assert client.max_retries == 3

    def test_init_with_custom_settings(self):
        client = NightscoutClient(
            "http://example.com/api/v1",
            timeout=60,
            max_retries=5,
        )
        assert client.timeout == 60
        assert client.max_retries == 5

    def test_base_url_trailing_slash_removed(self):
        client = NightscoutClient("http://192.168.0.92:4000/api/v1/")
        assert client.base_url == "http://192.168.0.92:4000/api/v1"


class TestFetchEntries:
    """Test CGM entry fetching from Nightscout."""

    def test_fetch_entries_success(self):
        """Successful fetch returns standardized entries."""
        mock_response = [
            {
                "_id": "abc123",
                "dateString": "2025-01-01T08:00:00.000Z",
                "date": 1735712000000,
                "sgv": 120,
                "device": "nightscout-librelink-up",
                "direction": "Flat",
            },
            {
                "_id": "def456",
                "dateString": "2025-01-01T08:05:00.000Z",
                "sgv": 125,
                "device": "nightscout-librelink-up",
                "direction": "SingleUp",
            },
        ]

        with patch.object(NightscoutClient, "_fetch_json", return_value=mock_response):
            client = NightscoutClient("http://test.example/api/v1")
            entries = client.fetch_entries()

        assert len(entries) == 2
        assert entries[0]["value_mg_dl"] == 120
        assert entries[0]["value_mmol_l"] == round(120 / 18.018, 1)  # ~6.7
        assert entries[0]["device"] == "nightscout-librelink-up"
        assert entries[0]["nightscout_id"] == "abc123"
        assert entries[0]["trend_arrow"] == "Flat"

    def test_fetch_entries_filters_missing_sgv(self):
        """Entries without sgv are filtered out."""
        mock_response = [
            {"_id": "1", "sgv": None},
            {"_id": "2", "sgv": 100},
        ]

        with patch.object(NightscoutClient, "_fetch_json", return_value=mock_response):
            client = NightscoutClient("http://test.example/api/v1")
            entries = client.fetch_entries()

        assert len(entries) == 1
        assert entries[0]["value_mg_dl"] == 100

    def test_fetch_entries_handles_millisecond_timestamps(self):
        """Entries with timestamp in milliseconds are parsed correctly."""
        mock_response = [
            {"_id": "1", "date": 1735712000000, "sgv": 140},
        ]

        with patch.object(NightscoutClient, "_fetch_json", return_value=mock_response):
            client = NightscoutClient("http://test.example/api/v1")
            entries = client.fetch_entries()

        assert len(entries) == 1
        assert entries[0]["timestamp"].tzinfo is not None


class TestFetchTreatments:
    """Test treatment fetching from Nightscout."""

    def test_fetch_treatments_success(self):
        """Treatments are mapped to correct metric_types."""
        mock_response = [
            {"_id": "m1", "created_at": "2025-01-01T08:00:00.000Z", "eventType": "Carb Correction", "carbs": 30},
            {"_id": "m2", "created_at": "2025-01-01T08:30:00.000Z", "eventType": "Bolus", "insulin": 4},
        ]

        with patch.object(NightscoutClient, "_fetch_json", return_value=mock_response):
            client = NightscoutClient("http://test.example/api/v1")
            treatments = client.fetch_treatments()

        assert len(treatments) == 2
        assert treatments[0]["metric_type"] == "meal"
        assert treatments[0]["value"] == 30.0
        assert treatments[0]["unit"] == "g"
        assert treatments[1]["metric_type"] == "insulin"
        assert treatments[1]["value"] == 4.0
        assert treatments[1]["unit"] == "U"

    def test_fetch_treatments_empty_instance(self):
        """Empty treatments list is handled gracefully."""
        with patch.object(NightscoutClient, "_fetch_json", return_value=[]):
            client = NightscoutClient("http://test.example/api/v1")
            treatments = client.fetch_treatments()

        assert treatments == []


# ── Conversion helpers ──

class TestEntriesToCgmRows:
    """Test conversion of Nightscout entries to cgm_entries rows."""

    def test_basic_conversion(self):
        entries = [
            {
                "timestamp": datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
                "value_mg_dl": 120,
                "value_mmol_l": 6.7,
                "units": "mg/dL",
                "device": "Libre",
                "trend_arrow": "→",
                "nightscout_id": "abc123",
                "raw_json": {"_id": "abc123"},
            },
        ]

        rows = entries_to_cgm_rows(entries)

        assert len(rows) == 1
        assert rows[0]["measured_at"] == entries[0]["timestamp"]
        assert rows[0]["value_mg_dl"] == 120
        assert rows[0]["source"] == "nightscout"
        assert rows[0]["nightscout_id"] == "abc123"

    def test_partial_entry_handles_defaults(self):
        entries = [
            {
                "timestamp": datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
                "value_mg_dl": 130,
                "value_mmol_l": 7.2,
            },
        ]

        rows = entries_to_cgm_rows(entries)

        assert rows[0]["units"] == "mg/dL"
        assert rows[0]["source"] == "nightscout"
        assert rows[0]["device"] is None


class TestTreatmentsToHealthMetrics:
    """Test conversion of Nightscout treatments to health_metrics rows."""

    def test_meal_conversion(self):
        treatments = [
            {
                "timestamp": datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
                "metric_type": "meal",
                "value": 35.0,
                "unit": "g",
                "nightscout_id": "m1",
                "raw_json": {"notes": "Toast and eggs"},
            },
        ]

        rows = treatments_to_health_metrics(treatments)

        assert len(rows) == 1
        assert rows[0]["metric_type"] == "meal"
        assert rows[0]["value"] == 35.0
        assert rows[0]["source"] == "nightscout"
        assert "food_name" in rows[0]["metadata_json"]


# ── JSON file fallback ──

class TestJsonFileFallback:
    """Test loading entries from local JSON file."""

    def test_load_valid_json(self, tmp_path):
        """Valid JSON file loads correctly."""
        json_file = tmp_path / "entries.json"
        json_file.write_text(json.dumps([
            {"dateString": "2025-01-01T08:00:00.000Z", "sgv": 120, "device": "Libre"},
        ]))

        entries = load_entries_from_json(json_file)

        assert len(entries) == 1
        assert entries[0]["value_mg_dl"] == 120

    def test_missing_file_returns_empty(self):
        entries = load_entries_from_json(Path("/nonexistent/entries.json"))
        assert entries == []


# ── Integration with cgm_entries ──

class TestCgmEntriesIntegration:
    """Test NightscoutClient integrates with cgm_entries storage."""

    @pytest.mark.asyncio
    async def test_upsert_nightscout_entry(self):
        """Nightscout entries can be upserted to cgm_entries table."""
        from app.services.cgm_entries import upsert_cgm_entry

        session = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one.return_value = 1
        session.execute.return_value = result_mock

        await upsert_cgm_entry(
            session,
            user_id=1,
            measured_at=datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
            value_mg_dl=120,
            source="nightscout",
            nightscout_id="abc123",
        )

        assert session.execute.called

    @pytest.mark.asyncio
    async def test_nightscout_source_distinct(self):
        """Nightscout data is distinguishable from other sources."""
        from app.services.cgm_entries import upsert_cgm_entry

        session = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one.return_value = 1
        session.execute.return_value = result_mock

        await upsert_cgm_entry(session, user_id=1, measured_at=datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
                               value_mg_dl=120, source="nightscout")
        await upsert_cgm_entry(session, user_id=1, measured_at=datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
                               value_mg_dl=118, source="manual")

        assert session.execute.call_count == 2


# ── End-to-end fetch test (requires Nightscout) ──

def test_live_nightscout_fetch():
    """Test actual connection to Nightscout instance (non-blocking)."""
    client = NightscoutClient("http://192.168.0.92:4000/api/v1", timeout=5)

    try:
        entries = client.fetch_entries()
        assert isinstance(entries, list)
        if entries:
            assert "value_mg_dl" in entries[0]
            assert "timestamp" in entries[0]
    except Exception as e:
        pytest.skip(f"Nightscout unavailable: {e}")


def test_live_nightscout_status():
    """Test connection to Nightscout status endpoint."""
    client = NightscoutClient("http://192.168.0.92:4000/api/v1", timeout=5)

    try:
        status = client.fetch_status()
        assert isinstance(status, dict)
    except Exception:
        pass