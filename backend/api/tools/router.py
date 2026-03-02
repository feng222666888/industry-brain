"""Tools registry API — catalog, stats, endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Request

from backend.models.schemas import APIResponse

router = APIRouter()

TOOL_REGISTRY = [
    {
        "id": "knowledge_search",
        "name": "知识检索",
        "description": "基于 pgvector 的语义搜索与 Neo4j 图谱查询",
        "tags": ["retrieval"],
        "status": "available",
        "calls": 45,
        "avgLatency": "120ms",
    },
    {
        "id": "simulation",
        "name": "仿真沙盒",
        "description": "TEP 工艺仿真引擎，支持参数空间探索与安全验证",
        "tags": ["simulation"],
        "status": "available",
        "calls": 30,
        "avgLatency": "850ms",
    },
    {
        "id": "web_browser",
        "name": "Web 浏览器",
        "description": "网页信息采集，用于事件触发补采与法规追踪",
        "tags": ["browser"],
        "status": "available",
        "calls": 12,
        "avgLatency": "2100ms",
    },
    {
        "id": "api_connector",
        "name": "API 连接器",
        "description": "外部系统 API 集成（DCS/SCADA/LIMS）",
        "tags": ["api"],
        "status": "unavailable",
        "calls": 0,
        "avgLatency": "—",
    },
]


@router.get("/registry", response_model=APIResponse)
async def tool_registry():
    return APIResponse(code=0, data={"tools": TOOL_REGISTRY})


@router.get("/stats", response_model=APIResponse)
async def tool_stats():
    return APIResponse(
        code=0,
        data={
            "tools": [
                {"id": t["id"], "name": t["name"], "calls": t["calls"], "avgLatency": t["avgLatency"]}
                for t in TOOL_REGISTRY
            ]
        },
    )


@router.get("/endpoints", response_model=APIResponse)
async def tool_endpoints(request: Request):
    app = request.app
    endpoints = []
    for route in app.routes:
        if hasattr(route, "methods") and hasattr(route, "path"):
            for method in route.methods:
                if method in ("GET", "POST", "PUT", "DELETE"):
                    tag = route.path.split("/")[2] if len(route.path.split("/")) > 2 else "other"
                    endpoints.append({"method": method, "path": route.path, "tag": tag})
    return APIResponse(code=0, data={"endpoints": endpoints})
