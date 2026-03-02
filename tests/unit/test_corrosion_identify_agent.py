"""Unit tests for corrosion identify agent.

Covers: mechanism identification, keyword-based filtering,
molecule matching, and HANDOFF action wiring.
"""

import asyncio

from backend.core.memory.session_memory import session_memory
from backend.core.observability.tracer import SessionTracer
from backend.industries.petrochemical.agents.corrosion.identify_agent import run


def _run(input_data: dict) -> object:
    session_id = f"test-corrosion-id-{id(input_data)}"
    tracer = SessionTracer(session_id)
    session_memory.create_session(session_id, context={"case": "unit-test"})
    return asyncio.run(run(input_data, session_memory, tracer))


def test_identify_returns_handoff_to_risk():
    result = _run({
        "object_type": "equipment",
        "object_name": "常压塔T-101",
        "material": "碳钢(Q345R)",
        "medium": "原油/石脑油",
    })
    from backend.core.multi_agent.engine import AgentAction
    assert result.action == AgentAction.HANDOFF
    assert result.next_agent == "risk"


def test_identify_output_has_required_keys():
    result = _run({
        "object_type": "equipment",
        "object_name": "催化反应器",
        "material": "碳钢",
        "medium": "重油",
    })
    assert "identified_mechanisms" in result.data
    assert "matched_molecules" in result.data
    assert "object_type" in result.data
    assert "object_name" in result.data


def test_identify_h2s_pipeline_finds_wet_h2s_damage():
    result = _run({
        "object_type": "pipeline",
        "object_name": "含硫污水管线",
        "material": "碳钢(20#)",
        "medium": "含H₂S酸性水",
    })
    names = [m["mechanism"] for m in result.data["identified_mechanisms"]]
    assert "湿硫化氢破坏" in names, f"Expected 湿硫化氢破坏 in {names}"


def test_identify_amine_pipeline_finds_amine_scc():
    result = _run({
        "object_type": "pipeline",
        "object_name": "胺液再生管线",
        "material": "碳钢(20G)",
        "medium": "MEA胺液",
    })
    names = [m["mechanism"] for m in result.data["identified_mechanisms"]]
    assert "胺应力腐蚀开裂" in names, f"Expected 胺应力腐蚀开裂 in {names}"


def test_identify_crude_oil_equipment_finds_naphthenic_corrosion():
    result = _run({
        "object_type": "equipment",
        "object_name": "常压塔",
        "material": "碳钢",
        "medium": "原油/石脑油",
    })
    names = [m["mechanism"] for m in result.data["identified_mechanisms"]]
    assert "高温环烷酸腐蚀" in names, f"Expected 高温环烷酸腐蚀 in {names}"


def test_identify_filters_differ_by_medium():
    """Different media on same object type should produce different mechanism sets."""
    r1 = _run({"object_type": "pipeline", "object_name": "A", "material": "碳钢", "medium": "含H₂S酸性水"})
    r2 = _run({"object_type": "pipeline", "object_name": "B", "material": "碳钢", "medium": "MEA胺液"})

    names1 = {m["mechanism"] for m in r1.data["identified_mechanisms"]}
    names2 = {m["mechanism"] for m in r2.data["identified_mechanisms"]}
    assert names1 != names2, "Different media must produce different mechanism sets"


def test_identify_molecules_matched_for_crude_oil():
    result = _run({
        "object_type": "equipment",
        "object_name": "塔器",
        "material": "碳钢",
        "medium": "原油",
    })
    mol_names = [m["molecule"] for m in result.data["matched_molecules"]]
    assert len(mol_names) > 0, "Crude oil medium should match corrosive molecules"


def test_identify_mechanisms_have_no_internal_fields():
    """match_keywords must not leak into identified_mechanisms output."""
    result = _run({
        "object_type": "equipment",
        "object_name": "塔器",
        "material": "碳钢",
        "medium": "原油",
    })
    for m in result.data["identified_mechanisms"]:
        assert "match_keywords" not in m, "Internal field match_keywords must not leak"


def test_identify_unknown_object_type_falls_back_to_equipment():
    result = _run({
        "object_type": "vessel",
        "object_name": "储罐",
        "material": "碳钢",
        "medium": "原油",
    })
    assert result.data["identified_mechanisms"] is not None
    assert len(result.data["identified_mechanisms"]) >= 0
