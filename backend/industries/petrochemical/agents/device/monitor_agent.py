"""Monitor Agent — detects anomalies from sensor time-series data.

Uses statistical features (RMS, kurtosis, crest factor) to classify
vibration signals as normal, degrading, or faulty. In production,
this would invoke a time-series model via LiteLLM.
"""

from __future__ import annotations

import logging
import math
from typing import Any

from backend.core.multi_agent.engine import AgentAction, AgentResult

logger = logging.getLogger(__name__)

THRESHOLDS = {
    "rms_warning": 0.15,
    "rms_critical": 0.35,
    "kurtosis_warning": 4.0,
    "kurtosis_critical": 6.0,
}

FAULT_PATTERNS = {
    "inner_race_fault": {"kurtosis_min": 5.0, "rms_min": 0.2},
    "outer_race_fault": {"kurtosis_min": 4.5, "rms_min": 0.15},
    "ball_fault": {"kurtosis_min": 5.5, "rms_min": 0.25},
}


def _compute_features(signal: list[float]) -> dict[str, float]:
    n = len(signal)
    if n == 0:
        return {"rms": 0, "peak": 0, "kurtosis": 3.0, "crest_factor": 0}

    mean = sum(signal) / n
    variance = sum((x - mean) ** 2 for x in signal) / n
    std = math.sqrt(variance) if variance > 0 else 1e-10
    rms = math.sqrt(sum(x ** 2 for x in signal) / n)
    peak = max(abs(x) for x in signal)
    m4 = sum((x - mean) ** 4 for x in signal) / n
    kurtosis = m4 / (std ** 4) if std > 1e-10 else 3.0

    return {
        "rms": round(rms, 6),
        "peak": round(peak, 6),
        "kurtosis": round(kurtosis, 4),
        "crest_factor": round(peak / rms if rms > 0 else 0, 4),
    }


def _classify_fault(features: dict[str, float]) -> tuple[str, str, float]:
    """Returns (fault_type, risk_level, confidence)."""
    rms = features["rms"]
    kurtosis = features["kurtosis"]

    if rms < THRESHOLDS["rms_warning"] and kurtosis < THRESHOLDS["kurtosis_warning"]:
        return "normal", "low", 0.95

    best_match = None
    best_score = 0.0

    for fault_type, pattern in FAULT_PATTERNS.items():
        rms_score = min(rms / pattern["rms_min"], 2.0) / 2.0
        kurt_score = min(kurtosis / pattern["kurtosis_min"], 2.0) / 2.0
        score = (rms_score + kurt_score) / 2.0

        if score > best_score:
            best_score = score
            best_match = fault_type

    if rms >= THRESHOLDS["rms_critical"] or kurtosis >= THRESHOLDS["kurtosis_critical"]:
        risk_level = "high"
    elif rms >= THRESHOLDS["rms_warning"]:
        risk_level = "medium"
    else:
        risk_level = "low"

    return best_match or "unknown_fault", risk_level, round(min(best_score, 0.99), 2)


async def run(input_data: dict[str, Any], memory, tracer) -> AgentResult:
    device_id = input_data.get("device_id", "unknown")
    sensor_data = input_data.get("sensor_data", {})

    vibration = sensor_data.get("vibration", [])
    if not vibration:
        return AgentResult(
            action=AgentAction.ERROR,
            message=f"No vibration data for device {device_id}",
        )

    features = _compute_features(vibration)
    fault_type, risk_level, confidence = _classify_fault(features)

    result_data = {
        "device_id": device_id,
        "features": features,
        "fault_type": fault_type,
        "risk_level": risk_level,
        "confidence": confidence,
    }

    if risk_level in ("medium", "high"):
        return AgentResult(
            action=AgentAction.HANDOFF,
            data=result_data,
            next_agent="diagnosis",
            message=f"Anomaly detected on {device_id}: {fault_type} (risk={risk_level}, confidence={confidence})",
        )

    return AgentResult(
        action=AgentAction.COMPLETE,
        data=result_data,
        message=f"Device {device_id} operating normally (rms={features['rms']})",
    )
