"""Device predictive maintenance API — Scenario 3.

Endpoints aligned with docs/api_spec.md section 1.
"""

from __future__ import annotations

import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from backend.models.schemas import (
    APIResponse,
    DiagnoseRequest,
    PredictRequest,
    PredictResult,
)
from backend.industries.petrochemical.agents.device.pipeline import device_pipeline
from backend.industries.petrochemical.agents.device.monitor_agent import (
    _compute_features,
    _classify_fault,
)

logger = logging.getLogger(__name__)
router = APIRouter()

DEMO_DEVICE_HEALTH = {
    "DEV-PUMP-001": {
        "device_name": "循环水泵-001",
        "device_type": "centrifugal_pump",
        "current_health_score": 0.72,
        "health_trend": [
            {"timestamp": "2026-02-28T08:00:00Z", "score": 0.85},
            {"timestamp": "2026-02-28T12:00:00Z", "score": 0.78},
            {"timestamp": "2026-02-28T16:00:00Z", "score": 0.72},
        ],
        "active_alerts": [{"type": "vibration_warning", "message": "振动RMS超过预警阈值", "since": "2026-02-28T14:00:00Z"}],
    },
    "DEV-COMP-001": {
        "device_name": "富气压缩机-001",
        "device_type": "compressor",
        "current_health_score": 0.91,
        "health_trend": [
            {"timestamp": "2026-02-28T08:00:00Z", "score": 0.93},
            {"timestamp": "2026-02-28T12:00:00Z", "score": 0.92},
            {"timestamp": "2026-02-28T16:00:00Z", "score": 0.91},
        ],
        "active_alerts": [],
    },
}


@router.post("/predict")
async def predict_failure(req: PredictRequest):
    """Predict device failure based on sensor time-series data."""
    features = _compute_features(req.sensor_data.vibration)
    fault_type, risk_level, confidence = _classify_fault(features)

    health_score = max(0.1, 1.0 - features["rms"] * 2)
    rul_hours = None
    recommended_action = "continue_monitoring"

    if risk_level == "high":
        rul_hours = 72
        recommended_action = "schedule_immediate_inspection"
    elif risk_level == "medium":
        rul_hours = 336
        recommended_action = "schedule_inspection"

    result = PredictResult(
        device_id=req.device_id,
        health_score=round(health_score, 2),
        risk_level=risk_level,
        predicted_failure=fault_type if fault_type != "normal" else None,
        confidence=confidence,
        remaining_useful_life_hours=rul_hours,
        recommended_action=recommended_action,
    )

    return APIResponse(data=result.model_dump())


@router.get("/{device_id}/health")
async def get_device_health(device_id: str):
    """Get device health score and trend."""
    health = DEMO_DEVICE_HEALTH.get(device_id)
    if not health:
        return APIResponse(
            data={
                "device_id": device_id,
                "device_name": f"设备-{device_id}",
                "device_type": "unknown",
                "current_health_score": 0.90,
                "health_trend": [],
                "active_alerts": [],
            }
        )

    return APIResponse(data={"device_id": device_id, **health})


@router.post("/{device_id}/diagnose")
async def diagnose_fault(device_id: str, req: DiagnoseRequest):
    """Trigger Multi-Agent collaborative diagnosis — SSE stream."""

    async def event_stream() -> AsyncGenerator[str, None]:
        result = await device_pipeline.run(
            session_id=f"diag-{device_id}",
            entry_agent="monitor",
            initial_input={
                "device_id": device_id,
                "sensor_data": {"vibration": _generate_demo_vibration(req.anomaly_type)},
                "anomaly_type": req.anomaly_type,
                "context": req.context,
            },
        )

        for trace in result.get("traces", []):
            yield f"event: agent_step\ndata: {json.dumps(trace, ensure_ascii=False)}\n\n"

        yield f"event: complete\ndata: {json.dumps({'session_id': result['session_id'], 'total_latency_ms': result['total_latency_ms'], 'results': result['results']}, ensure_ascii=False, default=str)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _generate_demo_vibration(anomaly_type: str) -> list[float]:
    """Generate demo vibration data matching the anomaly type for diagnosis."""
    import math
    import random

    random.seed(42)
    n = 200
    t_step = 1.0 / 12000

    signal = [0.05 * random.gauss(0, 1) for _ in range(n)]

    if "vibration" in anomaly_type or "bearing" in anomaly_type:
        for i in range(n):
            signal[i] += 0.3 * math.sin(2 * math.pi * 162 * i * t_step)
            if i % 74 == 0:
                for j in range(min(20, n - i)):
                    signal[i + j] += 0.8 * math.exp(-j * 0.15)
    elif "cavitation" in anomaly_type:
        for i in range(n):
            if random.random() < 0.1:
                signal[i] += random.uniform(0.5, 1.2)

    return signal
