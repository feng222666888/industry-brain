"""E2E test: quality gate behavior in online evolution."""

from __future__ import annotations

import asyncio

from backend.engine.online.pipeline import OnlineEvolutionPipeline, Strategy


def test_quality_gate_blocks_low_quality_strategy():
    online = OnlineEvolutionPipeline("process_optimization")
    online.register_strategy(
        Strategy(
            strategy_id="q-block",
            scenario_id="process_optimization",
            industry_id="petrochemical",
            params={"reactor_temp": 515, "catalyst_ratio": 0.075, "pressure": 2.8, "residence_time": 5.5},
            score=0.92,
            data_quality_score=0.3,
        )
    )

    result = asyncio.run(
        online.run(
            {
                "signal_type": "process_params",
                "source_id": "FCC-001",
                "reactor_temp": 520,
            }
        )
    )
    assert result["outcome"] == "blocked_by_safety_gate"
    gate_step = [s for s in result["steps"] if s["step"] == "safety_gate"][0]
    assert gate_step["quality_action"] == "block"


def test_quality_gate_degrade_visible_in_log():
    online = OnlineEvolutionPipeline("process_optimization")
    online.register_strategy(
        Strategy(
            strategy_id="q-degrade",
            scenario_id="process_optimization",
            industry_id="petrochemical",
            params={"reactor_temp": 515, "catalyst_ratio": 0.075, "pressure": 2.8, "residence_time": 5.5},
            score=0.92,
            data_quality_score=0.7,
        )
    )

    result = asyncio.run(
        online.run(
            {
                "signal_type": "process_params",
                "source_id": "FCC-002",
                "reactor_temp": 518,
            }
        )
    )
    assert result["outcome"] == "success"
    gate_step = [s for s in result["steps"] if s["step"] == "safety_gate"][0]
    assert gate_step["quality_action"] == "degrade"
    assert gate_step["quality_weight"] == 0.7

