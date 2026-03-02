"""Multi-Agent engine API — pipelines and execution history."""

from __future__ import annotations

from fastapi import APIRouter

from backend.models.schemas import APIResponse

router = APIRouter()

PIPELINE_DEFINITIONS = [
    {
        "scenario": "设备预测维护",
        "agents": ["monitor_agent", "diagnosis_agent", "repair_agent"],
        "mode": "Manager/Handoffs",
    },
    {
        "scenario": "工艺参数寻优",
        "agents": ["optimization_agent"],
        "mode": "Manager/Handoffs",
    },
    {
        "scenario": "催化剂研发",
        "agents": ["research_agent"],
        "mode": "Manager/Handoffs",
    },
]

_execution_log: list[dict] = []


def record_execution(session_id: str, scenario: str, agents: list[str],
                     handoffs: int, total_latency_ms: int, status: str) -> None:
    """Called by device pipeline etc. to record execution history."""
    import time
    _execution_log.append({
        "session_id": session_id,
        "scenario": scenario,
        "agents": agents,
        "handoffs": handoffs,
        "total_latency_ms": total_latency_ms,
        "status": status,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    })
    if len(_execution_log) > 100:
        _execution_log.pop(0)


@router.get("/pipelines", response_model=APIResponse)
async def list_pipelines():
    return APIResponse(code=0, data={"pipelines": PIPELINE_DEFINITIONS})


@router.get("/executions", response_model=APIResponse)
async def list_executions():
    return APIResponse(code=0, data={"executions": list(reversed(_execution_log[-20:]))})
