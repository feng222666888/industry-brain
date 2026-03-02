"""Corrosion Identify Agent — identifies corrosion mechanisms for equipment/pipelines.

Given equipment/pipeline metadata (material, medium, process data), this agent
identifies applicable corrosion mechanisms using a domain knowledge base of
chemical reactions and material compatibility rules.
"""

from __future__ import annotations

import logging
from typing import Any

from backend.core.multi_agent.engine import AgentAction, AgentResult

logger = logging.getLogger(__name__)

CORROSION_KNOWLEDGE_BASE: dict[str, list[dict[str, Any]]] = {
    "equipment": [
        {
            "mechanism": "硫酸腐蚀",
            "formula": "H₂SO₄ + Fe → FeSO₄ + H₂↑",
            "condition": "含硫酸介质，温度>60°C",
            "typical_rate_mm_yr": 0.25,
            "match_keywords": ["硫", "酸", "原油", "S"],
        },
        {
            "mechanism": "磷酸腐蚀",
            "formula": "H₃PO₄ + Fe → Fe₃(PO₄)₂ + H₂↑",
            "condition": "磷酸环境，碳钢材质",
            "typical_rate_mm_yr": 0.15,
            "match_keywords": ["磷", "碳钢"],
        },
        {
            "mechanism": "盐酸腐蚀",
            "formula": "2HCl + Fe → FeCl₂ + H₂↑",
            "condition": "高温含氯介质，MgCl₂水解生成HCl",
            "typical_rate_mm_yr": 0.35,
            "match_keywords": ["氯", "Cl", "盐", "原油"],
        },
        {
            "mechanism": "二氧化碳腐蚀",
            "formula": "CO₂ + H₂O → H₂CO₃, H₂CO₃ + Fe → FeCO₃ + H₂↑",
            "condition": "含CO₂湿气环境",
            "typical_rate_mm_yr": 0.20,
            "match_keywords": ["CO₂", "二氧化碳", "湿气", "天然气"],
        },
        {
            "mechanism": "碱腐蚀",
            "formula": "NaOH浓缩引发应力腐蚀",
            "condition": "碱液浓缩区域，碳钢焊缝",
            "typical_rate_mm_yr": 0.10,
            "match_keywords": ["碱", "NaOH", "碱洗"],
        },
        {
            "mechanism": "高温环烷酸腐蚀",
            "formula": "2RCOOH + Fe → Fe(RCOO)₂ + H₂↑",
            "condition": "高酸值原油，240-400°C",
            "typical_rate_mm_yr": 0.45,
            "match_keywords": ["原油", "石脑油", "重油", "环烷"],
        },
    ],
    "pipeline": [
        {
            "mechanism": "胺应力腐蚀开裂",
            "formula": "胺液(MEA/DEA)在焊接残余应力下引发SCC",
            "condition": "胺液管道，焊缝区域",
            "typical_rate_mm_yr": 0.08,
            "match_keywords": ["胺", "MEA", "DEA", "脱硫"],
        },
        {
            "mechanism": "氨应力腐蚀开裂",
            "formula": "NH₃ + H₂O → NH₄OH, 铜合金选择性腐蚀",
            "condition": "含氨环境，铜合金管道",
            "typical_rate_mm_yr": 0.12,
            "match_keywords": ["氨", "NH₃", "铜"],
        },
        {
            "mechanism": "湿硫化氢破坏",
            "formula": "H₂S + Fe → FeS + 2H⁺ → 氢鼓泡/HIC",
            "condition": "含H₂S湿气，碳钢壁厚",
            "typical_rate_mm_yr": 0.30,
            "match_keywords": ["H₂S", "硫化氢", "硫", "酸性水"],
        },
        {
            "mechanism": "碱应力腐蚀开裂",
            "formula": "高浓度NaOH在应力集中区引发晶间开裂",
            "condition": "碱洗管道，温度>40°C",
            "typical_rate_mm_yr": 0.06,
            "match_keywords": ["碱", "NaOH", "碱洗"],
        },
        {
            "mechanism": "氯化物应力腐蚀开裂",
            "formula": "Cl⁻破坏不锈钢钝化膜 → 穿晶SCC",
            "condition": "含氯离子介质，不锈钢管道，温度>60°C",
            "typical_rate_mm_yr": 0.18,
            "match_keywords": ["氯", "Cl", "不锈钢"],
        },
    ],
    "component": [
        {
            "mechanism": "汽蚀",
            "formula": "局部压力降低产生气泡，气泡溃灭冲击金属表面",
            "condition": "泵叶轮入口，阀门下游",
            "typical_rate_mm_yr": 0.40,
            "match_keywords": ["泵", "叶轮", "阀"],
        },
        {
            "mechanism": "振动疲劳",
            "formula": "交变应力循环导致疲劳裂纹扩展",
            "condition": "高频振动部件，共振区域",
            "typical_rate_mm_yr": 0.05,
            "match_keywords": ["泵", "压缩机", "振动"],
        },
        {
            "mechanism": "机械磨损",
            "formula": "固体颗粒或流体冲刷导致壁厚减薄",
            "condition": "含催化剂粉末管道，弯头",
            "typical_rate_mm_yr": 0.50,
            "match_keywords": ["催化剂", "粉末", "浆液", "固"],
        },
        {
            "mechanism": "热疲劳",
            "formula": "温度循环产生热应力裂纹",
            "condition": "频繁开停车设备，温变>50°C",
            "typical_rate_mm_yr": 0.03,
            "match_keywords": ["温度", "开停车", "热"],
        },
    ],
    "fitting": [
        {
            "mechanism": "汽蚀",
            "formula": "局部压力降低产生气泡，气泡溃灭冲击金属表面",
            "condition": "阀门下游管件",
            "typical_rate_mm_yr": 0.35,
            "match_keywords": ["阀", "弯头"],
        },
        {
            "mechanism": "振动疲劳",
            "formula": "交变应力循环导致疲劳裂纹扩展",
            "condition": "管件连接处",
            "typical_rate_mm_yr": 0.04,
            "match_keywords": ["连接", "振动"],
        },
        {
            "mechanism": "机械磨损",
            "formula": "流体冲刷弯头/三通内壁",
            "condition": "高流速弯头、变径管件",
            "typical_rate_mm_yr": 0.45,
            "match_keywords": ["催化剂", "粉末", "弯头", "蒸汽"],
        },
        {
            "mechanism": "热疲劳",
            "formula": "温度循环产生热应力裂纹",
            "condition": "膨胀节、波纹管",
            "typical_rate_mm_yr": 0.03,
            "match_keywords": ["膨胀", "波纹", "温度"],
        },
    ],
}

CORROSIVE_MOLECULES: list[dict[str, Any]] = [
    {
        "molecule": "硫化氢(H₂S)",
        "formula": "Fe + H₂S → FeS + H₂↑",
        "effect": "生成硫化亚铁薄膜，引发氢鼓泡和HIC",
        "risk_boost": 0.30,
        "match_keywords": ["H₂S", "硫化氢", "硫", "酸性水"],
    },
    {
        "molecule": "二氧化碳(CO₂)",
        "formula": "CO₂ + H₂O → H₂CO₃ → 酸性腐蚀",
        "effect": "形成碳酸铁保护膜，但高流速下膜被冲刷",
        "risk_boost": 0.20,
        "match_keywords": ["CO₂", "二氧化碳"],
    },
    {
        "molecule": "氯离子(Cl⁻)",
        "formula": "Cl⁻破坏钝化膜 → 点蚀/应力腐蚀",
        "effect": "破坏不锈钢钝化膜，引发氯化物SCC",
        "risk_boost": 0.25,
        "match_keywords": ["氯", "Cl", "盐"],
    },
    {
        "molecule": "环烷酸(C_nH_{2n-1}COOH)",
        "formula": "2RCOOH + Fe → Fe(RCOO)₂ + H₂↑",
        "effect": "高温环烷酸腐蚀，240-400°C高酸值原油",
        "risk_boost": 0.45,
        "match_keywords": ["原油", "重油", "石脑油", "环烷"],
    },
    {
        "molecule": "氢氟酸(HF)",
        "formula": "2HF + Fe → FeF₂ + H₂↑",
        "effect": "烷基化装置常见，碳钢严重腐蚀",
        "risk_boost": 0.50,
        "match_keywords": ["HF", "氟", "烷基化"],
    },
]


def _match_score(entry: dict[str, Any], material: str, medium: str, name: str) -> float:
    """Calculate relevance score (0~1) based on keyword matches against object metadata."""
    keywords = entry.get("match_keywords", [])
    if not keywords:
        return 0.5
    context = f"{material} {medium} {name}".lower()
    hits = sum(1 for kw in keywords if kw.lower() in context)
    return hits / len(keywords)


async def run(input_data: dict[str, Any], memory: Any, tracer: Any) -> AgentResult:
    """Identify corrosion mechanisms for the given object type and metadata.

    Filters mechanisms by keyword-matching against material/medium/name,
    keeping only those with relevance > 0. Also identifies corrosive molecules
    present in the operating environment.
    """
    object_type = input_data.get("object_type", "equipment")
    object_name = input_data.get("object_name", "")
    material = input_data.get("material", "碳钢")
    medium = input_data.get("medium", "")

    category = object_type if object_type in CORROSION_KNOWLEDGE_BASE else "equipment"
    all_mechanisms = CORROSION_KNOWLEDGE_BASE.get(category, [])

    identified = []
    for m in all_mechanisms:
        score = _match_score(m, material, medium, object_name)
        if score > 0:
            entry = {
                k: v for k, v in m.items() if k != "match_keywords"
            }
            entry.update({
                "object_name": object_name,
                "material": material,
                "medium": medium,
                "relevance": round(score, 2),
            })
            identified.append(entry)

    matched_molecules = []
    for mol in CORROSIVE_MOLECULES:
        score = _match_score(mol, material, medium, object_name)
        if score > 0:
            matched_molecules.append({
                "molecule": mol["molecule"],
                "formula": mol["formula"],
                "effect": mol["effect"],
                "risk_boost": mol["risk_boost"],
                "relevance": round(score, 2),
            })

    return AgentResult(
        action=AgentAction.HANDOFF,
        next_agent="risk",
        data={
            "object_type": object_type,
            "object_name": object_name,
            "material": material,
            "medium": medium,
            "identified_mechanisms": identified,
            "matched_molecules": matched_molecules,
        },
        message=f"Identified {len(identified)} corrosion mechanisms and {len(matched_molecules)} corrosive molecules for {object_type} '{object_name}'",
    )
