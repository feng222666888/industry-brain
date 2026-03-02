"""Audit logging for scraper/governance pipeline events."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_AUDIT_PATH = "data_pipeline/seed_data/petrochemical/governance_audit.jsonl"


def append_audit_event(event: dict[str, Any], path: str = DEFAULT_AUDIT_PATH) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    payload = {"timestamp": datetime.now(timezone.utc).isoformat(), **event}
    with open(p, "a", encoding="utf-8") as f:
        f.write(json.dumps(payload, ensure_ascii=False) + "\n")


def read_audit_events(limit: int = 50, path: str = DEFAULT_AUDIT_PATH) -> list[dict[str, Any]]:
    p = Path(path)
    if not p.exists():
        return []
    with open(p, "r", encoding="utf-8") as f:
        lines = [line.strip() for line in f.readlines() if line.strip()]
    selected = lines[-limit:] if limit > 0 else lines
    out: list[dict[str, Any]] = []
    for line in selected:
        try:
            out.append(json.loads(line))
        except Exception:  # noqa: BLE001
            continue
    return out

