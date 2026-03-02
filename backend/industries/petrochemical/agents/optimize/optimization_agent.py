"""Optimization Agent — recommends process parameter adjustments.

Compares current process parameters with evolution-optimized strategies
and generates actionable recommendations with improvement predictions.
"""

from __future__ import annotations

import logging
from typing import Any

from backend.core.multi_agent.engine import AgentAction, AgentResult
from backend.engine.evolution_service import get_evolution_service

logger = logging.getLogger(__name__)

# Simplified scoring model aligned with offline pipeline's TEP simulation
# Used to compute yield/energy from params without running full sandbox
OPTIMAL = {"reactor_temp": 515.0, "catalyst_ratio": 0.075, "pressure": 2.8, "residence_time": 5.5}
RANGES = {
    "reactor_temp": 40.0,
    "catalyst_ratio": 0.05,
    "pressure": 1.5,
    "residence_time": 4.0,
}
WEIGHTS = {"reactor_temp": 0.35, "catalyst_ratio": 0.25, "pressure": 0.20, "residence_time": 0.20}


def _compute_score(params: dict[str, Any]) -> float:
    """Compute process score (0-1) from params — matches offline sandbox logic."""
    scores = []
    for name, weight in WEIGHTS.items():
        val = params.get(name, OPTIMAL.get(name, 0))
        opt = OPTIMAL.get(name, val)
        rng = RANGES.get(name, 1.0)
        s = max(0.0, 1.0 - abs(val - opt) / rng)
        scores.append(weight * s)
    raw = sum(scores) + 0.05 * (scores[0] * scores[1])  # interaction term
    return max(0.0, min(1.0, raw))


def _params_to_yield_energy(score: float) -> tuple[float, float]:
    """Convert score to yield_pct and energy_kwh — matches offline simulation."""
    yield_pct = 65.0 + score * 20.0
    energy_kwh = 350.0 - score * 80.0
    return yield_pct, energy_kwh


async def run(input_data: dict[str, Any], memory: Any, tracer: Any) -> AgentResult:
    """Recommend process parameter adjustments using evolution strategies.

    Args:
        input_data: Must contain reactor_temp, catalyst_ratio, pressure, residence_time.
                    Optional: industry_id (default petrochemical), scenario_id (default process_optimization).
        memory: Session memory (unused in MVP).
        tracer: Session tracer for observability.

    Returns:
        AgentResult with COMPLETE and recommendation data.
    """
    industry_id = input_data.get("industry_id", "petrochemical")
    scenario_id = input_data.get("scenario_id", "process_optimization")

    current_params = {
        "reactor_temp": float(input_data.get("reactor_temp", 500)),
        "catalyst_ratio": float(input_data.get("catalyst_ratio", 0.08)),
        "pressure": float(input_data.get("pressure", 2.5)),
        "residence_time": float(input_data.get("residence_time", 5.0)),
    }

    service = get_evolution_service(scenario_id=scenario_id, industry_id=industry_id)
    await service.ensure_mock_data()

    strategies = service.get_strategies(min_score=0.0)

    if not strategies:
        current_score = _compute_score(current_params)
        cy, ce = _params_to_yield_energy(current_score)
        return AgentResult(
            action=AgentAction.COMPLETE,
            data={
                "current_params": current_params,
                "recommended_params": None,
                "predicted_yield_improvement": 0.0,
                "predicted_energy_saving": 0.0,
                "strategy_source": None,
                "strategy_generation": None,
                "message": "暂无优化策略数据，请先运行进化流程生成策略。",
                "current_yield_pct": round(cy, 2),
                "current_energy_kwh": round(ce, 2),
            },
            message="No evolution strategies available.",
        )

    best = strategies[0]
    recommended_params = best.get("params", {})
    for k in current_params:
        if k not in recommended_params:
            recommended_params[k] = current_params[k]
    recommended_params = {k: round(v, 4) if isinstance(v, (int, float)) else v for k, v in recommended_params.items()}

    current_score = _compute_score(current_params)
    best_score = best.get("score", current_score)
    cy, ce = _params_to_yield_energy(current_score)
    by, be = _params_to_yield_energy(best_score)

    predicted_yield_improvement = ((by - cy) / cy * 100) if cy > 0 else 0.0
    predicted_energy_saving = ((ce - be) / ce * 100) if ce > 0 else 0.0

    result_data = {
        "current_params": current_params,
        "recommended_params": recommended_params,
        "predicted_yield_improvement": round(predicted_yield_improvement, 2),
        "predicted_energy_saving": round(predicted_energy_saving, 2),
        "strategy_source": best.get("source", "offline"),
        "strategy_generation": best.get("generation"),
        "strategy_id": best.get("strategy_id"),
        "current_yield_pct": round(cy, 2),
        "current_energy_kwh": round(ce, 2),
        "predicted_yield_pct": round(by, 2),
        "predicted_energy_kwh": round(be, 2),
    }

    return AgentResult(
        action=AgentAction.COMPLETE,
        data=result_data,
        message=(
            f"推荐策略 {best.get('strategy_id', '')}: 反应温度 {recommended_params.get('reactor_temp')}°C, "
            f"催化剂比例 {recommended_params.get('catalyst_ratio')}, 预计收率提升 {predicted_yield_improvement:.1f}%, "
            f"能耗降低 {predicted_energy_saving:.1f}%"
        ),
    )
