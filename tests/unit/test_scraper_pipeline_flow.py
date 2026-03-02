from datetime import datetime, timezone

from data_pipeline.scrapers.core.models import DatasetMeta, RawRecord
from data_pipeline.scrapers.core.pipeline import run_pipeline_once
from data_pipeline.scrapers.core.scheduler import SourceTask


def _record(source_id: str, rid: str, url: str, content: str) -> RawRecord:
    return RawRecord(
        record_id=rid,
        title=rid,
        content=content,
        meta=DatasetMeta(
            source_id=source_id,
            source_url=url,
            industry_id="petrochemical",
            scenario_id="device_maintenance",
            acquired_at=datetime.now(timezone.utc),
            content_hash="",
        ),
    )


def test_pipeline_new_then_unchanged_then_updated(tmp_path):
    state_path = str(tmp_path / "state.json")
    tasks = [SourceTask(source_id="s1", scenario_id="device_maintenance", mode="periodic", interval="daily", enabled=True)]

    first_records = {
        "s1": [_record("s1", "r1", "https://example.com/a?utm_source=x", "alpha content")]
    }
    selected1, report1 = run_pipeline_once("periodic", tasks, first_records, state_path, persist_state=True)
    assert len(selected1) == 1
    assert report1.new_records == 1

    second_records = {
        "s1": [_record("s1", "r2", "https://example.com/a", "alpha content")]
    }
    selected2, report2 = run_pipeline_once("periodic", tasks, second_records, state_path, persist_state=True)
    assert len(selected2) == 0
    assert report2.unchanged_records == 1

    third_records = {
        "s1": [_record("s1", "r3", "https://example.com/a", "alpha content changed")]
    }
    selected3, report3 = run_pipeline_once("periodic", tasks, third_records, state_path, persist_state=True)
    assert len(selected3) == 1
    assert report3.updated_records == 1

