"""Repair Agent — generates structured maintenance SOP based on diagnosis.

Produces a step-by-step maintenance procedure referencing equipment manuals,
safety requirements, and spare parts. In production, this invokes LLM with
retrieved SOP templates from the knowledge center.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from backend.core.multi_agent.engine import AgentAction, AgentResult

logger = logging.getLogger(__name__)

SOP_TEMPLATES = {
    "润滑不足": {
        "title": "轴承润滑维护标准操作规程",
        "safety_precautions": [
            "确认设备已完全停机并挂牌锁定（LOTO）",
            "佩戴防护手套和护目镜",
            "确认工作区域通风良好",
        ],
        "tools_required": ["润滑脂注射枪", "扭矩扳手", "振动检测仪", "红外测温仪"],
        "spare_parts": ["SKF LGMT 2润滑脂（或等效）", "密封垫圈（按设备型号）"],
        "steps": [
            {"step": 1, "action": "停机并执行LOTO程序", "duration_min": 15, "notes": "确认所有能量源已隔离"},
            {"step": 2, "action": "拆除轴承护罩并清洁外部", "duration_min": 20, "notes": "使用无纺布擦拭，不要使用压缩空气"},
            {"step": 3, "action": "检查现有润滑脂状态", "duration_min": 10, "notes": "观察颜色、粘稠度，记录异常"},
            {"step": 4, "action": "排出旧润滑脂", "duration_min": 15, "notes": "从排脂口缓慢排出，不要过度加压"},
            {"step": 5, "action": "注入新润滑脂", "duration_min": 10, "notes": "按设备手册规定量注入，通常为轴承空间的30-50%"},
            {"step": 6, "action": "重新安装护罩并紧固", "duration_min": 15, "notes": "按规定扭矩值紧固螺栓"},
            {"step": 7, "action": "试运行并监测振动/温度", "duration_min": 30, "notes": "运行30分钟后测量振动值和轴承温度"},
            {"step": 8, "action": "记录维护数据并归档", "duration_min": 10, "notes": "更新设备台账和润滑记录"},
        ],
        "estimated_duration_hours": 2.5,
        "reference_standards": ["API 686 — 旋转设备对中和安装", "ISO 15243 — 滚动轴承损伤分类"],
    },
    "default": {
        "title": "通用设备检修标准操作规程",
        "safety_precautions": [
            "确认设备已停机并挂牌锁定",
            "佩戴个人防护装备（PPE）",
            "办理检修作业票",
        ],
        "tools_required": ["标准工具箱", "振动检测仪", "红外测温仪"],
        "spare_parts": ["根据诊断结果确定"],
        "steps": [
            {"step": 1, "action": "停机并执行安全隔离", "duration_min": 15},
            {"step": 2, "action": "外观检查并记录异常", "duration_min": 20},
            {"step": 3, "action": "拆解检查故障部位", "duration_min": 60},
            {"step": 4, "action": "更换或修复故障部件", "duration_min": 120},
            {"step": 5, "action": "复装并试运行验证", "duration_min": 60},
            {"step": 6, "action": "记录归档", "duration_min": 15},
        ],
        "estimated_duration_hours": 5.0,
        "reference_standards": [],
    },
}


async def run(input_data: dict[str, Any], memory, tracer) -> AgentResult:
    device_id = input_data.get("device_id", "unknown")
    primary_root_cause = input_data.get("primary_root_cause", "unknown")
    fault_description = input_data.get("fault_description", "未知故障")
    severity = input_data.get("severity", "medium")
    urgency = input_data.get("urgency", "待确认")

    template = SOP_TEMPLATES.get(primary_root_cause, SOP_TEMPLATES["default"])

    sop_id = f"SOP-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

    sop = {
        "sop_id": sop_id,
        "device_id": device_id,
        "fault_description": fault_description,
        "root_cause": primary_root_cause,
        "severity": severity,
        "urgency": urgency,
        "title": template["title"],
        "safety_precautions": template["safety_precautions"],
        "tools_required": template["tools_required"],
        "spare_parts": template["spare_parts"],
        "steps": template["steps"],
        "estimated_duration_hours": template["estimated_duration_hours"],
        "reference_standards": template["reference_standards"],
        "generated_at": datetime.now().isoformat(),
    }

    total_steps = len(template["steps"])
    total_minutes = sum(s.get("duration_min", 0) for s in template["steps"])

    return AgentResult(
        action=AgentAction.COMPLETE,
        data=sop,
        message=(
            f"Generated SOP '{sop_id}' for {device_id}: {template['title']}. "
            f"{total_steps} steps, estimated {template['estimated_duration_hours']}h. "
            f"{urgency}"
        ),
    )
