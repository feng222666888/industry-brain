from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class AgentMeta:
    """Metadata for a registered agent."""

    name: str
    module_path: str
    description: str
    industry_id: str
    scenario_id: str


class AgentRegistry:
    """Template-based agent lifecycle management."""

    def __init__(self) -> None:
        self._agents: dict[str, AgentMeta] = {}

    def register(
        self,
        name: str,
        module_path: str,
        description: str,
        industry_id: str,
        scenario_id: str,
    ) -> None:
        """Register an agent with metadata."""
        self._agents[name] = AgentMeta(
            name=name,
            module_path=module_path,
            description=description,
            industry_id=industry_id,
            scenario_id=scenario_id,
        )

    def list_agents(self, industry_id: str | None = None) -> list[dict[str, Any]]:
        """List all registered agents with metadata, optionally filtered by industry."""
        agents = self._agents.values()
        if industry_id is not None:
            agents = [a for a in agents if a.industry_id == industry_id]
        return [
            {
                "name": a.name,
                "module_path": a.module_path,
                "description": a.description,
                "industry_id": a.industry_id,
                "scenario_id": a.scenario_id,
            }
            for a in agents
        ]

    def get_agent(self, name: str) -> dict[str, Any] | None:
        """Get agent metadata by name."""
        meta = self._agents.get(name)
        if meta is None:
            return None
        return {
            "name": meta.name,
            "module_path": meta.module_path,
            "description": meta.description,
            "industry_id": meta.industry_id,
            "scenario_id": meta.scenario_id,
        }

    def get_stats(self) -> dict[str, Any]:
        """Return dict with total_agents, by_industry count, by_scenario count."""
        by_industry: dict[str, int] = {}
        by_scenario: dict[str, int] = {}
        for meta in self._agents.values():
            by_industry[meta.industry_id] = by_industry.get(meta.industry_id, 0) + 1
            by_scenario[meta.scenario_id] = by_scenario.get(meta.scenario_id, 0) + 1
        return {
            "total_agents": len(self._agents),
            "by_industry": by_industry,
            "by_scenario": by_scenario,
        }


# Module-level registry instance with pre-registered agents
agent_registry = AgentRegistry()

agent_registry.register(
    name="monitor_agent",
    module_path="industries.petrochemical.agents.device.monitor_agent",
    description="设备监控Agent，负责采集振动、温度等传感器数据并发现异常",
    industry_id="petrochemical",
    scenario_id="device_maintenance",
)
agent_registry.register(
    name="diagnosis_agent",
    module_path="industries.petrochemical.agents.device.diagnosis_agent",
    description="故障诊断Agent，基于监控数据与知识库进行故障定位与根因分析",
    industry_id="petrochemical",
    scenario_id="device_maintenance",
)
agent_registry.register(
    name="repair_agent",
    module_path="industries.petrochemical.agents.device.repair_agent",
    description="维修决策Agent，生成维修方案与SOP并协调备件与人力",
    industry_id="petrochemical",
    scenario_id="device_maintenance",
)
agent_registry.register(
    name="optimization_agent",
    module_path="industries.petrochemical.agents.optimize.optimization_agent",
    description="工艺优化Agent，对生产参数进行多目标优化与寻优",
    industry_id="petrochemical",
    scenario_id="process_optimization",
)
agent_registry.register(
    name="research_agent",
    module_path="industries.petrochemical.agents.catalyst.research_agent",
    description="催化剂研发Agent，辅助配方设计与实验方案推荐",
    industry_id="petrochemical",
    scenario_id="catalyst_research",
)
agent_registry.register(
    name="corrosion_identify_agent",
    module_path="industries.petrochemical.agents.corrosion.identify_agent",
    description="腐蚀识别Agent，基于设备/管道元数据识别适用的腐蚀机理",
    industry_id="petrochemical",
    scenario_id="corrosion_prevention",
)
agent_registry.register(
    name="corrosion_risk_agent",
    module_path="industries.petrochemical.agents.corrosion.risk_agent",
    description="腐蚀风险Agent，评估腐蚀机理的风险等级(A/B/C)并给出检修建议",
    industry_id="petrochemical",
    scenario_id="corrosion_prevention",
)
