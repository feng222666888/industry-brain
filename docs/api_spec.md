# Industry Brain API Specification

> 本文档定义前后端协作的核心接口契约。FastAPI自动生成OpenAPI spec，此文档作为设计参考。

## 通用约定

- Base URL: `http://localhost:8000`
- 所有接口返回统一结构：`{ "code": 0, "data": {...}, "message": "ok" }`
- 错误码：0=成功，4xx=客户端错误，5xx=服务端错误
- 所有业务接口包含 `industry_id` 参数（默认 `petrochemical`）

---

## 1. 设备维护 `/api/device/`

### POST `/api/device/predict`

预测设备故障风险。

**Request:**
```json
{
  "device_id": "PUMP-001",
  "sensor_data": {
    "vibration": [0.12, 0.15, 0.18, ...],
    "temperature": [85.2, 85.5, 86.1, ...],
    "sampling_rate_hz": 1000,
    "window_seconds": 10
  },
  "industry_id": "petrochemical"
}
```

**Response:**
```json
{
  "code": 0,
  "data": {
    "device_id": "PUMP-001",
    "health_score": 0.72,
    "risk_level": "medium",
    "predicted_failure": "bearing_degradation",
    "confidence": 0.89,
    "remaining_useful_life_hours": 336,
    "recommended_action": "schedule_inspection"
  }
}
```

### GET `/api/device/{device_id}/health`

获取设备健康趋势。

**Response:**
```json
{
  "code": 0,
  "data": {
    "device_id": "PUMP-001",
    "device_name": "循环水泵-001",
    "device_type": "centrifugal_pump",
    "current_health_score": 0.72,
    "health_trend": [
      {"timestamp": "2026-02-28T08:00:00Z", "score": 0.85},
      {"timestamp": "2026-02-28T12:00:00Z", "score": 0.78},
      {"timestamp": "2026-02-28T16:00:00Z", "score": 0.72}
    ],
    "active_alerts": []
  }
}
```

### POST `/api/device/{device_id}/diagnose`

触发Multi-Agent协同诊断。

**Request:**
```json
{
  "device_id": "PUMP-001",
  "anomaly_type": "vibration_spike",
  "context": "振动幅值连续3小时超过预警阈值"
}
```

**Response (SSE stream):**
```
event: agent_start
data: {"agent": "monitor_agent", "action": "analyzing_sensor_data"}

event: agent_result
data: {"agent": "monitor_agent", "result": "detected_bearing_inner_race_fault"}

event: agent_start
data: {"agent": "diagnosis_agent", "action": "querying_knowledge_base"}

event: agent_result
data: {"agent": "diagnosis_agent", "result": {"fault": "内圈磨损", "root_cause": "润滑不足", "severity": "medium"}}

event: agent_start
data: {"agent": "repair_agent", "action": "generating_sop"}

event: agent_result
data: {"agent": "repair_agent", "result": {"sop_id": "SOP-2026-001", "steps": [...]}}

event: complete
data: {"session_id": "sess-abc123", "total_latency_ms": 8500}
```

---

## 2. Agent通用 `/api/agent/`

### POST `/api/agent/chat` (SSE)

Agent对话接口（流式输出）。

**Request:**
```json
{
  "session_id": "sess-abc123",
  "message": "PUMP-001的振动异常是什么原因？",
  "agent_type": "device_diagnosis",
  "industry_id": "petrochemical"
}
```

**Response:** SSE stream with `event: token | tool_call | tool_result | done`

### GET `/api/agent/{session_id}/trace`

获取Agent调用链追踪。

**Response:**
```json
{
  "code": 0,
  "data": {
    "session_id": "sess-abc123",
    "traces": [
      {
        "agent_name": "monitor_agent",
        "action": "detect_anomaly",
        "input_summary": "sensor_data: 10s window",
        "output_summary": "bearing_inner_race_fault detected",
        "tools_called": ["time_series_analysis"],
        "latency_ms": 2100,
        "timestamp": "2026-02-28T16:00:01Z"
      }
    ]
  }
}
```

---

## 3. 进化引擎 `/api/evolution/`

### GET `/api/evolution/strategies`

**Query params:** `industry_id`, `scenario_id`, `min_score`

**Response:**
```json
{
  "code": 0,
  "data": {
    "strategies": [
      {
        "strategy_id": "strat-001",
        "industry_id": "petrochemical",
        "scenario_id": "process_optimization",
        "generation": 15,
        "score": 0.92,
        "params": {"reactor_temp": 520, "catalyst_ratio": 0.08},
        "source": "offline_evolution",
        "created_at": "2026-02-20T10:00:00Z"
      }
    ]
  }
}
```

### GET `/api/evolution/timeline`

**Query params:** `industry_id`, `scenario_id`

**Response:**
```json
{
  "code": 0,
  "data": {
    "generations": [
      {"generation": 1, "best_score": 0.65, "strategy_count": 10, "timestamp": "2026-01-01T00:00:00Z"},
      {"generation": 15, "best_score": 0.92, "strategy_count": 8, "timestamp": "2026-02-20T00:00:00Z"}
    ]
  }
}
```

---

## 4. 知识图谱 `/api/knowledge/`

### GET `/api/knowledge/graph`

**Query params:** `query`, `industry_id`, `depth` (default 2)

**Response:**
```json
{
  "code": 0,
  "data": {
    "nodes": [
      {"id": "n1", "label": "FCC催化剂", "type": "Catalyst", "properties": {}}
    ],
    "edges": [
      {"source": "n1", "target": "n2", "relation": "PREPARED_BY", "properties": {}}
    ]
  }
}
```

### POST `/api/knowledge/search`

RAG语义检索。

**Request:**
```json
{
  "query": "催化裂化装置的最优反应温度范围",
  "industry_id": "petrochemical",
  "top_k": 5
}
```

**Response:**
```json
{
  "code": 0,
  "data": {
    "results": [
      {
        "content": "FCC反应器最优温度范围为490-530°C...",
        "source": "石化工艺操作规程-FCC章节",
        "relevance_score": 0.94,
        "metadata": {"source_url": "...", "crawl_date": "2026-02-15"}
      }
    ]
  }
}
```
