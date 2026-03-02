"""Source fetcher registry with mock/live modes."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx

from data_pipeline.governance.compliance import check_compliance
from data_pipeline.scrapers.core.models import DatasetMeta, RawRecord
from data_pipeline.scrapers.core.scheduler import SourceTask


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _mk_record(source_id: str, scenario_id: str, url: str, title: str, content: str) -> RawRecord:
    return RawRecord(
        record_id=f"{source_id}-{int(_now().timestamp())}",
        title=title,
        content=content,
        meta=DatasetMeta(
            source_id=source_id,
            source_url=url,
            industry_id="petrochemical",
            scenario_id=scenario_id,
            acquired_at=_now(),
            content_hash="",
        ),
    )


def _fetch_mem_incident(task: SourceTask, live: bool = False) -> list[RawRecord]:
    url = "https://www.mem.gov.cn"
    if live:
        try:
            resp = httpx.get(url, timeout=10.0)
            content = resp.text[:1200]
            title = "应急管理部首页快照"
            return [_mk_record(task.source_id, task.scenario_id, url, title, content)]
        except Exception:  # noqa: BLE001
            pass
    return [
        _mk_record(
            task.source_id,
            task.scenario_id,
            "https://www.mem.gov.cn/gk/sgcc/",
            "应急管理公开信息（mock）",
            "mock incident bulletin content for device maintenance",
        )
    ]


def _fetch_nea_policy(task: SourceTask, live: bool = False) -> list[RawRecord]:
    url = "https://www.nea.gov.cn"
    if live:
        try:
            resp = httpx.get(url, timeout=10.0)
            content = resp.text[:1200]
            title = "国家能源局首页快照"
            return [_mk_record(task.source_id, task.scenario_id, url, title, content)]
        except Exception:  # noqa: BLE001
            pass
    return [
        _mk_record(
            task.source_id,
            task.scenario_id,
            "https://www.nea.gov.cn/",
            "国家能源政策信息（mock）",
            "mock energy policy content for process optimization",
        )
    ]


def _default_fetch(task: SourceTask) -> list[RawRecord]:
    return [
        _mk_record(
            task.source_id,
            task.scenario_id,
            f"https://example.org/{task.source_id}",
            f"{task.source_id} mock payload",
            f"mock content for {task.source_id}",
        )
    ]


FETCHER_MAP = {
    "mem_incident_bulletin": _fetch_mem_incident,
    "nea_policy": _fetch_nea_policy,
}


def fetch_for_task(task: SourceTask, live: bool = False) -> list[RawRecord]:
    fn = FETCHER_MAP.get(task.source_id)
    records = fn(task, live=live) if fn else _default_fetch(task)
    compliant: list[RawRecord] = []
    for item in records:
        result = check_compliance(item.meta.source_url)
        if result.get("robots_ok", False):
            compliant.append(item)
    return compliant


def fetch_for_tasks(tasks: list[SourceTask], live: bool = False) -> dict[str, list[RawRecord]]:
    out: dict[str, list[RawRecord]] = {}
    for task in tasks:
        out[task.source_id] = fetch_for_task(task, live=live)
    return out

