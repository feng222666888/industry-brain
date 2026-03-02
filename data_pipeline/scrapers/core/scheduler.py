"""Scheduling policy helpers for bootstrap/periodic/event crawling."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class SourceTask:
    source_id: str
    scenario_id: str
    mode: str
    interval: str
    enabled: bool


def load_registry(path: str | Path) -> dict[str, Any]:
    """Load YAML registry.

    This function keeps dependency explicit: install PyYAML in runtime env.
    """
    try:
        import yaml  # type: ignore
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError("PyYAML is required to load source_registry.yaml") from exc

    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def select_tasks(registry: dict[str, Any], trigger: str = "periodic") -> list[SourceTask]:
    """Select source tasks by trigger type.

    trigger:
      - "bootstrap": one-time initialization
      - "periodic": routine update
      - "event": event-driven refresh
    """
    tasks: list[SourceTask] = []
    for item in registry.get("sources", []):
        policy = item.get("refresh_policy", {})
        mode = str(policy.get("mode", "periodic"))
        if not item.get("enabled", False):
            continue
        if mode != trigger:
            continue
        tasks.append(
            SourceTask(
                source_id=str(item.get("source_id", "")),
                scenario_id=str(item.get("scenario_id", "")),
                mode=mode,
                interval=str(policy.get("interval", "")),
                enabled=True,
            )
        )
    return tasks


def load_and_select(path: str | Path, trigger: str = "periodic") -> list[SourceTask]:
    """Convenience helper for scheduler entrypoints."""
    registry = load_registry(path)
    return select_tasks(registry, trigger=trigger)

