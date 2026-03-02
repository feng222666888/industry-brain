"""Device maintenance Multi-Agent pipeline — wires up monitor → diagnosis → repair.

This is the Scenario 3 entry point. Creates a MultiAgentEngine instance
with the three device agents registered, then runs the pipeline.
"""

from __future__ import annotations

from backend.core.multi_agent.engine import MultiAgentEngine
from backend.industries.petrochemical.agents.device import (
    diagnosis_agent,
    monitor_agent,
    repair_agent,
)


def create_device_pipeline() -> MultiAgentEngine:
    engine = MultiAgentEngine()
    engine.register("monitor", monitor_agent.run, "Detects anomalies from vibration sensor data")
    engine.register("diagnosis", diagnosis_agent.run, "Diagnoses fault root cause via knowledge base")
    engine.register("repair", repair_agent.run, "Generates structured maintenance SOP")
    return engine


device_pipeline = create_device_pipeline()
