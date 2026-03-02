"""Session memory — maintains conversation context per agent session.

Provides short-term (in-session) and cross-session context for agents.
Backed by Redis for fast access, persisted to PostgreSQL for durability.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class MemoryEntry:
    role: str  # "user" | "agent" | "tool" | "system"
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)


class SessionMemory:
    """In-memory session store (Redis-backed in production)."""

    def __init__(self):
        self._sessions: dict[str, list[MemoryEntry]] = {}

    def create_session(self, session_id: str, context: dict[str, Any] | None = None) -> None:
        self._sessions[session_id] = []
        if context:
            self.add(session_id, MemoryEntry(role="system", content=json.dumps(context, ensure_ascii=False)))

    def add(self, session_id: str, entry: MemoryEntry) -> None:
        if session_id not in self._sessions:
            self._sessions[session_id] = []
        self._sessions[session_id].append(entry)

    def get_history(self, session_id: str, last_n: int | None = None) -> list[MemoryEntry]:
        history = self._sessions.get(session_id, [])
        if last_n:
            return history[-last_n:]
        return history

    def get_context_messages(self, session_id: str) -> list[dict[str, str]]:
        """Convert to LLM-compatible message format."""
        return [{"role": e.role, "content": e.content} for e in self.get_history(session_id)]

    def clear(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)


session_memory = SessionMemory()
