"""Pydantic schemas for API request/response — aligned with docs/api_spec.md."""

from datetime import datetime
from typing import Optional, Union, List, Dict, Any

from pydantic import BaseModel, Field


class APIResponse(BaseModel):
    code: int = 0
    data: Optional[Union[Dict[str, Any], List[Any]]] = None
    message: str = "ok"


# === Device (Scenario 3) ===

class SensorDataInput(BaseModel):
    vibration: List[float] = Field(default_factory=list)
    temperature: List[float] = Field(default_factory=list)
    sampling_rate_hz: int = 1000
    window_seconds: int = 10


class PredictRequest(BaseModel):
    device_id: str
    sensor_data: SensorDataInput
    industry_id: str = "petrochemical"


class PredictResult(BaseModel):
    device_id: str
    health_score: float
    risk_level: str
    predicted_failure: Optional[str] = None
    confidence: float = 0.0
    remaining_useful_life_hours: Optional[int] = None
    recommended_action: Optional[str] = None


class DeviceHealth(BaseModel):
    device_id: str
    device_name: str
    device_type: str
    current_health_score: float
    health_trend: List[Dict[str, Any]] = Field(default_factory=list)
    active_alerts: List[Dict[str, Any]] = Field(default_factory=list)


class DiagnoseRequest(BaseModel):
    device_id: str
    anomaly_type: str
    context: str = ""


# === Agent ===

class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    agent_type: str = "device_diagnosis"
    industry_id: str = "petrochemical"


class AgentTraceItem(BaseModel):
    agent_name: str
    action: str
    input_summary: str = ""
    output_summary: str = ""
    tools_called: List[str] = Field(default_factory=list)
    latency_ms: int = 0
    timestamp: Optional[datetime] = None


# === Evolution ===

class EvolutionStrategyOut(BaseModel):
    strategy_id: str
    industry_id: str
    scenario_id: str
    generation: int
    score: float
    params: Dict[str, Any] = Field(default_factory=dict)
    source: str = "offline"
    created_at: Optional[datetime] = None


class GenerationPoint(BaseModel):
    generation: int
    best_score: float
    strategy_count: int
    timestamp: Optional[datetime] = None


# === Knowledge ===

class GraphNode(BaseModel):
    id: str
    label: str
    type: str
    properties: Dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    source: str
    target: str
    relation: str
    properties: Dict[str, Any] = Field(default_factory=dict)


class GraphResult(BaseModel):
    nodes: List[GraphNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)


class SearchRequest(BaseModel):
    query: str
    industry_id: str = "petrochemical"
    top_k: int = 5


class SearchResultItem(BaseModel):
    content: str
    source: str
    relevance_score: float
    metadata: Dict[str, Any] = Field(default_factory=dict)
