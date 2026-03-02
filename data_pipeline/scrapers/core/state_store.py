"""Persistent state helpers for incremental crawling."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def make_state_key(source_id: str, canonical_url: str) -> str:
    return f"{source_id}::{canonical_url}"


def load_state(path: str | Path) -> dict[str, Any]:
    p = Path(path)
    if not p.exists():
        return {}
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def save_state(path: str | Path, state: dict[str, Any]) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2, sort_keys=True)

