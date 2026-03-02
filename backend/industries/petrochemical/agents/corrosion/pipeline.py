"""Corrosion prevention Multi-Agent pipeline — wires up identify → risk.

Scenario entry point. Creates a MultiAgentEngine instance with the two
corrosion agents registered, then runs the pipeline.
"""

from __future__ import annotations

from backend.core.multi_agent.engine import MultiAgentEngine
from backend.industries.petrochemical.agents.corrosion import (
    identify_agent,
    risk_agent,
)


def create_corrosion_pipeline() -> MultiAgentEngine:
    engine = MultiAgentEngine()
    engine.register("identify", identify_agent.run, "Identifies corrosion mechanisms from object metadata")
    engine.register("risk", risk_agent.run, "Calculates risk levels for identified corrosion mechanisms")
    return engine


corrosion_pipeline = create_corrosion_pipeline()
