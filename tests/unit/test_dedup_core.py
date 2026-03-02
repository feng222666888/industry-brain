from datetime import datetime

from data_pipeline.scrapers.core.dedup import canonicalize_url, content_hash, deduplicate_records
from data_pipeline.scrapers.core.models import DatasetMeta, RawRecord


def _mk_record(record_id: str, url: str, content: str) -> RawRecord:
    return RawRecord(
        record_id=record_id,
        title=f"title-{record_id}",
        content=content,
        meta=DatasetMeta(
            source_id="test-source",
            source_url=url,
            industry_id="petrochemical",
            scenario_id="device_maintenance",
            acquired_at=datetime(2026, 3, 1, 12, 0, 0),
            content_hash="",
        ),
    )


def test_canonicalize_url_removes_tracking_params():
    src = "HTTPS://MEM.GOV.CN//gk/sgcc/?utm_source=abc&id=42&spm=xyz"
    result = canonicalize_url(src)
    assert result == "https://mem.gov.cn/gk/sgcc?id=42"


def test_content_hash_normalizes_whitespace():
    assert content_hash("a  b\n c") == content_hash("a b c")


def test_deduplicate_records_by_url_and_content():
    records = [
        _mk_record("r1", "https://mem.gov.cn/a?id=1&utm_source=x", "hello world"),
        _mk_record("r2", "https://mem.gov.cn/a?id=1", "hello world v2"),
        _mk_record("r3", "https://mem.gov.cn/b?id=2", "hello world"),
        _mk_record("r4", "https://mem.gov.cn/c?id=3", "fresh content"),
    ]

    kept, dropped = deduplicate_records(records)
    kept_ids = [x.record_id for x in kept]
    dropped_reasons = {x["record_id"]: x["reason"] for x in dropped}

    assert kept_ids == ["r1", "r4"]
    assert dropped_reasons["r2"] == "duplicate_url"
    assert dropped_reasons["r3"] == "duplicate_content"

