"""Unit tests for corrosion risk agent.

Covers: risk level assignment (A/B/C), molecule risk contribution,
inspection interval derivation, and conclusion text generation.
"""

import asyncio

from backend.core.memory.session_memory import session_memory
from backend.core.observability.tracer import SessionTracer
from backend.industries.petrochemical.agents.corrosion.risk_agent import run

HIGH_MECHANISM = [{"mechanism": "盐酸腐蚀", "typical_rate_mm_yr": 0.35, "condition": "高温含氯", "formula": "2HCl + Fe"}]
MED_MECHANISM = [{"mechanism": "磷酸腐蚀", "typical_rate_mm_yr": 0.15, "condition": "磷酸环境", "formula": "H₃PO₄ + Fe"}]
LOW_MECHANISM = [{"mechanism": "热疲劳", "typical_rate_mm_yr": 0.03, "condition": "温度循环", "formula": ""}]
HIGH_MOLECULE = [{"molecule": "环烷酸", "risk_boost": 0.45, "effect": "高温腐蚀", "formula": "2RCOOH + Fe"}]
LOW_MOLECULE = [{"molecule": "二氧化碳", "risk_boost": 0.05, "effect": "酸腐蚀", "formula": "CO₂ + H₂O"}]


def _run(input_data: dict) -> object:
    session_id = f"test-corrosion-risk-{id(input_data)}"
    tracer = SessionTracer(session_id)
    session_memory.create_session(session_id, context={"case": "unit-test"})
    return asyncio.run(run(input_data, session_memory, tracer))


def _base_input(**kwargs):
    return {
        "object_type": "equipment",
        "object_name": "测试设备",
        "identified_mechanisms": [],
        "matched_molecules": [],
        **kwargs,
    }


def test_risk_agent_output_structure():
    result = _run(_base_input(identified_mechanisms=HIGH_MECHANISM))
    assert result.data is not None
    for key in ("risk_results", "risk_summary", "max_risk_level",
                "recommended_inspection_interval_months", "conclusion"):
        assert key in result.data, f"Missing key: {key}"


def test_high_corrosion_rate_is_level_a():
    result = _run(_base_input(identified_mechanisms=HIGH_MECHANISM))
    assert result.data["max_risk_level"] == "A"
    assert result.data["recommended_inspection_interval_months"] == 3


def test_medium_corrosion_rate_is_level_b():
    result = _run(_base_input(identified_mechanisms=MED_MECHANISM))
    assert result.data["max_risk_level"] == "B"
    assert result.data["recommended_inspection_interval_months"] == 6


def test_low_corrosion_rate_is_level_c():
    result = _run(_base_input(identified_mechanisms=LOW_MECHANISM))
    assert result.data["max_risk_level"] == "C"
    assert result.data["recommended_inspection_interval_months"] == 12


def test_high_risk_molecule_upgrades_max_level():
    """A high-boost molecule should pull overall risk up to A even with low mechanism."""
    result = _run(_base_input(identified_mechanisms=LOW_MECHANISM, matched_molecules=HIGH_MOLECULE))
    assert result.data["max_risk_level"] == "A", "High molecule risk_boost should raise overall risk to A"


def test_risk_summary_counts_match_results():
    mechs = HIGH_MECHANISM + LOW_MECHANISM
    result = _run(_base_input(identified_mechanisms=mechs))
    summary = result.data["risk_summary"]
    total = summary["A"] + summary["B"] + summary["C"]
    assert total == len(mechs), "risk_summary counts must sum to number of mechanisms"


def test_risk_results_contain_category_field():
    result = _run(_base_input(identified_mechanisms=MED_MECHANISM, matched_molecules=HIGH_MOLECULE))
    categories = {r["category"] for r in result.data["risk_results"]}
    assert "腐蚀机理" in categories
    assert "腐蚀分子" in categories


def test_molecule_items_separated_from_mechanisms():
    result = _run(_base_input(identified_mechanisms=MED_MECHANISM, matched_molecules=HIGH_MOLECULE))
    mol_items = [r for r in result.data["risk_results"] if r["category"] == "腐蚀分子"]
    mech_items = [r for r in result.data["risk_results"] if r["category"] == "腐蚀机理"]
    assert len(mol_items) == 1
    assert len(mech_items) == 1


def test_empty_mechanisms_returns_c_level():
    result = _run(_base_input(identified_mechanisms=[], matched_molecules=[]))
    assert result.data["max_risk_level"] == "C"
    assert result.data["risk_results"] == []


def test_conclusion_mentions_object_name():
    result = _run(_base_input(object_name="常压塔T-101", identified_mechanisms=HIGH_MECHANISM))
    assert "常压塔T-101" in result.data["conclusion"]


def test_conclusion_mentions_risk_level():
    result = _run(_base_input(identified_mechanisms=HIGH_MECHANISM))
    assert "A级" in result.data["conclusion"]
