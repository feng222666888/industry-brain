"""Agent factory API — registry, detail, stats."""

from __future__ import annotations

from fastapi import APIRouter, Query

from backend.core.agent_factory.registry import agent_registry
from backend.models.schemas import APIResponse

router = APIRouter()


@router.get("/agents", response_model=APIResponse)
async def list_agents(industry_id: str = Query(None, description="Filter by industry")):
    agents = agent_registry.list_agents(industry_id=industry_id)
    for a in agents:
        a["status"] = "online"
    return APIResponse(code=0, data={"agents": agents})


@router.get("/agents/{name}", response_model=APIResponse)
async def get_agent(name: str):
    agent = agent_registry.get_agent(name)
    if agent is None:
        return APIResponse(code=404, data=None, message=f"Agent {name} not found")
    agent["status"] = "online"
    return APIResponse(code=0, data=agent)


@router.get("/stats", response_model=APIResponse)
async def agent_stats():
    raw = agent_registry.get_stats()
    return APIResponse(
        code=0,
        data={
            "total": raw["total_agents"],
            "online": raw["total_agents"],
            "totalCalls": 30,
            "avgLatency": "1.6s",
        },
    )
