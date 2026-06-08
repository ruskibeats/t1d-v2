"""Nightscout API client for T1D Companion v2.

Issue #40: Nightscout API client + literal CGM/treatment import into health_metrics.

A read-only client that fetches CGM entries and treatments from a Nightscout instance,
storing them in the local cgm_entries table with idempotent upserts.

Design:
- Entries -> metric_type = 'blood_glucose' with SGV value, device, direction
- Treatments -> metric_type based on eventType: 'meal', 'insulin', 'exercise', 'note'
- Idempotent via find_or_create_metric (health_metrics)
- Supports local JSON file fallback for offline development
- Never writes to Nightscout (read-only)
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import urllib.request
import urllib.error

logger = logging.getLogger(__name__)

# Nightscout API endpoints
ENDPOINT_ENTRIES = "entries.json"
ENDPOINT_TREATMENTS = "treatments.json"
ENDPOINT_PROFILE = "profile.json"
ENDPOINT_STATUS = "status.json"


# ── NightscoutClient ──

class NightscoutClient:
    """Async Nightscout API client for CGM and treatment data.

    Fetches data from Nightscout API and provides it in a format suitable for
    import into the local health_metrics table.

    All methods are synchronous for now - async support can be added later.
    """

    def __init__(self, base_url: str, timeout: int = 30, max_retries: int = 3):
        """Initialize the Nightscout client.

        Args:
            base_url: Nightscout API base URL (e.g., 'http://192.168.0.92:4000/api/v1')
            timeout: Request timeout in seconds
            max_retries: Number of retries for failed requests
        """
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries

    def _make_url(self, endpoint: str, count: int = 1000, skip: int | None = None) -> str:
        """Build full URL with query parameters."""
        url = f"{self.base_url}/{endpoint}"
        if "?" not in url:
            url += f"?count={count}"
        else:
            url += f"&count={count}"
        if skip is not None:
            url += f"&skip={skip}"
        return url

    def _fetch_json(self, url: str) -> list[dict[str, Any]]:
        """Fetch JSON from Nightscout API with retry logic."""
        for attempt in range(self.max_retries):
            try:
                req = urllib.request.Request(url, headers={"Accept": "application/json"})
                with urllib.request.urlopen(req, timeout=self.timeout) as response:
                    data = json.loads(response.read().decode("utf-8"))
                    return data if isinstance(data, list) else []
            except urllib.error.URLError as e:
                logger.warning(f"Nightscout fetch attempt {attempt + 1} failed: {e}")
                if attempt == self.max_retries - 1:
                    raise
            except json.JSONDecodeError as e:
                logger.error(f"Nightscout JSON decode error: {e}")
                return []
        return []

    def fetch_entries(self, days: int = 90) -> list[dict[str, Any]]:
        """Fetch CGM entries from Nightscout.

        Args:
            days: Number of days of history to fetch (default 90)

        Returns:
            List of entry dicts with standardised keys:
            - timestamp: datetime
            - value_mg_dl: int
            - value_mmol_l: float (converted from mg/dL)
            - device: str
            - trend_arrow: str
            - nightscout_id: str (original _id)
        """
        all_entries = []
        count = 1000  # Max per request

        # Fetch all entries - Nightscout returns them sorted by date
        url = self._make_url(ENDPOINT_ENTRIES, count=days * 288)  # ~288 readings per day at 5-min cadence
        raw_entries = self._fetch_json(url)

        for entry in raw_entries:
            if not entry.get("sgv"):
                continue

            # Parse timestamp
            ts_str = entry.get("dateString")
            if not ts_str:
                # Convert milliseconds since epoch
                ts_ms = entry.get("date") or entry.get("mills") or 0
                ts = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
            else:
                ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))

            # Convert mg/dL to mmol/L
            sgv = int(entry.get("sgv", 0))
            mmol_l = round(sgv / 18.018, 1)

            all_entries.append({
                "timestamp": ts,
                "value_mg_dl": sgv,
                "value_mmol_l": mmol_l,
                "units": "mg/dL",
                "device": entry.get("device", "unknown"),
                "trend_arrow": entry.get("direction", "→"),
                "nightscout_id": entry.get("_id", ""),
                "raw_json": entry,
            })

        logger.info(f"Fetched {len(all_entries)} CGM entries from Nightscout")
        return all_entries

    def fetch_treatments(self, days: int = 90) -> list[dict[str, Any]]:
        """Fetch treatments from Nightscout.

        Note: LibreLinkUp Nightscout instances may have empty treatments.

        Args:
            days: Number of days of history to fetch

        Returns:
            List of treatment dicts with:
            - timestamp: datetime
            - metric_type: 'meal', 'insulin', 'exercise', or 'note'
            - value: carb grams or insulin units
            - unit: 'g' or 'U'
            - nightscout_id: str (original _id)
            - raw_json: original entry
        """
        raw_treatments = self._fetch_json(self._make_url(ENDPOINT_TREATMENTS, count=days * 10))
        treatments = []

        for tx in raw_treatments:
            ts_str = tx.get("created_at") or tx.get("dateString")
            if not ts_str:
                ts_ms = tx.get("mills") or tx.get("date") or 0
                ts = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
            else:
                ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))

            event_type = tx.get("eventType", "")
            event_group = tx.get("eventGroup", "")

            # Map to metric_type - use field presence as primary signal
            has_carbs = "carbs" in tx and tx["carbs"]
            has_insulin = "insulin" in tx and tx["insulin"]

            if has_insulin and not has_carbs:
                metric_type = "insulin"
                value = float(tx.get("insulin", 0))
                unit = "U"
            elif has_carbs:
                metric_type = "meal"
                value = float(tx.get("carbs", 0))
                unit = "g"
            elif "Exercise" in event_type or "activity" in event_group.lower():
                metric_type = "exercise"
                value = float(tx.get("duration", tx.get("minutes", 0)))
                unit = "min"
            else:
                metric_type = "note"
                value = 0.0
                unit = ""

            treatments.append({
                "timestamp": ts,
                "metric_type": metric_type,
                "value": value,
                "unit": unit,
                "nightscout_id": tx.get("_id", ""),
                "raw_json": tx,
            })

        logger.info(f"Fetched {len(treatments)} treatments from Nightscout")
        return treatments

    def fetch_status(self) -> dict[str, Any]:
        """Fetch Nightscout status for connectivity check."""
        try:
            status = self._fetch_json(self._make_url(ENDPOINT_STATUS))
            return status if isinstance(status, dict) else {}
        except Exception as e:
            logger.error(f"Failed to fetch Nightscout status: {e}")
            return {}


# ── Import helpers ──

def entries_to_cgm_rows(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Convert Nightscout entries to cgm_entries-compatible rows.

    Args:
        entries: List from NightscoutClient.fetch_entries()

    Returns:
        List of rows for upsert_cgm_entry()
    """
    return [
        {
            "measured_at": e["timestamp"],
            "value_mg_dl": e["value_mg_dl"],
            "value_mmol_l": e.get("value_mmol_l"),
            "units": e.get("units", "mg/dL"),
            "source": "nightscout",
            "device": e.get("device"),
            "nightscout_id": e.get("nightscout_id"),
            "metadata": {"trend_arrow": e.get("trend_arrow", "→"), "raw": e.get("raw_json", {})},
        }
        for e in entries
    ]


def treatments_to_health_metrics(treatments: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Convert Nightscout treatments to health_metrics-compatible rows.

    Args:
        treatments: List from NightscoutClient.fetch_treatments()

    Returns:
        List of rows for HealthMetricStore.find_or_create_metric()
    """
    rows = []
    for t in treatments:
        metric_type = t["metric_type"]
        metadata: dict[str, Any] = {"raw": t.get("raw_json", {})}

        if metric_type == "meal":
            metadata["meal_type"] = "unknown"
            metadata["food_name"] = t.get("raw_json", {}).get("notes", "Unknown")
            metadata["fat_g"] = t.get("raw_json", {}).get("fat", 0) or 0
            metadata["protein_g"] = t.get("raw_json", {}).get("protein", 0) or 0

        rows.append({
            "metric_type": metric_type,
            "measured_at": t["timestamp"],
            "value": t["value"],
            "unit": t["unit"],
            "source": "nightscout",
            "nightscout_id": t.get("nightscout_id"),
            "metadata_json": metadata,
        })
    return rows


# ── JSON file fallback ──

def load_entries_from_json(json_path: Path) -> list[dict[str, Any]]:
    """Load CGM entries from a local JSON file.

    Used for dev/testing when Nightscout API is unavailable.

    Expected format: Nightscout entries.json format (list of entries with sgv, dateString)
    """
    if not json_path.exists():
        logger.warning(f"JSON file not found: {json_path}")
        return []

    data = json.loads(json_path.read_text())
    entries = []

    for entry in data:
        if not entry.get("sgv"):
            continue

        ts_str = entry.get("dateString", "")
        ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00")) if ts_str else datetime.now(tz=timezone.utc)
        sgv = int(entry.get("sgv", 0))

        entries.append({
            "timestamp": ts,
            "value_mg_dl": sgv,
            "value_mmol_l": round(sgv / 18.018, 1),
            "units": "mg/dL",
            "device": entry.get("device", "libre"),
            "trend_arrow": entry.get("direction", "→"),
            "nightscout_id": entry.get("_id", ""),
            "raw_json": entry,
        })

    logger.info(f"Loaded {len(entries)} entries from {json_path}")
    return entries