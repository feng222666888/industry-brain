"""Data governance API endpoints for audit and source health."""

from __future__ import annotations

from fastapi import APIRouter, Query

from backend.models.schemas import APIResponse
from data_pipeline.governance.audit_log import read_audit_events
from data_pipeline.scrapers.core.scheduler import load_registry
from data_pipeline.scrapers.core.state_store import load_state

router = APIRouter()

REGISTRY_PATH = "data_pipeline/scrapers/config/source_registry.yaml"
STATE_PATH = "data_pipeline/seed_data/petrochemical/source_state.json"


@router.get("/audit-events", response_model=APIResponse)
async def get_audit_events(limit: int = Query(20, ge=1, le=200)):
    events = read_audit_events(limit=limit)
    return APIResponse(data={"events": events, "count": len(events)})


@router.get("/source-health", response_model=APIResponse)
async def get_source_health():
    registry = load_registry(REGISTRY_PATH)
    state = load_state(STATE_PATH)

    health = []
    for item in registry.get("sources", []):
        source_id = item.get("source_id", "")
        source_states = [v for k, v in state.items() if k.startswith(f"{source_id}::")]
        last_seen = None
        if source_states:
            source_states.sort(key=lambda x: str(x.get("last_seen_at", "")))
            last_seen = source_states[-1].get("last_seen_at")
        health.append(
            {
                "source_id": source_id,
                "scenario_id": item.get("scenario_id"),
                "enabled": item.get("enabled", False),
                "mode": (item.get("refresh_policy", {}) or {}).get("mode"),
                "state_count": len(source_states),
                "last_seen_at": last_seen,
            }
        )
    return APIResponse(data={"sources": health, "count": len(health)})


@router.get("/quality-report", response_model=APIResponse)
async def get_quality_report(limit: int = Query(50, ge=1, le=500)):
    events = read_audit_events(limit=limit)
    pipeline_events = [e for e in events if e.get("event_type") == "pipeline_run"]
    summary = {
        "runs": len(pipeline_events),
        "input_records": sum(int(e.get("input_records", 0)) for e in pipeline_events),
        "kept_records": sum(int(e.get("kept_records", 0)) for e in pipeline_events),
        "new_records": sum(int(e.get("new_records", 0)) for e in pipeline_events),
        "updated_records": sum(int(e.get("updated_records", 0)) for e in pipeline_events),
        "unchanged_records": sum(int(e.get("unchanged_records", 0)) for e in pipeline_events),
    }
    return APIResponse(data={"summary": summary, "events": pipeline_events[-10:]})

