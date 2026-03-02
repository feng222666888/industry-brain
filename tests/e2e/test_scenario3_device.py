"""E2E test: Scenario 3 — Device Predictive Maintenance full pipeline.

Validates the complete Multi-Agent chain: monitor → diagnosis → repair.
"""

from __future__ import annotations

import asyncio
import math
import random
import sys

sys.path.insert(0, ".")

from backend.industries.petrochemical.agents.device.pipeline import device_pipeline
from backend.industries.petrochemical.agents.device.monitor_agent import _compute_features, _classify_fault


def generate_fault_signal(fault_type: str = "inner_race") -> list[float]:
    random.seed(42)
    n = 200
    signal = [0.05 * random.gauss(0, 1) for _ in range(n)]
    for i in range(n):
        signal[i] += 0.3 * math.sin(2 * math.pi * 162 * i / 12000)
        if i % 74 == 0:
            for j in range(min(20, n - i)):
                signal[i + j] += 0.8 * math.exp(-j * 0.15)
    return signal


def generate_normal_signal() -> list[float]:
    random.seed(99)
    return [0.03 * random.gauss(0, 1) for _ in range(200)]


class TestScenario3:
    def test_monitor_normal_signal(self):
        signal = generate_normal_signal()
        features = _compute_features(signal)
        fault_type, risk_level, confidence = _classify_fault(features)
        assert risk_level == "low", f"Expected low risk for normal signal, got {risk_level}"
        assert fault_type == "normal", f"Expected normal, got {fault_type}"
        print(f"  ✓ Normal signal: risk={risk_level}, features.rms={features['rms']:.4f}")

    def test_monitor_fault_signal(self):
        signal = generate_fault_signal()
        features = _compute_features(signal)
        fault_type, risk_level, confidence = _classify_fault(features)
        assert risk_level in ("medium", "high"), f"Expected medium/high risk, got {risk_level}"
        assert fault_type != "normal", f"Expected fault detection, got normal"
        assert confidence > 0.5, f"Expected confidence > 0.5, got {confidence}"
        print(f"  ✓ Fault signal: type={fault_type}, risk={risk_level}, confidence={confidence}")

    def test_full_pipeline_with_fault(self):
        signal = generate_fault_signal()
        result = asyncio.run(device_pipeline.run(
            session_id="e2e-test-001",
            entry_agent="monitor",
            initial_input={"device_id": "DEV-PUMP-001", "sensor_data": {"vibration": signal}},
        ))

        assert result["steps"] == 3, f"Expected 3 steps (monitor→diagnosis→repair), got {result['steps']}"
        assert "monitor" in result["results"], "Missing monitor result"
        assert "diagnosis" in result["results"], "Missing diagnosis result"
        assert "repair" in result["results"], "Missing repair result"

        diag = result["results"]["diagnosis"]
        assert "root_causes" in diag, "Diagnosis missing root_causes"
        assert len(diag["root_causes"]) > 0, "No root causes found"

        repair = result["results"]["repair"]
        assert "sop_id" in repair, "Repair missing sop_id"
        assert "steps" in repair, "Repair missing steps"
        assert len(repair["steps"]) > 0, "SOP has no steps"

        print(f"  ✓ Full pipeline: {result['steps']} steps, fault={diag['fault_type']}, "
              f"cause={diag['primary_root_cause']}, sop={repair['sop_id']}")

    def test_full_pipeline_normal_completes_early(self):
        signal = generate_normal_signal()
        result = asyncio.run(device_pipeline.run(
            session_id="e2e-test-002",
            entry_agent="monitor",
            initial_input={"device_id": "DEV-PUMP-002", "sensor_data": {"vibration": signal}},
        ))

        assert result["steps"] == 1, f"Expected 1 step (normal → complete), got {result['steps']}"
        assert "monitor" in result["results"]
        assert result["results"]["monitor"]["risk_level"] == "low"
        print(f"  ✓ Normal pipeline: completed in 1 step, device healthy")

    def test_traces_recorded(self):
        signal = generate_fault_signal()
        result = asyncio.run(device_pipeline.run(
            session_id="e2e-test-003",
            entry_agent="monitor",
            initial_input={"device_id": "DEV-PUMP-001", "sensor_data": {"vibration": signal}},
        ))

        traces = result["traces"]
        assert len(traces) == 3, f"Expected 3 trace spans, got {len(traces)}"
        assert traces[0]["agent_name"] == "monitor"
        assert traces[1]["agent_name"] == "diagnosis"
        assert traces[2]["agent_name"] == "repair"
        print(f"  ✓ Observability: {len(traces)} traces recorded, "
              f"agents={[t['agent_name'] for t in traces]}")


if __name__ == "__main__":
    suite = TestScenario3()
    tests = [m for m in dir(suite) if m.startswith("test_")]
    print(f"\n=== Scenario 3 E2E Tests ({len(tests)} tests) ===\n")
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
