"""Offline evolution API — convergence analysis, trigger evolution run."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Body, Query

from backend.engine.evolution_service import get_evolution_service
from backend.engine.online.pipeline import Strategy
from backend.models.schemas import APIResponse

router = APIRouter()


@router.get("/convergence", response_model=APIResponse)
async def convergence(
    industry_id: str = Query("petrochemical"),
    scenario_id: str = Query("process_optimization"),
):
    service = get_evolution_service(scenario_id=scenario_id, industry_id=industry_id)
    await service.ensure_mock_data()

    timeline = service.get_timeline()
    converged = False
    convergence_gen = None
    diversity = 0.0
    threshold = 0.001

    if len(timeline) >= 3:
        last_scores = [g["best_score"] for g in timeline[-3:]]
        diff = max(last_scores) - min(last_scores)
        if diff < threshold:
            converged = True
            convergence_gen = timeline[-3]["generation"]
        diversity = diff

    return APIResponse(
        code=0,
        data={
            "converged": converged,
            "convergenceGen": convergence_gen,
            "threshold": threshold,
            "diversity": round(diversity, 6),
        },
    )


@router.post("/run", response_model=APIResponse)
async def run_offline(body: Annotated[dict[str, Any] | None, Body()] = None):
    body = body or {}
    n_gens = body.get("generations", 5)
    industry_id = body.get("industry_id", "petrochemical")
    scenario_id = body.get("scenario_id", "process_optimization")

    service = get_evolution_service(scenario_id=scenario_id, industry_id=industry_id)
    await service.ensure_mock_data()

    parents = None
    strategies = service.get_strategies()
    if strategies:
        top = strategies[:3]
        parents = [
            Strategy(
                s["strategy_id"], s["scenario_id"], s["industry_id"],
                params=s["params"], score=s["score"],
            )
            for s in top
        ]

    results = []
    for _ in range(n_gens):
        result = await service.offline.run_generation(parent_strategies=parents)
        top = result["top_strategies"]
        parents = [
            Strategy(s["strategy_id"], scenario_id, industry_id, params=s["params"], score=s["score"])
            for s in top
        ]
        results.append(result)

    return APIResponse(
        code=0,
        data={"generations_run": n_gens, "results": results},
    )
