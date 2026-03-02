import pytest
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
