"""Observability API — metrics, traces, evaluation."""

from __future__ import annotations

import time

from fastapi import APIRouter

from backend.models.schemas import APIResponse

router = APIRouter()

_global_traces: list[dict] = []
MAX_TRACES = 200


def record_trace(session_id: str, agent_name: str, action: str,
                 latency_ms: int, tools_called: list[str] | None = None,
                 status: str = "success") -> None:
    """Append a trace span to the global store (called from pipelines)."""
    _global_traces.append({
        "session_id": session_id,
        "agent_name": agent_name,
        "action": action,
        "latency_ms": latency_ms,
        "tools_called": tools_called or [],
        "status": status,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    })
    if len(_global_traces) > MAX_TRACES:
        _global_traces.pop(0)


@router.get("/metrics", response_model=APIResponse)
async def obs_metrics():
    total = len(_global_traces)
    if total > 0:
        avg_lat = round(sum(t["latency_ms"] for t in _global_traces) / total, 1)
        success = sum(1 for t in _global_traces if t["status"] == "success")
        rate = round(success / total, 3)
    else:
        avg_lat = 0
        rate = 1.0
    return APIResponse(
        code=0,
        data={
            "avgLatency": avg_lat,
            "successRate": rate,
            "todayCalls": total,
            "activeSpans": 0,
        },
    )


@router.get("/traces", response_model=APIResponse)
async def list_traces():
    return APIResponse(code=0, data={"traces": list(reversed(_global_traces[-50:]))})


@router.get("/traces/{session_id}", response_model=APIResponse)
async def trace_detail(session_id: str):
    spans = [t for t in _global_traces if t["session_id"] == session_id]
    return APIResponse(code=0, data={"spans": spans})


@router.get("/evaluation", response_model=APIResponse)
async def evaluation():
    return APIResponse(code=0, data={"evaluations": []})
