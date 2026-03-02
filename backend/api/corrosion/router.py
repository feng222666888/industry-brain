"""Corrosion prevention API — Scenario 4: Intelligent Anti-Corrosion.

Endpoints for corrosion object identification, risk assessment,
data overview, and analysis history.
"""

from __future__ import annotations

import json
import logging
from typing import Any, AsyncGenerator

from fastapi import APIRouter, Body
from fastapi.responses import StreamingResponse

from backend.models.schemas import APIResponse
from backend.industries.petrochemical.agents.corrosion.pipeline import corrosion_pipeline

logger = logging.getLogger(__name__)
router = APIRouter()

DEMO_OBJECTS = [
    {
        "id": "EQ-CDU-T101",
        "name": "常压塔T-101",
        "type": "equipment",
        "material": "碳钢(Q345R)",
        "medium": "原油/石脑油",
        "location": "常减压装置",
        "wall_thickness_mm": 28.0,
        "install_date": "2018-06-15",
    },
    {
        "id": "EQ-FCC-R201",
        "name": "催化反应器R-201",
        "type": "equipment",
        "material": "Cr-Mo钢(15CrMoR)",
        "medium": "重油/催化剂",
        "location": "催化裂化装置",
        "wall_thickness_mm": 32.0,
        "install_date": "2019-03-22",
    },
    {
        "id": "PL-H2S-001",
        "name": "含硫污水管线-001",
        "type": "pipeline",
        "material": "碳钢(20#)",
        "medium": "含H₂S酸性水",
        "location": "硫磺回收装置",
        "wall_thickness_mm": 8.0,
        "install_date": "2020-01-10",
    },
    {
        "id": "PL-AMINE-002",
        "name": "胺液再生管线-002",
        "type": "pipeline",
        "material": "碳钢(20G)",
        "medium": "MEA胺液",
        "location": "脱硫装置",
        "wall_thickness_mm": 6.5,
        "install_date": "2019-08-05",
    },
    {
        "id": "CP-PUMP-IMP01",
        "name": "离心泵叶轮-01",
        "type": "component",
        "material": "双相不锈钢(2205)",
        "medium": "含固催化剂浆液",
        "location": "催化裂化装置",
        "wall_thickness_mm": 12.0,
        "install_date": "2021-04-18",
    },
    {
        "id": "FT-ELBOW-003",
        "name": "催化剂输送弯头-003",
        "type": "fitting",
        "material": "耐磨合金钢",
        "medium": "催化剂粉末/蒸汽",
        "location": "再生器管线",
        "wall_thickness_mm": 10.0,
        "install_date": "2020-11-30",
    },
]

DATA_DOMAIN_STATS = {
    "original": {
        "total_records": 52817,
        "domains": [
            {"name": "设备", "count": 19960, "pct": "37.8%"},
            {"name": "管道", "count": 13743, "pct": "26.0%"},
            {"name": "部件", "count": 15106, "pct": "28.6%"},
            {"name": "管件", "count": 2060, "pct": "3.9%"},
            {"name": "腐蚀分子", "count": 1849, "pct": "3.5%"},
            {"name": "腐蚀机理", "count": 99, "pct": "0.18%"},
        ],
    },
    "augmented": {
        "total_records": 580000,
        "sources": [
            {"name": "客户原始数据", "count": 52817},
            {"name": "工程院专业数据", "count": 102583},
            {"name": "模型蒸馏生成", "count": 425600},
        ],
        "balanced_domains": [
            {"name": "设备", "pct": "21.5%"},
            {"name": "管道", "pct": "17.5%"},
            {"name": "部件", "pct": "18.1%"},
            {"name": "管件", "pct": "16.9%"},
            {"name": "腐蚀分子", "pct": "13.3%"},
            {"name": "腐蚀机理", "pct": "12.7%"},
        ],
    },
    "risk_model": {
        "total_records": 480000,
        "domains": [
            {"name": "设备类", "pct": "35%"},
            {"name": "管道类", "pct": "32%"},
            {"name": "部件类", "pct": "33%"},
        ],
    },
}

_analysis_history: list[dict[str, Any]] = []


@router.get("/overview")
async def corrosion_overview():
    """Data overview: domain distribution, model stats, object counts."""
    return APIResponse(
        code=0,
        data={
            "data_stats": DATA_DOMAIN_STATS,
            "total_objects": len(DEMO_OBJECTS),
            "models": [
                {
                    "id": "identify",
                    "name": "腐蚀对象识别模型",
                    "training_data": "58万条",
                    "domains": 6,
                    "accuracy": "92.3%",
                },
                {
                    "id": "risk",
                    "name": "腐蚀风险评估模型",
                    "training_data": "48万条",
                    "domains": 3,
                    "accuracy": "89.7%",
                },
            ],
        },
    )


@router.get("/objects")
async def list_corrosion_objects(type: str = ""):
    """List equipment, pipelines, components, fittings for corrosion monitoring."""
    objects = DEMO_OBJECTS
    if type:
        objects = [o for o in objects if o["type"] == type]
    return APIResponse(code=0, data={"objects": objects, "total": len(objects)})


@router.post("/analyze")
async def analyze_corrosion(body: dict[str, Any] = Body(default={})):
    """Run full corrosion analysis pipeline (identify → risk) via SSE stream."""
    object_id = body.get("object_id", "")
    obj = next((o for o in DEMO_OBJECTS if o["id"] == object_id), None)

    if not obj:
        async def error_stream() -> AsyncGenerator[str, None]:
            yield f"event: error\ndata: {json.dumps({'code': 404, 'message': f'Object {object_id} not found'}, ensure_ascii=False)}\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    object_type = obj["type"]

    async def event_stream() -> AsyncGenerator[str, None]:
        result = await corrosion_pipeline.run(
            session_id=f"corrosion-{object_id}",
            entry_agent="identify",
            initial_input={
                "object_type": object_type,
                "object_name": obj["name"],
                "material": obj["material"],
                "medium": obj["medium"],
            },
        )

        for trace in result.get("traces", []):
            yield f"event: agent_step\ndata: {json.dumps(trace, ensure_ascii=False)}\n\n"

        final_data = result.get("results", {}).get("risk", result.get("results", {}))
        _analysis_history.append({
            "object_id": object_id,
            "object_name": obj["name"],
            "result": final_data,
        })

        yield f"event: complete\ndata: {json.dumps({'session_id': result['session_id'], 'total_latency_ms': result['total_latency_ms'], 'results': result['results']}, ensure_ascii=False, default=str)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/identify")
async def identify_only(body: dict[str, Any] = Body(default={})):
    """Quick identification without full pipeline — returns corrosion mechanisms."""
    from backend.industries.petrochemical.agents.corrosion.identify_agent import (
        CORROSION_KNOWLEDGE_BASE,
    )

    object_type = body.get("object_type", "equipment")
    category = object_type if object_type in CORROSION_KNOWLEDGE_BASE else "equipment"
    mechanisms = [
        {k: v for k, v in m.items() if k != "match_keywords"}
        for m in CORROSION_KNOWLEDGE_BASE.get(category, [])
    ]

    return APIResponse(
        code=0,
        data={
            "object_type": object_type,
            "mechanisms": mechanisms,
            "count": len(mechanisms),
        },
    )


@router.get("/history")
async def analysis_history(limit: int = 20):
    """Recent corrosion analysis history."""
    return APIResponse(
        code=0,
        data={"history": _analysis_history[-limit:], "total": len(_analysis_history)},
    )
