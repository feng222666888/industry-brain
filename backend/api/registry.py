"""Scenario route registry — extensibility point for new scenarios/industries."""

from fastapi import FastAPI

from backend.api.device.router import router as device_router
from backend.api.optimize.router import router as optimize_router
from backend.api.catalyst.router import router as catalyst_router
from backend.api.evolution.router import router as evolution_router
from backend.api.governance.router import router as governance_router


def register_routes(app: FastAPI) -> None:
    app.include_router(device_router, prefix="/api/device", tags=["设备维护"])
    app.include_router(optimize_router, prefix="/api/optimize", tags=["工艺寻优"])
    app.include_router(catalyst_router, prefix="/api/catalyst", tags=["催化剂识别"])
    app.include_router(evolution_router, prefix="/api/evolution", tags=["进化引擎"])
    app.include_router(governance_router, prefix="/api/governance", tags=["数据治理"])
