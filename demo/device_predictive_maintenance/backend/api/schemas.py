"""演示API的数据模型定义"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class APIResponse(BaseModel):
    code: int = 0
    data: dict[str, Any] | list[Any] | None = None
    message: str = "ok"


class DeviceInfo(BaseModel):
    device_id: str
    device_name: str
    device_type: str
    parent_unit: str
    installation_date: str
    rated_power_kw: int
    rated_flow_m3h: int


class SensorDataPoint(BaseModel):
    timestamp: str
    device_id: str
    vibration_rms: float
    vibration_peak: float
    temperature: float
    pressure: float
    flow: float
    health_score: float


class DeviceHealthTrend(BaseModel):
    timestamp: str
    score: float


class DeviceHealthResponse(BaseModel):
    device_id: str
    device_name: str
    device_type: str
    current_health_score: float
    health_trend: list[DeviceHealthTrend] = Field(default_factory=list)
    active_alerts: list[dict[str, Any]] = Field(default_factory=list)


class FaultHistoryItem(BaseModel):
    fault_id: str
    device_id: str
    device_name: str
    fault_type: str
    description: str
    severity: str
    detected_at: str
    resolved_at: str
    downtime_hours: int
    root_cause: str


class MaintenanceLogItem(BaseModel):
    log_id: str
    device_id: str
    device_name: str
    maintenance_type: str
    maintenance_name: str
    started_at: str
    completed_at: str
    duration_hours: int
    technician: str
    cost_yuan: int
    spare_parts_used: list[str]


class CaseStudy(BaseModel):
    case_id: str
    title: str
    source: str
    company_type: str
    implementation_period: str
    key_metrics: dict[str, Any]
    technical_highlights: list[str]
    business_impact: dict[str, str]


class DiagnoseRequest(BaseModel):
    device_id: str
    anomaly_type: str
    context: str = ""
