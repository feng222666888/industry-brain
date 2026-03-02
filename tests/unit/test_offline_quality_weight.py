import asyncio

from backend.engine.offline.pipeline import OfflineEvolutionPipeline
from backend.engine.online.pipeline import Strategy


def test_offline_evolution_applies_quality_policy():
    pipeline = OfflineEvolutionPipeline(
        scenario_id="process_optimization",
        industry_id="petrochemical",
        population_size=2,
        top_k=2,
    )

    parents = [
        Strategy(
            strategy_id="p-high",
            scenario_id="process_optimization",
            industry_id="petrochemical",
            params={"reactor_temp": 515, "catalyst_ratio": 0.075, "pressure": 2.8, "residence_time": 5.5},
            score=0.9,
            source="offline",
            generation=0,
            data_quality_score=0.95,
        ),
        Strategy(
            strategy_id="p-low",
            scenario_id="process_optimization",
            industry_id="petrochemical",
            params={"reactor_temp": 515, "catalyst_ratio": 0.075, "pressure": 2.8, "residence_time": 5.5},
            score=0.9,
            source="offline",
            generation=0,
            data_quality_score=0.2,
        ),
    ]

    result = asyncio.run(pipeline.run_generation(parent_strategies=parents))
    top = result["top_strategies"]
    actions = {x["quality_action"] for x in top}
    assert "pass" not in actions
    assert actions.issubset({"degrade", "block"})

