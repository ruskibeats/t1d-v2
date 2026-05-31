#!/usr/bin/env python3
"""Graph engine — backward-compatibility re-export.

All functionality has moved to src.graph package:
  - src/graph/repository.py — HealthMetricStore (SQL encapsulation)
  - src/graph/engine.py     — GraphEngine (traversal queries)
"""

from __future__ import annotations

from src.graph.repository import HealthMetricStore  # noqa: F401
from src.graph.engine import GraphEngine  # noqa: F401

__all__ = [
    "HealthMetricStore",
    "GraphEngine",
]
