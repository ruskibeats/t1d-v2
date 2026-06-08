"""Services package for T1D Companion v2."""

from .cgm_entries import (
    upsert_cgm_entry,
    upsert_cgm_entries_batch,
    get_cgm_entries,
    get_cgm_entry_count,
    delete_cgm_entries,
    CGM_ENTRIES_TABLE_DDL,
    ensure_cgm_entries_table,
)
from .nightscout_client import (
    NightscoutClient,
    entries_to_cgm_rows,
    treatments_to_health_metrics,
    load_entries_from_json,
)

__all__ = [
    # CGM entries
    "upsert_cgm_entry",
    "upsert_cgm_entries_batch",
    "get_cgm_entries",
    "get_cgm_entry_count",
    "delete_cgm_entries",
    "CGM_ENTRIES_TABLE_DDL",
    "ensure_cgm_entries_table",
    # Nightscout client
    "NightscoutClient",
    "entries_to_cgm_rows",
    "treatments_to_health_metrics",
    "load_entries_from_json",
]