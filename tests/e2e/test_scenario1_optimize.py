"""E2E test: Scenario 1 — Process Optimization + Evolution Engine."""

from __future__ import annotations

import asyncio
import sys

sys.path.insert(0, ".")

from backend.engine.evolution_service import get_evolution_service
from backend.engine.safety_gate import SafetyGate
from backend.engine.online.pipeline import Strategy


class TestScenario1:
    def test_offline_evolution_convergence(self):
        svc = get_evolution_service("process_optimization")
        asyncio.run(svc.ensure_mock_data())

        timeline = svc.get_timeline()
        assert len(timeline) == 15, f"Expected 15 generations, got {len(timeline)}"

        first_score = timeline[0]["best_score"]
        last_score = timeline[-1]["best_score"]
        assert last_score > first_score, f"Evolution did not improve: {first_score} → {last_score}"
        assert last_score > 0.9, f"Final best score {last_score} < 0.9"
        print(f"  ✓ Offline evolution: 15 gen, {first_score:.4f} → {last_score:.4f}")

    def test_strategy_retrieval(self):
        svc = get_evolution_service("process_optimization")
        asyncio.run(svc.ensure_mock_data())

        strategies = svc.get_strategies(min_score=0.8)
        assert len(strategies) > 0, "No strategies found with score >= 0.8"

        best = strategies[0]
        assert "reactor_temp" in best["params"], "Missing reactor_temp in params"
        assert 460 <= best["params"]["reactor_temp"] <= 560, "reactor_temp out of safe range"
        print(f"  ✓ Strategy retrieval: {len(strategies)} strategies >= 0.8, "
              f"best={best['score']:.4f}")

    def test_safety_gate_pass(self):
        gate = SafetyGate()
        strategy = Strategy(
            strategy_id="test-safe",
            scenario_id="process_optimization",
            industry_id="petrochemical",
            params={"reactor_temp": 515, "catalyst_ratio": 0.075, "pressure": 2.8, "residence_time": 5.5},
            score=0.9,
        )
        assert gate.evaluate(strategy), "Safe strategy should pass gate"
        print(f"  ✓ Safety gate: valid strategy passed")

    def test_safety_gate_block_out_of_range(self):
        gate = SafetyGate()
        strategy = Strategy(
            strategy_id="test-unsafe",
            scenario_id="process_optimization",
            industry_id="petrochemical",
            params={"reactor_temp": 600, "catalyst_ratio": 0.075},
            score=0.9,
        )
        assert not gate.evaluate(strategy), "Out-of-range strategy should be blocked"
        assert len(gate.audit_log) > 0, "Audit log should record the check"
        print(f"  ✓ Safety gate: blocked out-of-range (temp=600)")

    def test_safety_gate_block_low_score(self):
        gate = SafetyGate()
        strategy = Strategy(
            strategy_id="test-lowscore",
            scenario_id="process_optimization",
            industry_id="petrochemical",
            params={"reactor_temp": 515},
            score=0.3,
        )
        assert not gate.evaluate(strategy), "Low-score strategy should be blocked"
        print(f"  ✓ Safety gate: blocked low score (0.3)")

    def test_online_evolution_cycle(self):
        from backend.engine.online.pipeline import OnlineEvolutionPipeline

        online = OnlineEvolutionPipeline("process_optimization")
        online.register_strategy(Strategy(
            strategy_id="strat-best",
            scenario_id="process_optimization",
            industry_id="petrochemical",
            params={"reactor_temp": 515, "catalyst_ratio": 0.075, "pressure": 2.8, "residence_time": 5.5},
            score=0.92,
        ))

        result = asyncio.run(online.run({
            "signal_type": "process_params",
            "source_id": "FCC-001",
            "reactor_temp": 520,
        }))

        assert result["outcome"] == "success", f"Expected success, got {result['outcome']}"
        steps = [s["step"] for s in result["steps"]]
        assert "signal_sensing" in steps
        assert "strategy_matching" in steps
        assert "safety_gate" in steps
        assert "execution" in steps
        assert "asset_settlement" in steps
        print(f"  ✓ Online evolution: {len(steps)} steps, outcome={result['outcome']}")


if __name__ == "__main__":
    suite = TestScenario1()
    tests = [m for m in dir(suite) if m.startswith("test_")]
    print(f"\n=== Scenario 1 E2E Tests ({len(tests)} tests) ===\n")
    passed = 0
    for test_name in sorted(tests):
        try:
            getattr(suite, test_name)()
            passed += 1
        except AssertionError as e:
            print(f"  ✗ {test_name}: {e}")
        except Exception as e:
            print(f"  ✗ {test_name}: EXCEPTION {e}")
    print(f"\n{'='*50}")
    print(f"Result: {passed}/{len(tests)} passed")
