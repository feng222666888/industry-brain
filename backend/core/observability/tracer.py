"""Agent call chain tracer — records every agent step for the observability dashboard.

Traces are stored in-memory during a session, then persisted to agent_traces table.
Supports SSE streaming of trace events to the frontend in real-time.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class TraceSpan:
    agent_name: str
    action: str
    input_data: dict[str, Any] = field(default_factory=dict)
    output_data: dict[str, Any] = field(default_factory=dict)
    tools_called: list[str] = field(default_factory=list)
    start_time: float = 0.0
    end_time: float = 0.0
    error: str | None = None

    @property
    def latency_ms(self) -> int:
        return int((self.end_time - self.start_time) * 1000)

    def to_dict(self) -> dict:
        return {
            "agent_name": self.agent_name,
            "action": self.action,
            "input_summary": _summarize(self.input_data),
            "output_summary": _summarize(self.output_data),
            "tools_called": self.tools_called,
            "latency_ms": self.latency_ms,
            "error": self.error,
        }


class SessionTracer:
    """Collects trace spans for a single agent session."""

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.spans: list[TraceSpan] = []
        self._current_span: TraceSpan | None = None

    def start_span(self, agent_name: str, action: str, input_data: dict | None = None) -> TraceSpan:
        span = TraceSpan(
            agent_name=agent_name,
            action=action,
            input_data=input_data or {},
            start_time=time.time(),
        )
        self._current_span = span
        self.spans.append(span)
        logger.info(f"[{self.session_id}] {agent_name}.{action} started")
        return span

    def end_span(self, output_data: dict | None = None, tools_called: list[str] | None = None, error: str | None = None) -> None:
        if self._current_span:
            self._current_span.end_time = time.time()
            self._current_span.output_data = output_data or {}
            self._current_span.tools_called = tools_called or []
            self._current_span.error = error
            logger.info(
                f"[{self.session_id}] {self._current_span.agent_name}.{self._current_span.action} "
                f"completed in {self._current_span.latency_ms}ms"
            )
            self._current_span = None

    def get_traces(self) -> list[dict]:
        return [s.to_dict() for s in self.spans]

    @property
    def total_latency_ms(self) -> int:
        return sum(s.latency_ms for s in self.spans)


def _summarize(data: dict, max_len: int = 200) -> str:
    s = str(data)
    return s[:max_len] + "..." if len(s) > max_len else s
