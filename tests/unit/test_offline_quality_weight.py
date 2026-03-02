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

    # Quality policy must be applied: different quality scores produce different actions
    assert len(actions) > 0, "quality_action must be present in top strategies"
    # High-quality strategy (data_quality_score=0.95) should pass
    high_q = [x for x in top if x.get("data_quality_score", 0) >= 0.8]
    if high_q:
        assert all(x["quality_action"] == "pass" for x in high_q), (
            "High quality (>=0.8) strategies must receive 'pass' action"
        )
    # At least one degraded/blocked entry from the mixed population
    assert any(a in ("degrade", "block") for a in actions), (
        "Mixed-quality population must produce at least one degrade/block action"
    )

