"""CGM entries storage — local persistence for Nightscout CGM readings.

Issue #34: Add local cgm_entries storage and idempotent upsert.

Stores CGM glucose readings with provenance tracking. Idempotent upsert
keyed on (user_id, measured_at, source) so re-imports do not duplicate rows.

Schema:
    cgm_entries (
        id              SERIAL PRIMARY KEY,
        user_id         INT NOT NULL REFERENCES tbl_users(id),
        measured_at     TIMESTAMPTZ NOT NULL,
        value_mg_dl     FLOAT NOT NULL,
        value_mmol_l    FLOAT,
        units           TEXT DEFAULT 'mg/dL',
        source          TEXT NOT NULL DEFAULT 'nightscout',  -- 'nightscout' | 'manual' | 'import'
        device          TEXT,  -- e.g. 'libre_link', 'dexcom'
        nightscout_id   TEXT,  -- stable Nightscout event id for dedup
        metadata        JSONB DEFAULT '{}',
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, measured_at, source)
    )
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text as sql

logger = logging.getLogger(__name__)


# ── Schema ──

CGM_ENTRIES_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS cgm_entries (
    id              SERIAL PRIMARY KEY,
    user_id         INT NOT NULL,
    measured_at     TIMESTAMPTZ NOT NULL,
    value_mg_dl     FLOAT NOT NULL,
    value_mmol_l    FLOAT,
    units           TEXT DEFAULT 'mg/dL',
    source          TEXT NOT NULL DEFAULT 'nightscout',
    device          TEXT,
    nightscout_id   TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, measured_at, source)
);

CREATE INDEX IF NOT EXISTS idx_cgm_entries_user_time
    ON cgm_entries (user_id, measured_at DESC);

CREATE INDEX IF NOT EXISTS idx_cgm_entries_nightscout_id
    ON cgm_entries (nightscout_id)
    WHERE nightscout_id IS NOT NULL;
"""


# ── Upsert ──

async def upsert_cgm_entry(
    session,
    *,
    user_id: int,
    measured_at: datetime,
    value_mg_dl: float,
    value_mmol_l: float | None = None,
    units: str = "mg/dL",
    source: str = "nightscout",
    device: str | None = None,
    nightscout_id: str | None = None,
    metadata: dict | None = None,
) -> int:
    """Insert or update a CGM entry. Idempotent on (user_id, measured_at, source).

    Returns the entry id.
    """
    if measured_at.tzinfo is None:
        measured_at = measured_at.replace(tzinfo=timezone.utc)

    result = await session.execute(sql("""
        INSERT INTO cgm_entries
            (user_id, measured_at, value_mg_dl, value_mmol_l, units, source, device, nightscout_id, metadata, updated_at)
        VALUES
            (:uid, :ma, :val, :mmol, :units, :src, :dev, :ns_id, CAST(:meta AS jsonb), NOW())
        ON CONFLICT (user_id, measured_at, source)
        DO UPDATE SET
            value_mg_dl = EXCLUDED.value_mg_dl,
            value_mmol_l = COALESCE(EXCLUDED.value_mmol_l, cgm_entries.value_mmol_l),
            units = EXCLUDED.units,
            device = COALESCE(EXCLUDED.device, cgm_entries.device),
            nightscout_id = COALESCE(EXCLUDED.nightscout_id, cgm_entries.nightscout_id),
            metadata = cgm_entries.metadata || EXCLUDED.metadata,
            updated_at = NOW()
        RETURNING id
    """), {
        "uid": user_id,
        "ma": measured_at,
        "val": value_mg_dl,
        "mmol": value_mmol_l,
        "units": units,
        "src": source,
        "dev": device,
        "ns_id": nightscout_id,
        "meta": json.dumps(metadata or {}),
    })
    return result.scalar_one()


async def upsert_cgm_entries_batch(
    session,
    user_id: int,
    entries: list[dict[str, Any]],
) -> list[int]:
    """Batch upsert CGM entries. Each entry dict must have:
    measured_at, value_mg_dl. Optional: value_mmol_l, units, source, device, nightscout_id, metadata.
    """
    ids = []
    for entry in entries:
        entry["user_id"] = user_id
        eid = await upsert_cgm_entry(session, **entry)
        ids.append(eid)
    return ids


# ── Query ──

async def get_cgm_entries(
    session,
    user_id: int,
    start: datetime | None = None,
    end: datetime | None = None,
    source: str | None = None,
    limit: int = 1000,
) -> list[dict[str, Any]]:
    """Query CGM entries for a user, optionally filtered by time range and source."""
    conditions = ["user_id = :uid"]
    params: dict[str, Any] = {"uid": user_id, "limit": limit}

    if start:
        conditions.append("measured_at >= :start")
        params["start"] = start
    if end:
        conditions.append("measured_at <= :end")
        params["end"] = end
    if source:
        conditions.append("source = :src")
        params["src"] = source

    where = " AND ".join(conditions)
    result = await session.execute(sql(f"""
        SELECT id, user_id, measured_at, value_mg_dl, value_mmol_l, units, source, device, nightscout_id, metadata, created_at, updated_at
        FROM cgm_entries
        WHERE {where}
        ORDER BY measured_at DESC
        LIMIT :limit
    """), params)
    return [dict(row._mapping) for row in result.fetchall()]


async def get_cgm_entry_count(
    session,
    user_id: int,
    source: str | None = None,
) -> int:
    """Count CGM entries for a user."""
    conditions = ["user_id = :uid"]
    params: dict[str, Any] = {"uid": user_id}
    if source:
        conditions.append("source = :src")
        params["src"] = source
    where = " AND ".join(conditions)
    result = await session.execute(sql(f"SELECT COUNT(*) FROM cgm_entries WHERE {where}"), params)
    return result.scalar_one()


async def delete_cgm_entries(
    session,
    user_id: int,
    start: datetime | None = None,
    end: datetime | None = None,
) -> int:
    """Delete CGM entries for a user in a time range. Returns count deleted."""
    conditions = ["user_id = :uid"]
    params: dict[str, Any] = {"uid": user_id}
    if start:
        conditions.append("measured_at >= :start")
        params["start"] = start
    if end:
        conditions.append("measured_at <= :end")
        params["end"] = end
    where = " AND ".join(conditions)
    result = await session.execute(sql(f"DELETE FROM cgm_entries WHERE {where}"), params)
    return result.rowcount


# ── Schema migration ──

async def ensure_cgm_entries_table(session) -> None:
    """Create the cgm_entries table if it doesn't exist."""
    await session.execute(sql(CGM_ENTRIES_TABLE_DDL))
    await session.commit()
