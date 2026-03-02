"""Compute a normalized data quality score for strategy gating."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def _safe_float(value: Any, default: float = 0.0) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(value)
    except Exception:  # noqa: BLE001
        return default


def _freshness_score(acquired_at: str | None, max_age_days: int = 30) -> float:
    if not acquired_at:
        return 0.0
    try:
        ts = datetime.fromisoformat(acquired_at.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        age_days = max(0.0, (now - ts.astimezone(timezone.utc)).total_seconds() / 86400.0)
        score = 1.0 - min(1.0, age_days / float(max_age_days))
        return round(score, 4)
    except Exception:  # noqa: BLE001
        return 0.0


def score_record(record: dict[str, Any]) -> dict[str, Any]:
    """Score one record and return score breakdown."""
    completeness_fields = ["source_url", "industry_id", "scenario_id", "content_hash", "content"]
    present = 0
    for key in completeness_fields:
        val = record.get(key)
        if val not in (None, ""):
            present += 1
    completeness = present / len(completeness_fields)

    semantic_consistency = _safe_float(record.get("semantic_consistency"), 0.8)
    compliance_ok = 1.0 if record.get("compliance_ok", True) else 0.0
    freshness = _freshness_score(record.get("acquired_at"))

    score = (
        0.35 * completeness
        + 0.25 * freshness
        + 0.20 * semantic_consistency
        + 0.20 * compliance_ok
    )

    return {
        "score": round(max(0.0, min(1.0, score)), 4),
        "breakdown": {
            "completeness": round(completeness, 4),
            "freshness": round(freshness, 4),
            "semantic_consistency": round(semantic_consistency, 4),
            "compliance_ok": compliance_ok,
        },
    }

