import asyncio

from backend.core.memory.session_memory import session_memory
from backend.core.observability.tracer import SessionTracer
from backend.industries.petrochemical.agents.catalyst.research_agent import run as research_agent_run


def test_catalyst_research_agent_output_structure():
    session_id = "test-cat-agent"
    tracer = SessionTracer(session_id)
    session_memory.create_session(session_id, context={"case": "unit-test"})

    result = asyncio.run(
        research_agent_run(
            {"catalyst_type": "FCC", "image_description": "SEM图像显示微孔结构"},
            session_memory,
            tracer,
        )
    )
    assert result.data is not None
    assert "identified_features" in result.data
    assert "knowledge_graph_matches" in result.data
    assert "literature_references" in result.data
    assert len(result.data["literature_references"]) >= 1
