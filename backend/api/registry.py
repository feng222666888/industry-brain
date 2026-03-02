"""Scenario route registry — extensibility point for new scenarios/industries."""

from fastapi import FastAPI

from backend.api.agent_factory.router import router as agent_factory_router
from backend.api.catalyst.router import router as catalyst_router
from backend.api.corrosion.router import router as corrosion_router
from backend.api.device.router import router as device_router
from backend.api.evolution.router import router as evolution_router
from backend.api.evolution_offline.router import router as evolution_offline_router
from backend.api.evolution_online.router import router as evolution_online_router
from backend.api.governance.router import router as governance_router
from backend.api.knowledge.router import router as knowledge_router
from backend.api.memory.router import router as memory_router
from backend.api.model_gateway.router import router as model_gateway_router
from backend.api.multi_agent.router import router as multi_agent_router
from backend.api.observability.router import router as observability_router
from backend.api.optimize.router import router as optimize_router
from backend.api.tools.router import router as tools_router


def register_routes(app: FastAPI) -> None:
    # Existing scenario routes
    app.include_router(device_router, prefix="/api/device", tags=["设备维护"])
    app.include_router(optimize_router, prefix="/api/optimize", tags=["工艺寻优"])
    app.include_router(catalyst_router, prefix="/api/catalyst", tags=["催化剂识别"])
    app.include_router(corrosion_router, prefix="/api/corrosion", tags=["智能防腐蚀"])
    app.include_router(evolution_router, prefix="/api/evolution", tags=["进化引擎"])
    app.include_router(governance_router, prefix="/api/governance", tags=["数据治理"])

    # Foundation layer
    app.include_router(knowledge_router, prefix="/api/knowledge", tags=["知识中心"])
    app.include_router(tools_router, prefix="/api/tools", tags=["工具库"])
    app.include_router(model_gateway_router, prefix="/api/model-gateway", tags=["模型网关"])

    # Core runtime layer
    app.include_router(memory_router, prefix="/api/memory", tags=["记忆系统"])
    app.include_router(agent_factory_router, prefix="/api/agent-factory", tags=["Agent生产系统"])
    app.include_router(multi_agent_router, prefix="/api/multi-agent", tags=["Multi-Agent引擎"])
    app.include_router(observability_router, prefix="/api/observability", tags=["可观测系统"])

    # Evolution sub-routes
    app.include_router(evolution_online_router, prefix="/api/evolution/online", tags=["在线演进"])
    app.include_router(evolution_offline_router, prefix="/api/evolution/offline", tags=["离线进化"])
