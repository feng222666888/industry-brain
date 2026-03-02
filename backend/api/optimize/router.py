"""Process optimization API — Scenario 1."""

from __future__ import annotations

import uuid

from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.core.memory.session_memory import session_memory
from backend.core.observability.tracer import SessionTracer
from backend.industries.petrochemical.agents.optimize.optimization_agent import run as optimization_agent_run
from backend.models.schemas import APIResponse

router = APIRouter()


class OptimizeRequest(BaseModel):
    """Request model for process optimization recommendation."""

    reactor_temp: float = Field(500.0, description="Reactor temperature in °C")
    catalyst_ratio: float = Field(0.08, description="Catalyst to feed ratio")
    pressure: float = Field(2.5, description="Reactor pressure in MPa")
    residence_time: float = Field(5.0, description="Residence time in seconds")
    industry_id: str = Field("petrochemical", description="Industry identifier")


@router.post("/recommend", response_model=APIResponse)
async def recommend_params(request: OptimizeRequest):
    """Recommend optimized process parameters via optimization agent."""
    try:
        session_id = f"opt-{uuid.uuid4().hex[:8]}"
        tracer = SessionTracer(session_id)
        session_memory.create_session(session_id, context={"request": request.model_dump()})

        input_data = {
            "reactor_temp": request.reactor_temp,
            "catalyst_ratio": request.catalyst_ratio,
            "pressure": request.pressure,
            "residence_time": request.residence_time,
            "industry_id": request.industry_id,
            "scenario_id": "process_optimization",
        }

        result = await optimization_agent_run(input_data, session_memory, tracer)

        return APIResponse(
            code=0,
            data=result.data,
            message=result.message or "ok",
        )
    except Exception as e:
        return APIResponse(
            code=1,
            data=None,
            message=str(e),
        )


@router.get("/comparison", response_model=APIResponse)
async def get_optimization_comparison():
    """Get before/after yield and energy comparison (demo data)."""
    before_after = {
        "before": {
            "reactor_temp": 495,
            "catalyst_ratio": 0.065,
            "pressure": 2.2,
            "residence_time": 4.2,
            "yield_pct": 72.3,
            "energy_kwh_per_ton": 285,
            "operating_cost_index": 1.0,
        },
        "after": {
            "reactor_temp": 512,
            "catalyst_ratio": 0.078,
            "pressure": 2.75,
            "residence_time": 5.2,
            "yield_pct": 78.6,
            "energy_kwh_per_ton": 242,
            "operating_cost_index": 0.92,
        },
        "improvements": {
            "yield_increase_pct": 8.7,
            "energy_saving_pct": 15.1,
            "cost_reduction_pct": 8.0,
        },
        "description": "催化裂化装置工艺参数优化：调整反应温度与催化剂配比后，轻油收率提升8.7%，综合能耗下降15.1%。",
    }
    return APIResponse(
        code=0,
        data=before_after,
        message="ok",
    )
