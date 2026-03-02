from datetime import datetime, timedelta, timezone

from backend.engine.data_quality.policy import decide_quality_action
from backend.engine.data_quality.scorer import score_record
from backend.engine.online.pipeline import Strategy
from backend.engine.safety_gate import SafetyGate
from data_pipeline.scrapers.core.state_store import load_state, make_state_key, save_state


def test_state_store_roundtrip(tmp_path):
    path = tmp_path / "state.json"
    payload = {make_state_key("s1", "https://example.com/a"): {"last_content_hash": "abc"}}
    save_state(path, payload)
    loaded = load_state(path)
    assert loaded == payload


def test_quality_scorer_and_policy():
    ts = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    record = {
        "source_url": "https://nea.gov.cn/x",
        "industry_id": "petrochemical",
        "scenario_id": "process_optimization",
        "content_hash": "h1",
        "content": "sample text",
        "acquired_at": ts,
        "semantic_consistency": 0.9,
        "compliance_ok": True,
    }
    result = score_record(record)
    assert 0.8 <= result["score"] <= 1.0
    decision = decide_quality_action(result["score"])
    assert decision["action"] in {"pass", "degrade", "block"}
    assert "weight" in decision


def test_safety_gate_blocks_low_data_quality():
    gate = SafetyGate()
    strategy = Strategy(
        strategy_id="q-low",
        scenario_id="process_optimization",
        industry_id="petrochemical",
        params={"reactor_temp": 515, "pressure": 2.8},
        score=0.9,
        data_quality_score=0.2,
    )
    assert gate.evaluate(strategy) is False
    checks = gate.audit_log[-1]["checks"]
    check_names = [c["check"] for c in checks]
    assert "quality_check" in check_names

