from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_api_device_health():
    response = client.get("/api/device/DEV-PUMP-001/health")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["data"]["device_id"] == "DEV-PUMP-001"
    assert "current_health_score" in data["data"]

def test_api_optimize_comparison():
    response = client.get("/api/optimize/comparison")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert "before" in data["data"]
    assert "after" in data["data"]
    assert "improvements" in data["data"]

def test_api_evolution_timeline():
    response = client.get("/api/evolution/timeline?industry_id=petrochemical&scenario_id=process_optimization")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert "generations" in data["data"]


def test_api_catalyst_knowledge_graph():
    response = client.get("/api/catalyst/knowledge-graph?query=FCC")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert len(data["data"]["nodes"]) >= 6
    assert len(data["data"]["edges"]) >= 6


def test_api_catalyst_analyze_image():
    payload = {
        "catalyst_type": "FCC",
        "image_description": "FCC催化剂SEM图像，颗粒较均匀",
    }
    response = client.post("/api/catalyst/analyze-image", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert "identified_features" in data["data"]
    assert "literature_references" in data["data"]
    assert len(data["data"]["literature_references"]) > 0


def test_api_optimize_recommend():
    payload = {
        "reactor_temp": 505,
        "catalyst_ratio": 0.07,
        "pressure": 2.7,
        "residence_time": 5.3,
        "industry_id": "petrochemical",
    }
    response = client.post("/api/optimize/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert "recommended_params" in data["data"]
    assert "predicted_yield_improvement" in data["data"]


def test_api_device_predict():
    vibration = [0.03] * 100
    payload = {
        "device_id": "DEV-PUMP-001",
        "sensor_data": {
            "vibration": vibration,
            "temperature": [85.0] * 100,
            "sampling_rate_hz": 12000,
            "window_seconds": 1,
        },
        "industry_id": "petrochemical",
    }
    response = client.post("/api/device/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["data"]["device_id"] == "DEV-PUMP-001"
    assert "risk_level" in data["data"]


def test_api_governance_audit_events():
    response = client.get("/api/governance/audit-events?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert "events" in data["data"]


def test_api_governance_source_health():
    response = client.get("/api/governance/source-health")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert "sources" in data["data"]
    assert data["data"]["count"] >= 1


def test_api_governance_quality_report():
    response = client.get("/api/governance/quality-report")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert "summary" in data["data"]


# --- Corrosion prevention scenario (Scenario 4) ---

def test_api_corrosion_overview():
    response = client.get("/api/corrosion/overview")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert "data_stats" in data["data"]
    assert "models" in data["data"]
    assert data["data"]["total_objects"] >= 1


def test_api_corrosion_objects_all():
    response = client.get("/api/corrosion/objects")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert "objects" in data["data"]
    assert data["data"]["total"] >= 1
    obj = data["data"]["objects"][0]
    for key in ("id", "name", "type", "material", "medium", "location"):
        assert key in obj, f"Missing key {key} in corrosion object"


def test_api_corrosion_objects_filter_by_type():
    for obj_type in ("equipment", "pipeline", "component", "fitting"):
        response = client.get(f"/api/corrosion/objects?type={obj_type}")
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        for obj in data["data"]["objects"]:
            assert obj["type"] == obj_type


def test_api_corrosion_identify_equipment():
    response = client.post("/api/corrosion/identify", json={"object_type": "equipment"})
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert "mechanisms" in data["data"]
    assert data["data"]["count"] >= 1
    for m in data["data"]["mechanisms"]:
        assert "match_keywords" not in m, "Internal field must not be exposed"


def test_api_corrosion_identify_pipeline():
    response = client.post("/api/corrosion/identify", json={"object_type": "pipeline"})
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["data"]["count"] >= 1


def test_api_corrosion_analyze_sse_valid_object():
    """Verify SSE stream returns agent_step and complete events."""
    with client.stream("POST", "/api/corrosion/analyze", json={"object_id": "EQ-CDU-T101"}) as r:
        assert r.status_code == 200
        assert "text/event-stream" in r.headers.get("content-type", "")
        text = r.read().decode()

    assert "event: complete" in text
    import json
    complete_data = None
    event_type = None
    for line in text.splitlines():
        if line.startswith("event: "):
            event_type = line[7:].strip()
        elif line.startswith("data: ") and event_type == "complete":
            complete_data = json.loads(line[6:])
            break
    assert complete_data is not None
    risk = complete_data.get("results", {}).get("risk", {})
    assert "risk_results" in risk
    assert "max_risk_level" in risk
    assert risk["max_risk_level"] in ("A", "B", "C")


def test_api_corrosion_analyze_sse_invalid_object_returns_sse_error():
    """Verify 404-like case still returns SSE (not JSON)."""
    with client.stream("POST", "/api/corrosion/analyze", json={"object_id": "NONEXIST-999"}) as r:
        assert r.status_code == 200
        assert "text/event-stream" in r.headers.get("content-type", "")
        text = r.read().decode()
    assert "event: error" in text


def test_api_corrosion_history():
    response = client.get("/api/corrosion/history")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert "history" in data["data"]
    assert "total" in data["data"]
