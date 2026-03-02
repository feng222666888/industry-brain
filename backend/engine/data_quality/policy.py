"""Policy decisions from data quality scores."""

from __future__ import annotations

from typing import Any


def decide_quality_action(score: float) -> dict[str, Any]:
    """Map quality score to gate action."""
    if score < 0.5:
        return {"action": "block", "weight": 0.0, "reason": "quality_too_low"}
    if score < 0.8:
        return {"action": "degrade", "weight": 0.7, "reason": "quality_moderate"}
    return {"action": "pass", "weight": 1.0, "reason": "quality_good"}

