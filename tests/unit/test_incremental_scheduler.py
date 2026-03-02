from datetime import datetime

from data_pipeline.scrapers.core.incremental import IncrementalState, detect_change
from data_pipeline.scrapers.core.scheduler import select_tasks


def test_detect_change_new_updated_unchanged():
    now = datetime(2026, 3, 2, 9, 0, 0)
    decision, state = detect_change(
        previous=None,
        source_id="src-1",
        canonical_url="https://example.com/a",
        content="alpha",
        now=now,
    )
    assert decision == "new"

    decision2, state2 = detect_change(
        previous=state,
        source_id="src-1",
        canonical_url="https://example.com/a",
        content="alpha",
        now=now,
    )
    assert decision2 == "unchanged"

    decision3, _ = detect_change(
        previous=state2,
        source_id="src-1",
        canonical_url="https://example.com/a",
        content="beta",
        now=now,
    )
    assert decision3 == "updated"


def test_select_tasks_by_trigger():
    registry = {
        "sources": [
            {
                "source_id": "s1",
                "scenario_id": "device_maintenance",
                "enabled": True,
                "refresh_policy": {"mode": "periodic", "interval": "daily"},
            },
            {
                "source_id": "s2",
                "scenario_id": "catalyst_research",
                "enabled": True,
                "refresh_policy": {"mode": "event", "interval": "on_trigger"},
            },
            {
                "source_id": "s3",
                "scenario_id": "process_optimization",
                "enabled": False,
                "refresh_policy": {"mode": "periodic", "interval": "weekly"},
            },
        ]
    }

    periodic = select_tasks(registry, trigger="periodic")
    event = select_tasks(registry, trigger="event")

    assert len(periodic) == 1
    assert periodic[0].source_id == "s1"
    assert len(event) == 1
    assert event[0].source_id == "s2"

