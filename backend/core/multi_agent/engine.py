"""Multi-Agent engine MVP — Manager/Handoffs pattern.

Implements the core orchestration loop:
1. Manager receives task → decides which agent to invoke
2. Agent executes → returns result (or hands off to next agent)
3. Manager evaluates → continue, handoff, or complete

This is a lightweight implementation compatible with LangGraph's StateGraph
interface. Can be replaced with full LangGraph when deploying with Python 3.11+.
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from backend.core.memory.session_memory import MemoryEntry, SessionMemory, session_memory
from backend.core.observability.tracer import SessionTracer

logger = logging.getLogger(__name__)


class AgentAction(Enum):
    CONTINUE = "continue"
    HANDOFF = "handoff"
    COMPLETE = "complete"
    ERROR = "error"


@dataclass
class AgentResult:
    action: AgentAction
    data: dict[str, Any] = field(default_factory=dict)
    next_agent: str | None = None
    message: str = ""


AgentCallable = Callable[[dict[str, Any], SessionMemory, SessionTracer], Awaitable[AgentResult]]


@dataclass
class AgentNode:
    name: str
    execute: AgentCallable
    description: str = ""


class MultiAgentEngine:
    """Orchestrates multiple agents in a Manager/Handoffs pattern.

    Usage:
        engine = MultiAgentEngine()
        engine.register("monitor", monitor_agent.run, "Detects anomalies from sensor data")
        engine.register("diagnosis", diagnosis_agent.run, "Diagnoses root cause")
        engine.register("repair", repair_agent.run, "Generates maintenance SOP")

        result = await engine.run(
            session_id="sess-001",
            entry_agent="monitor",
            initial_input={"device_id": "PUMP-001", "sensor_data": {...}},
        )
    """

    def __init__(self):
        self._agents: dict[str, AgentNode] = {}

    def register(self, name: str, execute: AgentCallable, description: str = "") -> None:
        self._agents[name] = AgentNode(name=name, execute=execute, description=description)

    async def run(
        self,
        session_id: str,
        entry_agent: str,
        initial_input: dict[str, Any],
        max_steps: int = 10,
    ) -> dict[str, Any]:
        """Execute the multi-agent pipeline.

        Returns the final aggregated result from all agent steps.
        """
        if entry_agent not in self._agents:
            raise ValueError(f"Agent '{entry_agent}' not registered. Available: {list(self._agents.keys())}")

        tracer = SessionTracer(session_id)
        session_memory.create_session(session_id, context={"initial_input": initial_input})

        current_agent = entry_agent
        current_input = initial_input
        aggregated_results: dict[str, Any] = {}
        steps = 0

        while steps < max_steps:
            steps += 1
            agent_node = self._agents[current_agent]

            tracer.start_span(agent_node.name, "execute", current_input)

            try:
                result = await agent_node.execute(current_input, session_memory, tracer)

                session_memory.add(
                    session_id,
                    MemoryEntry(role="agent", content=result.message, metadata={"agent": agent_node.name}),
                )

                tracer.end_span(output_data=result.data)

                aggregated_results[agent_node.name] = result.data

                if result.action == AgentAction.COMPLETE:
                    logger.info(f"[{session_id}] Pipeline complete after {steps} steps")
                    break
                elif result.action == AgentAction.HANDOFF and result.next_agent:
                    logger.info(f"[{session_id}] Handoff: {current_agent} → {result.next_agent}")
                    current_agent = result.next_agent
                    current_input = {**current_input, **result.data}
                elif result.action == AgentAction.ERROR:
                    logger.error(f"[{session_id}] Agent {current_agent} error: {result.message}")
                    tracer.end_span(error=result.message)
                    break
                else:
                    current_input = {**current_input, **result.data}

            except Exception as e:
                logger.exception(f"[{session_id}] Agent {current_agent} exception")
                tracer.end_span(error=str(e))
                aggregated_results[agent_node.name] = {"error": str(e)}
                break

        return {
            "session_id": session_id,
            "steps": steps,
            "results": aggregated_results,
            "traces": tracer.get_traces(),
            "total_latency_ms": tracer.total_latency_ms,
        }
