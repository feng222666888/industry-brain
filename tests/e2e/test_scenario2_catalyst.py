"""E2E test: Scenario 2 — Catalyst analysis and knowledge graph."""

from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_scenario2_catalyst_end_to_end():
    analyze_payload = {
        "catalyst_type": "FCC",
        "image_description": "SEM图像观察到颗粒均匀、微孔主导，存在介孔通道",
    }
    analyze_resp = client.post("/api/catalyst/analyze-image", json=analyze_payload)
    assert analyze_resp.status_code == 200
    analyze_data = analyze_resp.json()
    assert analyze_data["code"] == 0
    assert len(analyze_data["data"]["identified_features"]) >= 3

    graph_resp = client.get("/api/catalyst/knowledge-graph?query=ZSM-5")
    assert graph_resp.status_code == 200
    graph_data = graph_resp.json()
    assert graph_data["code"] == 0
    assert len(graph_data["data"]["nodes"]) >= 6
    assert len(graph_data["data"]["edges"]) >= 6
