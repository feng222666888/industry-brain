"""Online evolution API — status, logs, gate stats, trigger."""

from __future__ import annotations

import time
from typing import Annotated, Any

from fastapi import APIRouter, Body

from backend.engine.evolution_service import get_evolution_service
from backend.engine.safety_gate import MIN_DATA_QUALITY_THRESHOLD, MIN_SCORE_THRESHOLD
from backend.models.schemas import APIResponse

router = APIRouter()

_online_logs: list[dict] = []
_gate_stats = {"pass": 0, "degrade": 0, "block": 0}

STEP_LABELS = ["信号感知", "策略匹配", "安全门控", "执行", "资产沉淀"]


@router.get("/status", response_model=APIResponse)
async def online_status():
    steps = []
    for label in STEP_LABELS:
        steps.append({"step": label, "label": label, "count": len(_online_logs)})
    return APIResponse(code=0, data={"steps": steps})


@router.get("/logs", response_model=APIResponse)
async def online_logs():
    return APIResponse(code=0, data={"logs": list(reversed(_online_logs[-30:]))})


@router.get("/gate-stats", response_model=APIResponse)
async def gate_stats():
    return APIResponse(
        code=0,
        data={
            **_gate_stats,
            "minScoreThreshold": MIN_SCORE_THRESHOLD,
            "minQualityThreshold": MIN_DATA_QUALITY_THRESHOLD,
        },
    )


@router.post("/trigger", response_model=APIResponse)
async def trigger_online(body: Annotated[dict[str, Any], Body(default={})]):
    scenario_id = body.get("scenario_id", "process_optimization")
    industry_id = body.get("industry_id", "petrochemical")

    service = get_evolution_service(scenario_id=scenario_id, industry_id=industry_id)
    await service.ensure_mock_data()

    raw_signal = {
        "signal_type": "process_params",
        "source_id": f"online-trigger-{int(time.time())}",
        "reactor_temp": 510.0,
        "catalyst_ratio": 0.06,
    }

    result = await service.online.run(raw_signal)
    steps = result.get("steps", [])

    gate_result = "pass"
    quality_weight = 1.0
    improvement = 0.0
    strategy_id = "—"

    for s in steps:
        if s.get("step") == "safety_gate":
            action = s.get("quality_action", "pass")
            gate_result = action
            quality_weight = s.get("quality_weight", 1.0)
            strategy_id = s.get("strategy_id", "—")
        if s.get("step") == "execution":
            improvement = s.get("metrics", {}).get("improvement", 0)

    if gate_result in _gate_stats:
        _gate_stats[gate_result] += 1
    else:
        _gate_stats["pass"] += 1

    _online_logs.append({
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "signal_source": raw_signal["source_id"],
        "signal_type": raw_signal["signal_type"],
        "strategy_id": strategy_id,
        "gate_result": gate_result,
        "quality_weight": quality_weight,
        "improvement": improvement,
    })

    return APIResponse(code=0, data=result)
