"""Diagnosis Agent — determines root cause by querying knowledge base.

Receives anomaly info from monitor_agent, cross-references with equipment
knowledge graph (fault → root cause mapping) and maintenance history.
In production, this invokes LLM for reasoning over retrieved context.
"""

from __future__ import annotations

import logging
from typing import Any

from backend.core.multi_agent.engine import AgentAction, AgentResult

logger = logging.getLogger(__name__)

FAULT_KNOWLEDGE_BASE = {
    "inner_race_fault": {
        "description": "轴承内圈故障",
        "root_causes": [
            {"cause": "润滑不足", "probability": 0.45, "evidence": "润滑油粘度下降或油量不足导致内圈磨损加剧"},
            {"cause": "安装不当", "probability": 0.25, "evidence": "轴承安装时过盈量不合适导致内圈应力集中"},
            {"cause": "疲劳磨损", "probability": 0.20, "evidence": "超过额定使用寿命（L10寿命）的正常退化"},
            {"cause": "污染物侵入", "probability": 0.10, "evidence": "密封失效导致颗粒物进入轴承内部"},
        ],
        "severity": "medium",
        "urgency": "需在72小时内安排检修",
    },
    "outer_race_fault": {
        "description": "轴承外圈故障",
        "root_causes": [
            {"cause": "腐蚀", "probability": 0.40, "evidence": "工艺介质泄漏或环境湿度过高导致外圈腐蚀"},
            {"cause": "过载运行", "probability": 0.35, "evidence": "长期超负荷运行导致外圈接触应力超限"},
            {"cause": "装配游隙不当", "probability": 0.25, "evidence": "轴承游隙过小引起外圈温升和磨损"},
        ],
        "severity": "medium",
        "urgency": "需在48小时内安排检修",
    },
    "ball_fault": {
        "description": "轴承滚动体故障",
        "root_causes": [
            {"cause": "材料疲劳", "probability": 0.50, "evidence": "滚动体表面疲劳剥落，典型的点蚀特征"},
            {"cause": "润滑膜破裂", "probability": 0.30, "evidence": "高速运转下润滑膜无法保持导致金属接触"},
            {"cause": "异物压痕", "probability": 0.20, "evidence": "硬质颗粒嵌入滚动体表面造成压痕"},
        ],
        "severity": "high",
        "urgency": "需在24小时内安排检修",
    },
}


async def run(input_data: dict[str, Any], memory, tracer) -> AgentResult:
    device_id = input_data.get("device_id", "unknown")
    fault_type = input_data.get("fault_type", "unknown_fault")
    confidence = input_data.get("confidence", 0.0)

    knowledge = FAULT_KNOWLEDGE_BASE.get(fault_type)

    if not knowledge:
        return AgentResult(
            action=AgentAction.HANDOFF,
            data={
                "device_id": device_id,
                "fault_type": fault_type,
                "diagnosis": "未知故障类型，需人工排查",
                "root_causes": [],
            },
            next_agent="repair",
            message=f"Unknown fault type '{fault_type}' — escalating to repair agent for generic SOP",
        )

    primary_cause = knowledge["root_causes"][0]

    diagnosis_result = {
        "device_id": device_id,
        "fault_type": fault_type,
        "fault_description": knowledge["description"],
        "detection_confidence": confidence,
        "root_causes": knowledge["root_causes"],
        "primary_root_cause": primary_cause["cause"],
        "primary_probability": primary_cause["probability"],
        "evidence": primary_cause["evidence"],
        "severity": knowledge["severity"],
        "urgency": knowledge["urgency"],
    }

    return AgentResult(
        action=AgentAction.HANDOFF,
        data=diagnosis_result,
        next_agent="repair",
        message=(
            f"Diagnosis for {device_id}: {knowledge['description']}. "
            f"Primary cause: {primary_cause['cause']} (p={primary_cause['probability']}). "
            f"{knowledge['urgency']}"
        ),
    )
