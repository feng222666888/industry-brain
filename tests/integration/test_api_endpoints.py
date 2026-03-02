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
