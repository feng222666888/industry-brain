import pytest
from backend.engine.safety_gate import SafetyGate
from backend.engine.online.pipeline import Strategy

def test_safety_gate_pass():
    gate = SafetyGate()
    strategy = Strategy(
        strategy_id="test-pass",
        scenario_id="process_optimization",
        industry_id="petrochemical",
        params={"reactor_temp": 515, "catalyst_ratio": 0.08, "pressure": 2.5, "residence_time": 5.0},
        score=0.85
    )
    assert gate.evaluate(strategy) is True
    assert len(gate.audit_log) == 1
    assert gate.audit_log[0]["passed"] is True

def test_safety_gate_fail_score():
    gate = SafetyGate()
    strategy = Strategy(
        strategy_id="test-fail-score",
        scenario_id="process_optimization",
        industry_id="petrochemical",
        params={"reactor_temp": 515, "catalyst_ratio": 0.08},
        score=0.4  # Below threshold
    )
    assert gate.evaluate(strategy) is False

def test_safety_gate_fail_range():
    gate = SafetyGate()
    strategy = Strategy(
        strategy_id="test-fail-range",
        scenario_id="process_optimization",
        industry_id="petrochemical",
        params={"reactor_temp": 600}, # Out of safe range [460, 560]
        score=0.9
    )
    assert gate.evaluate(strategy) is False
