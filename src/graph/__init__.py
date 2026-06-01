#!/usr/bin/env python3
"""Graph package — knowledge graph for T1D Companion v2."""

from __future__ import annotations

from .repository import HealthMetricStore
from .engine import GraphEngine
from .views import (
    # SQL view DDL
    HEALTH_EVENT_VIEWS_DDL,

    # Domain models
    HealthEventBase,
    MealEvent,
    InsulinEvent,
    GlucoseReading,
    ActivityEvent,
    SleepEvent,
    NoteEvent,

    # Query helpers
    query_typed_events,
    query_typed_events_as_models,
    get_typed_event_by_id,
    ensure_health_event_views,

    # View name registry
    VIEW_NAME_BY_EVENT,
    MODEL_BY_EVENT,
)

__all__ = [
    "HealthMetricStore",
    "GraphEngine",

    "HEALTH_EVENT_VIEWS_DDL",

    "HealthEventBase",
    "MealEvent",
    "InsulinEvent",
    "GlucoseReading",
    "ActivityEvent",
    "SleepEvent",
    "NoteEvent",

    "query_typed_events",
    "query_typed_events_as_models",
    "get_typed_event_by_id",
    "ensure_health_event_views",

    "VIEW_NAME_BY_EVENT",
    "MODEL_BY_EVENT",
]
