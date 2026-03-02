from data_pipeline.scrapers.core.scheduler import SourceTask
from data_pipeline.scrapers.fetchers.registry import fetch_for_task, fetch_for_tasks


def test_fetch_for_task_mock_mem():
    task = SourceTask(
        source_id="mem_incident_bulletin",
        scenario_id="device_maintenance",
        mode="periodic",
        interval="daily",
        enabled=True,
    )
    records = fetch_for_task(task, live=False)
    assert len(records) >= 1
    assert records[0].meta.source_id == "mem_incident_bulletin"


def test_fetch_for_tasks_default_source():
    tasks = [
        SourceTask(
            source_id="unknown_source_x",
            scenario_id="process_optimization",
            mode="event",
            interval="on_trigger",
            enabled=True,
        )
    ]
    result = fetch_for_tasks(tasks, live=False)
    assert "unknown_source_x" in result
    assert len(result["unknown_source_x"]) == 1

