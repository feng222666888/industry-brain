"""Corrosion Risk Agent — calculates risk levels for identified corrosion mechanisms.

Takes the output of identify_agent (list of mechanisms) and assigns risk levels
(A/B/C) based on corrosion rate, material vulnerability, and operating conditions.
"""

from __future__ import annotations

import logging
from typing import Any

from backend.core.multi_agent.engine import AgentAction, AgentResult

logger = logging.getLogger(__name__)

RISK_THRESHOLDS = {
    "A": 0.25,
    "B": 0.10,
}


def _assess_risk(mechanism: dict[str, Any]) -> str:
    """Assign risk level A (high) / B (medium) / C (low) based on corrosion rate."""
    rate = mechanism.get("typical_rate_mm_yr", 0)
    if rate >= RISK_THRESHOLDS["A"]:
        return "A"
    elif rate >= RISK_THRESHOLDS["B"]:
        return "B"
    return "C"


def _risk_color(level: str) -> str:
    if level == "A":
        return "#ef4444"
    if level == "B":
        return "#f59e0b"
    return "#22c55e"


async def run(input_data: dict[str, Any], memory: Any, tracer: Any) -> AgentResult:
    """Calculate risk levels for each identified corrosion mechanism and matched molecules."""
    mechanisms = input_data.get("identified_mechanisms", [])
    molecules = input_data.get("matched_molecules", [])
    object_type = input_data.get("object_type", "equipment")
    object_name = input_data.get("object_name", "")

    risk_results = []
    risk_summary = {"A": 0, "B": 0, "C": 0}

    for m in mechanisms:
        level = _assess_risk(m)
        risk_summary[level] += 1
        risk_results.append({
            "mechanism": m.get("mechanism", "未知"),
            "category": "腐蚀机理",
            "risk_level": level,
            "risk_color": _risk_color(level),
            "corrosion_rate_mm_yr": m.get("typical_rate_mm_yr", 0),
            "condition": m.get("condition", ""),
            "formula": m.get("formula", ""),
        })

    for mol in molecules:
        pseudo_rate = mol.get("risk_boost", 0)
        level = _assess_risk({"typical_rate_mm_yr": pseudo_rate})
        risk_summary[level] += 1
        risk_results.append({
            "mechanism": mol.get("molecule", "未知分子"),
            "category": "腐蚀分子",
            "risk_level": level,
            "risk_color": _risk_color(level),
            "corrosion_rate_mm_yr": pseudo_rate,
            "condition": mol.get("effect", ""),
            "formula": mol.get("formula", ""),
        })

    max_risk = "C"
    if risk_summary["A"] > 0:
        max_risk = "A"
    elif risk_summary["B"] > 0:
        max_risk = "B"

    inspection_interval_months = {"A": 3, "B": 6, "C": 12}[max_risk]

    type_label = {"equipment": "设备", "pipeline": "管道", "component": "部件", "fitting": "管件"}.get(object_type, object_type)
    conclusion = (
        f"{type_label}「{object_name}」共识别 {len(mechanisms)} 项腐蚀机理"
        + (f"、{len(molecules)} 种腐蚀分子" if molecules else "")
        + f"，合计 {len(risk_results)} 项风险项，"
        f"其中风险A级 {risk_summary['A']} 项、B级 {risk_summary['B']} 项、C级 {risk_summary['C']} 项。"
        f"综合最高风险等级为{max_risk}级，建议检修周期 {inspection_interval_months} 个月。"
    )

    return AgentResult(
        action=AgentAction.COMPLETE,
        data={
            "object_type": object_type,
            "object_name": object_name,
            "risk_results": risk_results,
            "risk_summary": risk_summary,
            "max_risk_level": max_risk,
            "recommended_inspection_interval_months": inspection_interval_months,
            "conclusion": conclusion,
        },
        message=f"Risk assessment complete: {max_risk}-level risk, inspect every {inspection_interval_months}mo",
    )
