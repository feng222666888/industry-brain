"""Catalyst SEM/TEM image analysis API — Scenario 2."""

from __future__ import annotations

import uuid

from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.core.memory.session_memory import session_memory
from backend.core.observability.tracer import SessionTracer
from backend.industries.petrochemical.agents.catalyst.research_agent import run as research_agent_run
from backend.models.schemas import APIResponse

router = APIRouter()


class AnalyzeImageRequest(BaseModel):
    """Request model for catalyst image analysis (MVP: no file upload)."""

    catalyst_type: str = Field("FCC", description="Type of catalyst (e.g., FCC, reform)")
    image_description: str = Field("催化裂化催化剂SEM形貌", description="Text description of the image")


# Hardcoded demo knowledge graph: 6-8 nodes and edges for catalyst relationships
DEMO_KNOWLEDGE_GRAPH = {
    "nodes": [
        {"id": "n1", "label": "FCC催化剂", "type": "catalyst", "properties": {"industry": "petrochemical"}},
        {"id": "n2", "label": "分子筛载体", "type": "carrier", "properties": {"type": "zeolite"}},
        {"id": "n3", "label": "ZSM-5", "type": "additive", "properties": {"function": "汽油增产"}},
        {"id": "n4", "label": "稀土改性", "type": "modification", "properties": {"element": "La,Ce"}},
        {"id": "n5", "label": "USY分子筛", "type": "zeolite", "properties": {"structure": "超稳Y型"}},
        {"id": "n6", "label": "提高活性", "type": "effect", "properties": {}},
        {"id": "n7", "label": "Pt-Re双金属", "type": "active_site", "properties": {"application": "重整"}},
        {"id": "n8", "label": "氧化铝载体", "type": "carrier", "properties": {}},
    ],
    "edges": [
        {"source": "n1", "target": "n2", "relation": "负载于"},
        {"source": "n1", "target": "n3", "relation": "含添加剂"},
        {"source": "n4", "target": "n5", "relation": "改性"},
        {"source": "n4", "target": "n6", "relation": "导致"},
        {"source": "n5", "target": "n1", "relation": "应用于"},
        {"source": "n7", "target": "n8", "relation": "负载于"},
        {"source": "n7", "target": "n1", "relation": "区别于"},  # Different scenario
    ],
}


@router.post("/analyze-image", response_model=APIResponse)
async def analyze_catalyst_image(request: AnalyzeImageRequest):
    """Analyze catalyst SEM/TEM image via research_agent (MVP: no file upload, JSON body only)."""
    try:
        session_id = f"cat-{uuid.uuid4().hex[:8]}"
        tracer = SessionTracer(session_id)
        session_memory.create_session(session_id, context={"request": request.model_dump()})

        input_data = {
            "catalyst_type": request.catalyst_type,
            "image_description": request.image_description,
        }

        result = await research_agent_run(input_data, session_memory, tracer)

        return APIResponse(
            code=0,
            data=result.data,
            message=result.message or "ok",
        )
    except Exception as e:
        return APIResponse(
            code=1,
            data=None,
            message=str(e),
        )


@router.get("/knowledge-graph", response_model=APIResponse)
async def query_catalyst_graph(query: str = ""):
    """Query catalyst knowledge graph (returns demo data with 6-8 nodes and edges)."""
    return APIResponse(
        code=0,
        data={
            "query": query,
            "nodes": DEMO_KNOWLEDGE_GRAPH["nodes"],
            "edges": DEMO_KNOWLEDGE_GRAPH["edges"],
            "description": "催化裂化与重整催化剂知识图谱：FCC催化剂、分子筛载体、ZSM-5、稀土改性、USY等节点及其关系。",
        },
        message="ok",
    )
