"""Incremental update state and change detection helpers."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from data_pipeline.scrapers.core.dedup import content_hash


@dataclass
class IncrementalState:
    source_id: str
    canonical_url: str
    last_seen_at: datetime
    last_content_hash: str


def detect_change(
    previous: IncrementalState | None,
    source_id: str,
    canonical_url: str,
    content: str,
    now: datetime,
) -> tuple[str, IncrementalState]:
    """Detect whether a record is new, updated, or unchanged.

    Returns:
        (decision, new_state), where decision is one of:
        - "new"
        - "updated"
        - "unchanged"
    """
    new_hash = content_hash(content)
    new_state = IncrementalState(
        source_id=source_id,
        canonical_url=canonical_url,
        last_seen_at=now,
        last_content_hash=new_hash,
    )

    if previous is None:
        return "new", new_state
    if previous.last_content_hash != new_hash:
        return "updated", new_state
    return "unchanged", new_state

