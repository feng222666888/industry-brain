"""End-to-end orchestration for scraping state, dedup, and incremental update."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from data_pipeline.scrapers.core.dedup import canonicalize_url, deduplicate_records
from data_pipeline.scrapers.core.incremental import detect_change
from data_pipeline.scrapers.core.models import RawRecord
from data_pipeline.scrapers.core.scheduler import SourceTask
from data_pipeline.scrapers.core.state_store import load_state, make_state_key, save_state


@dataclass
class PipelineReport:
    trigger: str
    selected_sources: list[str] = field(default_factory=list)
    input_records: int = 0
    kept_records: int = 0
    dropped_duplicates: int = 0
    new_records: int = 0
    updated_records: int = 0
    unchanged_records: int = 0


def run_pipeline_once(
    trigger: str,
    tasks: list[SourceTask],
    records_by_source: dict[str, list[RawRecord]],
    state_path: str,
    persist_state: bool = True,
) -> tuple[list[RawRecord], PipelineReport]:
    """Run one pipeline cycle for selected tasks.

    Args:
        trigger: bootstrap/periodic/event
        tasks: selected source tasks
        records_by_source: input records grouped by source_id
        state_path: file path to incremental state store
        persist_state: if false, do not write state (dry-run)
    """
    report = PipelineReport(trigger=trigger, selected_sources=[t.source_id for t in tasks])
    state = load_state(state_path)

    candidates: list[RawRecord] = []
    for task in tasks:
        candidates.extend(records_by_source.get(task.source_id, []))
    report.input_records = len(candidates)

    deduped, dropped = deduplicate_records(candidates)
    report.kept_records = len(deduped)
    report.dropped_duplicates = len(dropped)

    selected: list[RawRecord] = []
    now = datetime.now(timezone.utc)
    for record in deduped:
        url = canonicalize_url(record.meta.source_url)
        key = make_state_key(record.meta.source_id, url)
        previous_raw = state.get(key)
        previous = None
        if isinstance(previous_raw, dict):
            try:
                from data_pipeline.scrapers.core.incremental import IncrementalState

                previous = IncrementalState(
                    source_id=record.meta.source_id,
                    canonical_url=url,
                    last_seen_at=now,
                    last_content_hash=str(previous_raw.get("last_content_hash", "")),
                )
            except Exception:  # noqa: BLE001
                previous = None

        decision, new_state = detect_change(
            previous=previous,
            source_id=record.meta.source_id,
            canonical_url=url,
            content=record.content,
            now=now,
        )
        state[key] = {
            "source_id": new_state.source_id,
            "canonical_url": new_state.canonical_url,
            "last_seen_at": new_state.last_seen_at.isoformat(),
            "last_content_hash": new_state.last_content_hash,
        }
        if decision == "new":
            report.new_records += 1
            selected.append(record)
        elif decision == "updated":
            report.updated_records += 1
            selected.append(record)
        else:
            report.unchanged_records += 1

    if persist_state:
        save_state(state_path, state)
    return selected, report

