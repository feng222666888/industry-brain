"""数据生成脚本 - 生成真实感的设备预测性维护演示数据

基于物理模型生成符合实际规律的传感器数据，包括：
- 多设备类型的传感器时序数据
- 故障历史记录
- 维修记录
- 知识库扩展数据
"""

import json
import math
import random
from datetime import datetime, timedelta
from pathlib import Path

# 设置随机种子以保证可重复性
random.seed(42)

# 设备类型定义
DEVICE_TYPES = {
    "centrifugal_pump": {
        "name": "离心泵",
        "normal_vibration_rms": (0.05, 0.12),
        "normal_temperature": (55, 75),
        "normal_pressure": (0.5, 1.2),
        "normal_flow": (150, 250),
        "fault_frequencies": {
            "inner_race_fault": 162,  # BPFI × 转速
            "outer_race_fault": 105,  # BPFO × 转速
            "ball_fault": 141,  # BSF × 转速
        },
    },
    "compressor": {
        "name": "压缩机",
        "normal_vibration_rms": (0.08, 0.15),
        "normal_temperature": (60, 85),
        "normal_pressure": (1.0, 2.5),
        "normal_flow": (200, 400),
        "fault_frequencies": {
            "inner_race_fault": 180,
            "outer_race_fault": 120,
            "ball_fault": 150,
        },
    },
    "heat_exchanger": {
        "name": "换热器",
        "normal_vibration_rms": (0.02, 0.08),
        "normal_temperature": (80, 120),
        "normal_pressure": (0.3, 0.8),
        "normal_flow": (100, 200),
        "fault_frequencies": {},
    },
    "reactor": {
        "name": "反应器",
        "normal_vibration_rms": (0.03, 0.10),
        "normal_temperature": (200, 350),
        "normal_pressure": (1.5, 3.0),
        "normal_flow": (50, 150),
        "fault_frequencies": {},
    },
}

# 设备列表
DEVICES = [
    {
        "device_id": "DEV-PUMP-001",
        "device_name": "循环水泵-001",
        "device_type": "centrifugal_pump",
        "parent_unit": "FCC-催化裂化装置",
        "installation_date": "2020-03-15",
        "rated_power_kw": 185,
        "rated_flow_m3h": 220,
    },
    {
        "device_id": "DEV-PUMP-002",
        "device_name": "进料泵-002",
        "device_type": "centrifugal_pump",
        "parent_unit": "FCC-催化裂化装置",
        "installation_date": "2021-06-20",
        "rated_power_kw": 220,
        "rated_flow_m3h": 280,
    },
    {
        "device_id": "DEV-COMP-001",
        "device_name": "富气压缩机-001",
        "device_type": "compressor",
        "parent_unit": "FCC-催化裂化装置",
        "installation_date": "2019-11-10",
        "rated_power_kw": 1200,
        "rated_flow_m3h": 350,
    },
    {
        "device_id": "DEV-HX-001",
        "device_name": "原料预热器-001",
        "device_type": "heat_exchanger",
        "parent_unit": "常减压蒸馏装置",
        "installation_date": "2020-08-05",
        "rated_power_kw": 0,
        "rated_flow_m3h": 180,
    },
    {
        "device_id": "DEV-REACT-001",
        "device_name": "催化反应器-001",
        "device_type": "reactor",
        "parent_unit": "FCC-催化裂化装置",
        "installation_date": "2018-05-12",
        "rated_power_kw": 0,
        "rated_flow_m3h": 120,
    },
    {
        "device_id": "DEV-PUMP-003",
        "device_name": "常压塔底泵-003",
        "device_type": "centrifugal_pump",
        "parent_unit": "常减压蒸馏装置",
        "installation_date": "2021-09-18",
        "rated_power_kw": 150,
        "rated_flow_m3h": 310,
    },
    {
        "device_id": "DEV-COMP-002",
        "device_name": "循环气压缩机-002",
        "device_type": "compressor",
        "parent_unit": "FCC-催化裂化装置",
        "installation_date": "2020-12-03",
        "rated_power_kw": 800,
        "rated_flow_m3h": 280,
    },
    {
        "device_id": "DEV-PUMP-004",
        "device_name": "回流泵-004",
        "device_type": "centrifugal_pump",
        "parent_unit": "常减压蒸馏装置",
        "installation_date": "2022-02-14",
        "rated_power_kw": 95,
        "rated_flow_m3h": 160,
    },
    {
        "device_id": "DEV-HX-002",
        "device_name": "产品冷却器-002",
        "device_type": "heat_exchanger",
        "parent_unit": "FCC-催化裂化装置",
        "installation_date": "2021-04-22",
        "rated_power_kw": 0,
        "rated_flow_m3h": 200,
    },
    {
        "device_id": "DEV-PUMP-005",
        "device_name": "循环冷却水泵-005",
        "device_type": "centrifugal_pump",
        "parent_unit": "公用工程",
        "installation_date": "2019-07-30",
        "rated_power_kw": 110,
        "rated_flow_m3h": 190,
    },
]


def generate_vibration_signal(
    device_type: str,
    fault_type: str | None = None,
    health_score: float = 1.0,
    duration_seconds: float = 10.0,
    sampling_rate_hz: int = 1000,
) -> list[float]:
    """生成振动信号，包含故障特征频率"""
    device_config = DEVICE_TYPES[device_type]
    n_samples = int(duration_seconds * sampling_rate_hz)
    t_step = 1.0 / sampling_rate_hz
    signal = []

    # 基础噪声
    base_noise_level = 0.02 * (2.0 - health_score)

    for i in range(n_samples):
        t = i * t_step
        value = 0.0

        # 正常运转频率（50Hz或60Hz，假设50Hz）
        rotation_freq = 50.0
        value += 0.05 * math.sin(2 * math.pi * rotation_freq * t)

        # 添加故障特征频率
        if fault_type and fault_type in device_config.get("fault_frequencies", {}):
            fault_freq = device_config["fault_frequencies"][fault_type]
            fault_amplitude = (1.0 - health_score) * 0.3
            value += fault_amplitude * math.sin(2 * math.pi * fault_freq * t)

            # 添加冲击（故障特征）
            if i % int(sampling_rate_hz / fault_freq * 0.8) == 0:
                for j in range(min(20, n_samples - i)):
                    decay = math.exp(-j * 0.15)
                    value += fault_amplitude * 0.8 * decay * random.gauss(0, 1)

        # 添加随机噪声
        value += base_noise_level * random.gauss(0, 1)

        signal.append(round(value, 6))

    return signal


def generate_sensor_timeseries(
    device_id: str, device_type: str, days: int = 30
) -> list[dict]:
    """生成30天的传感器时序数据"""
    device_config = DEVICE_TYPES[device_type]
    data_points = []
    start_date = datetime.now() - timedelta(days=days)

    # 确定设备健康状态趋势（模拟退化）
    initial_health = random.uniform(0.85, 0.95)
    final_health = random.uniform(0.60, 0.85)
    health_trend = [
        initial_health + (final_health - initial_health) * (i / (days * 24 - 1))
        for i in range(days * 24)
    ]

    # 确定是否有故障
    has_fault = random.random() < 0.3  # 30%的设备有故障
    fault_type = None
    if has_fault:
        fault_types = ["inner_race_fault", "outer_race_fault", "ball_fault"]
        fault_type = random.choice(fault_types)

    for hour in range(days * 24):
        timestamp = start_date + timedelta(hours=hour)
        health = health_trend[hour]

        # 生成振动数据
        vibration = generate_vibration_signal(
            device_type, fault_type, health, duration_seconds=10.0
        )

        # 计算RMS值
        rms = math.sqrt(sum(x**2 for x in vibration) / len(vibration))

        # 生成温度（基于健康状态）
        temp_base = random.uniform(*device_config["normal_temperature"])
        temp = temp_base + (1.0 - health) * 15 + random.gauss(0, 2)

        # 生成压力
        pressure = random.uniform(*device_config["normal_pressure"]) + random.gauss(0, 0.05)

        # 生成流量
        flow = random.uniform(*device_config["normal_flow"]) + random.gauss(0, 10)

        data_points.append({
            "timestamp": timestamp.isoformat(),
            "device_id": device_id,
            "vibration_rms": round(rms, 6),
            "vibration_peak": round(max(abs(x) for x in vibration), 6),
            "temperature": round(temp, 2),
            "pressure": round(pressure, 3),
            "flow": round(flow, 2),
            "health_score": round(health, 3),
        })

    return data_points


def generate_fault_history() -> list[dict]:
    """生成历史故障记录"""
    faults = []
    fault_types = [
        {
            "fault_type": "inner_race_fault",
            "description": "轴承内圈故障",
            "severity": "medium",
            "avg_downtime_hours": 8,
        },
        {
            "fault_type": "outer_race_fault",
            "description": "轴承外圈故障",
            "severity": "medium",
            "avg_downtime_hours": 6,
        },
        {
            "fault_type": "ball_fault",
            "description": "轴承滚动体故障",
            "severity": "high",
            "avg_downtime_hours": 12,
        },
        {
            "fault_type": "seal_failure",
            "description": "密封失效",
            "severity": "low",
            "avg_downtime_hours": 4,
        },
        {
            "fault_type": "cavitation",
            "description": "气蚀",
            "severity": "medium",
            "avg_downtime_hours": 5,
        },
    ]

    for i in range(20):
        device = random.choice(DEVICES)
        fault = random.choice(fault_types)
        fault_date = datetime.now() - timedelta(days=random.randint(30, 365))

        faults.append({
            "fault_id": f"FAULT-{i+1:03d}",
            "device_id": device["device_id"],
            "device_name": device["device_name"],
            "fault_type": fault["fault_type"],
            "description": fault["description"],
            "severity": fault["severity"],
            "detected_at": fault_date.isoformat(),
            "resolved_at": (fault_date + timedelta(hours=fault["avg_downtime_hours"])).isoformat(),
            "downtime_hours": fault["avg_downtime_hours"],
            "root_cause": random.choice([
                "润滑不足",
                "安装不当",
                "疲劳磨损",
                "污染物侵入",
                "过载运行",
            ]),
        })

    return sorted(faults, key=lambda x: x["detected_at"], reverse=True)


def generate_maintenance_logs() -> list[dict]:
    """生成维修记录"""
    logs = []
    maintenance_types = [
        {"type": "preventive", "name": "预防性维护", "avg_duration_hours": 4},
        {"type": "corrective", "name": "纠正性维护", "avg_duration_hours": 6},
        {"type": "emergency", "name": "紧急维修", "avg_duration_hours": 8},
    ]

    for i in range(30):
        device = random.choice(DEVICES)
        maint_type = random.choice(maintenance_types)
        maint_date = datetime.now() - timedelta(days=random.randint(1, 180))

        logs.append({
            "log_id": f"MAINT-{i+1:03d}",
            "device_id": device["device_id"],
            "device_name": device["device_name"],
            "maintenance_type": maint_type["type"],
            "maintenance_name": maint_type["name"],
            "started_at": maint_date.isoformat(),
            "completed_at": (maint_date + timedelta(hours=maint_type["avg_duration_hours"])).isoformat(),
            "duration_hours": maint_type["avg_duration_hours"],
            "technician": f"技师-{random.randint(1, 10):02d}",
            "cost_yuan": random.randint(5000, 50000),
            "spare_parts_used": random.choice([
                ["轴承", "润滑脂"],
                ["密封件", "O型圈"],
                ["轴承", "密封件", "润滑脂"],
                ["过滤器"],
            ]),
        })

    return sorted(logs, key=lambda x: x["started_at"], reverse=True)


def generate_knowledge_base() -> dict:
    """生成知识库扩展数据"""
    return {
        "fault_patterns": {
            "inner_race_fault": {
                "description": "轴承内圈故障",
                "symptoms": ["振动RMS值升高", "频谱中出现162Hz特征频率", "温度轻微上升"],
                "root_causes": [
                    {"cause": "润滑不足", "probability": 0.45, "evidence": "润滑油粘度下降或油量不足"},
                    {"cause": "安装不当", "probability": 0.25, "evidence": "轴承安装时过盈量不合适"},
                    {"cause": "疲劳磨损", "probability": 0.20, "evidence": "超过额定使用寿命"},
                    {"cause": "污染物侵入", "probability": 0.10, "evidence": "密封失效导致颗粒物进入"},
                ],
                "severity": "medium",
                "urgency": "需在72小时内安排检修",
            },
            "outer_race_fault": {
                "description": "轴承外圈故障",
                "symptoms": ["振动RMS值升高", "频谱中出现105Hz特征频率", "温度上升"],
                "root_causes": [
                    {"cause": "腐蚀", "probability": 0.40, "evidence": "工艺介质泄漏或环境湿度过高"},
                    {"cause": "过载运行", "probability": 0.35, "evidence": "长期超负荷运行"},
                    {"cause": "装配游隙不当", "probability": 0.25, "evidence": "轴承游隙过小"},
                ],
                "severity": "medium",
                "urgency": "需在48小时内安排检修",
            },
            "ball_fault": {
                "description": "轴承滚动体故障",
                "symptoms": ["振动RMS值显著升高", "频谱中出现141Hz特征频率", "温度明显上升"],
                "root_causes": [
                    {"cause": "材料疲劳", "probability": 0.50, "evidence": "滚动体表面疲劳剥落"},
                    {"cause": "润滑膜破裂", "probability": 0.30, "evidence": "高速运转下润滑膜无法保持"},
                    {"cause": "异物压痕", "probability": 0.20, "evidence": "硬质颗粒嵌入滚动体表面"},
                ],
                "severity": "high",
                "urgency": "需在24小时内安排检修",
            },
        },
        "maintenance_sop_templates": {
            "润滑不足": {
                "title": "轴承润滑维护标准操作规程",
                "estimated_duration_hours": 4,
                "tools_required": ["润滑脂注射枪", "扭矩扳手", "振动检测仪", "红外测温仪"],
                "spare_parts": ["SKF LGMT 2润滑脂（或等效）", "密封垫圈（按设备型号）"],
            },
            "安装不当": {
                "title": "轴承重新安装标准操作规程",
                "estimated_duration_hours": 8,
                "tools_required": ["液压拉拔器", "加热器", "扭矩扳手", "游隙测量仪"],
                "spare_parts": ["新轴承（按设备型号）", "密封件"],
            },
        },
    }


def main():
    """主函数：生成所有数据文件"""
    data_dir = Path(__file__).parent

    print("开始生成演示数据...")

    # 1. 生成设备元数据
    print("生成设备元数据...")
    with open(data_dir / "devices.json", "w", encoding="utf-8") as f:
        json.dump(DEVICES, f, ensure_ascii=False, indent=2)

    # 2. 生成传感器时序数据
    print("生成传感器时序数据...")
    all_timeseries = []
    for device in DEVICES:
        timeseries = generate_sensor_timeseries(
            device["device_id"], device["device_type"], days=30
        )
        all_timeseries.extend(timeseries)

    with open(data_dir / "sensor_timeseries.jsonl", "w", encoding="utf-8") as f:
        for point in all_timeseries:
            f.write(json.dumps(point, ensure_ascii=False) + "\n")

    # 3. 生成故障历史
    print("生成故障历史记录...")
    fault_history = generate_fault_history()
    with open(data_dir / "fault_history.json", "w", encoding="utf-8") as f:
        json.dump(fault_history, f, ensure_ascii=False, indent=2)

    # 4. 生成维修记录
    print("生成维修记录...")
    maintenance_logs = generate_maintenance_logs()
    with open(data_dir / "maintenance_logs.json", "w", encoding="utf-8") as f:
        json.dump(maintenance_logs, f, ensure_ascii=False, indent=2)

    # 5. 生成知识库数据
    print("生成知识库数据...")
    knowledge_base = generate_knowledge_base()
    with open(data_dir / "knowledge_base.json", "w", encoding="utf-8") as f:
        json.dump(knowledge_base, f, ensure_ascii=False, indent=2)

    print(f"数据生成完成！文件保存在: {data_dir}")
    print(f"- 设备数量: {len(DEVICES)}")
    print(f"- 时序数据点: {len(all_timeseries)}")
    print(f"- 故障记录: {len(fault_history)}")
    print(f"- 维修记录: {len(maintenance_logs)}")


if __name__ == "__main__":
    main()
