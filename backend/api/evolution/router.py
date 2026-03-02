"""Self-evolution engine API — product highlight."""

from __future__ import annotations

from fastapi import APIRouter, Query

from backend.engine.evolution_service import get_evolution_service
from backend.models.schemas import APIResponse

router = APIRouter()


@router.get("/strategies", response_model=APIResponse)
async def list_strategies(
    industry_id: str = Query("petrochemical", description="Industry identifier"),
    scenario_id: str = Query("process_optimization", description="Scenario identifier"),
    min_score: float = Query(0.0, ge=0.0, le=1.0, description="Minimum strategy score filter"),
):
    """List evolution strategies filtered by industry and scenario."""
    service = get_evolution_service(scenario_id=scenario_id, industry_id=industry_id)
    await service.ensure_mock_data()

    strategies = service.get_strategies(min_score=min_score)

    return APIResponse(
        code=0,
        data={"industry_id": industry_id, "scenario_id": scenario_id, "strategies": strategies},
        message="ok",
    )


@router.get("/timeline", response_model=APIResponse)
async def get_evolution_timeline(
    industry_id: str = Query("petrochemical", description="Industry identifier"),
    scenario_id: str = Query("process_optimization", description="Scenario identifier"),
):
    """Get strategy generation timeline for visualization."""
    service = get_evolution_service(scenario_id=scenario_id, industry_id=industry_id)
    await service.ensure_mock_data()

    timeline = service.get_timeline()

    return APIResponse(
        code=0,
        data={"industry_id": industry_id, "scenario_id": scenario_id, "generations": timeline},
        message="ok",
    )
