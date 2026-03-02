"""CLI entrypoint for running scraper pipeline in dry-run mode."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path

from data_pipeline.governance.audit_log import append_audit_event
from data_pipeline.scrapers.core.models import DatasetMeta, RawRecord
from data_pipeline.scrapers.core.pipeline import run_pipeline_once
from data_pipeline.scrapers.core.scheduler import load_and_select
from data_pipeline.scrapers.fetchers.registry import fetch_for_tasks


def _build_demo_records(source_id: str) -> list[RawRecord]:
    now = datetime.now(timezone.utc)
    return [
        RawRecord(
            record_id=f"{source_id}-001",
            title=f"{source_id} demo bulletin",
            content=f"demo content from {source_id}",
            meta=DatasetMeta(
                source_id=source_id,
                source_url=f"https://example.org/{source_id}?utm_source=demo",
                industry_id="petrochemical",
                scenario_id="device_maintenance",
                acquired_at=now,
                content_hash="",
            ),
        )
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description="Run scraper pipeline one cycle.")
    parser.add_argument("--trigger", default="periodic", choices=["bootstrap", "periodic", "event"])
    parser.add_argument(
        "--registry",
        default="data_pipeline/scrapers/config/source_registry.yaml",
        help="Path to source registry yaml.",
    )
    parser.add_argument(
        "--state",
        default="data_pipeline/seed_data/petrochemical/source_state.json",
        help="Path to incremental state json.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Run without persisting state.")
    parser.add_argument("--live", action="store_true", help="Use live HTTP fetch where implemented.")
    args = parser.parse_args()

    tasks = load_and_select(args.registry, trigger=args.trigger)
    records_by_source = fetch_for_tasks(tasks, live=args.live)
    if not records_by_source:
        records_by_source = {}
        for task in tasks:
            records_by_source[task.source_id] = _build_demo_records(task.source_id)

    selected, report = run_pipeline_once(
        trigger=args.trigger,
        tasks=tasks,
        records_by_source=records_by_source,
        state_path=args.state,
        persist_state=not args.dry_run,
    )

    print(f"[pipeline] trigger={report.trigger} sources={len(report.selected_sources)}")
    print(
        f"[pipeline] input={report.input_records} kept={report.kept_records} "
        f"new={report.new_records} updated={report.updated_records} unchanged={report.unchanged_records}"
    )
    print(f"[pipeline] selected_for_curation={len(selected)}")
    audit_payload = {
        "event_type": "pipeline_run",
        "trigger": report.trigger,
        "selected_sources": report.selected_sources,
        "input_records": report.input_records,
        "kept_records": report.kept_records,
        "new_records": report.new_records,
        "updated_records": report.updated_records,
        "unchanged_records": report.unchanged_records,
    }
    append_audit_event(audit_payload)
    print("[pipeline] governance audit appended")
    if args.dry_run:
        print("[pipeline] dry-run mode; state not persisted")
    else:
        print(f"[pipeline] state persisted -> {Path(args.state).as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

