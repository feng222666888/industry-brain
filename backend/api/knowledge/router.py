"""Knowledge center API — graph, terms, scenario configs, stats."""

from __future__ import annotations

from fastapi import APIRouter, Query

from backend.models.schemas import APIResponse

router = APIRouter()

DEMO_GRAPH_NODES = [
    {"id": "fcc", "label": "FCC催化裂化", "type": "process"},
    {"id": "zeolite_y", "label": "Y型分子筛", "type": "catalyst"},
    {"id": "rare_earth", "label": "稀土改性", "type": "material"},
    {"id": "coke_deposit", "label": "积碳失活", "type": "fault"},
    {"id": "regen_burn", "label": "再生烧焦", "type": "process"},
    {"id": "pump_001", "label": "离心泵P-001", "type": "equipment"},
    {"id": "bearing_fault", "label": "轴承外圈故障", "type": "fault"},
    {"id": "vibration", "label": "振动频谱分析", "type": "process"},
    {"id": "sem_image", "label": "SEM电镜图像", "type": "material"},
    {"id": "pore_struct", "label": "孔道结构", "type": "material"},
    {"id": "h2s", "label": "硫化氢(H₂S)", "type": "molecule"},
    {"id": "co2_mol", "label": "二氧化碳(CO₂)", "type": "molecule"},
    {"id": "cl_ion", "label": "氯离子(Cl⁻)", "type": "molecule"},
    {"id": "naphthenic_acid", "label": "环烷酸", "type": "molecule"},
    {"id": "wet_h2s_crack", "label": "湿硫化氢破坏", "type": "corrosion"},
    {"id": "amine_scc", "label": "胺应力腐蚀开裂", "type": "corrosion"},
    {"id": "hcl_corrosion", "label": "盐酸腐蚀", "type": "corrosion"},
    {"id": "naphthenic_corr", "label": "高温环烷酸腐蚀", "type": "corrosion"},
    {"id": "carbon_steel", "label": "碳钢", "type": "material"},
    {"id": "pipeline_h2s", "label": "含硫管线", "type": "equipment"},
    {"id": "cdu_tower", "label": "常压塔", "type": "equipment"},
]

DEMO_GRAPH_EDGES = [
    {"source": "fcc", "target": "zeolite_y", "relation": "使用催化剂"},
    {"source": "zeolite_y", "target": "rare_earth", "relation": "改性方式"},
    {"source": "zeolite_y", "target": "coke_deposit", "relation": "失活原因"},
    {"source": "coke_deposit", "target": "regen_burn", "relation": "恢复方式"},
    {"source": "pump_001", "target": "bearing_fault", "relation": "常见故障"},
    {"source": "bearing_fault", "target": "vibration", "relation": "检测方法"},
    {"source": "sem_image", "target": "pore_struct", "relation": "表征对象"},
    {"source": "zeolite_y", "target": "pore_struct", "relation": "微观结构"},
    {"source": "zeolite_y", "target": "sem_image", "relation": "观测手段"},
    {"source": "h2s", "target": "wet_h2s_crack", "relation": "引发机理"},
    {"source": "pipeline_h2s", "target": "wet_h2s_crack", "relation": "腐蚀风险"},
    {"source": "h2s", "target": "carbon_steel", "relation": "腐蚀对象"},
    {"source": "cl_ion", "target": "hcl_corrosion", "relation": "引发机理"},
    {"source": "naphthenic_acid", "target": "naphthenic_corr", "relation": "引发机理"},
    {"source": "cdu_tower", "target": "naphthenic_corr", "relation": "腐蚀风险"},
    {"source": "cdu_tower", "target": "hcl_corrosion", "relation": "腐蚀风险"},
    {"source": "co2_mol", "target": "carbon_steel", "relation": "腐蚀对象"},
    {"source": "amine_scc", "target": "carbon_steel", "relation": "影响材质"},
]

TERM_MAP = [
    {"raw": "流化催化裂化", "standard": "FCC", "domain": "炼化工艺"},
    {"raw": "催裂化", "standard": "FCC", "domain": "炼化工艺"},
    {"raw": "加氢裂化", "standard": "HCK", "domain": "炼化工艺"},
    {"raw": "连续重整", "standard": "CCR", "domain": "炼化工艺"},
    {"raw": "电镜", "standard": "SEM/TEM", "domain": "材料表征"},
    {"raw": "X射线衍射", "standard": "XRD", "domain": "材料表征"},
    {"raw": "比表面积", "standard": "BET", "domain": "催化剂性能"},
    {"raw": "孔径分布", "standard": "PSD", "domain": "催化剂性能"},
    {"raw": "积碳率", "standard": "Coke Yield", "domain": "催化剂性能"},
    {"raw": "转化率", "standard": "Conversion", "domain": "工艺指标"},
    {"raw": "选择性", "standard": "Selectivity", "domain": "工艺指标"},
    {"raw": "收率", "standard": "Yield", "domain": "工艺指标"},
    {"raw": "应力腐蚀", "standard": "SCC", "domain": "腐蚀机理"},
    {"raw": "氢致开裂", "standard": "HIC", "domain": "腐蚀机理"},
    {"raw": "硫化氢腐蚀", "standard": "H₂S Corrosion", "domain": "腐蚀机理"},
    {"raw": "环烷酸腐蚀", "standard": "NAC", "domain": "腐蚀机理"},
    {"raw": "壁厚减薄", "standard": "Wall Thinning", "domain": "腐蚀检测"},
    {"raw": "腐蚀速率", "standard": "Corrosion Rate (mm/yr)", "domain": "腐蚀检测"},
]

SCENARIO_CONFIGS = [
    {
        "id": "device_maintenance",
        "name": "关键设备预测性维护",
        "signal_type": "vibration",
        "strategy_type": "sop",
        "sandbox_type": "fault_simulation",
    },
    {
        "id": "process_optimization",
        "name": "炼化工艺参数在线寻优",
        "signal_type": "process_params",
        "strategy_type": "parameter_set",
        "sandbox_type": "tep_simulation",
    },
    {
        "id": "catalyst_research",
        "name": "催化剂电镜图像智能识别",
        "signal_type": "analysis_result",
        "strategy_type": "inference_rule",
        "sandbox_type": "literature_validation",
    },
    {
        "id": "corrosion_prevention",
        "name": "智能防腐蚀分析",
        "signal_type": "corrosion_data",
        "strategy_type": "risk_assessment",
        "sandbox_type": "corrosion_simulation",
    },
]


@router.get("/stats", response_model=APIResponse)
async def knowledge_stats():
    return APIResponse(
        code=0,
        data={
            "entities": len(DEMO_GRAPH_NODES),
            "relations": len(DEMO_GRAPH_EDGES),
            "documents": 156,
            "vectorDim": 1024,
        },
    )


@router.get("/graph", response_model=APIResponse)
async def knowledge_graph(
    scenario: str = Query("", description="Filter by scenario"),
    type: str = Query("", description="Filter by node type"),
):
    nodes = DEMO_GRAPH_NODES
    if type:
        nodes = [n for n in nodes if n["type"] == type]
    edges = [
        e for e in DEMO_GRAPH_EDGES
        if (not type) or any(n["id"] in (e["source"], e["target"]) for n in nodes)
    ]
    return APIResponse(code=0, data={"nodes": nodes, "edges": edges})


@router.get("/terms", response_model=APIResponse)
async def knowledge_terms():
    return APIResponse(code=0, data={"terms": TERM_MAP})


@router.get("/scenario-configs", response_model=APIResponse)
async def knowledge_scenario_configs():
    return APIResponse(code=0, data={"configs": SCENARIO_CONFIGS})
