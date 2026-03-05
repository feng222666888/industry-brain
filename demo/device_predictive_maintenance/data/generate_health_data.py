"""生成设备健康趋势和告警数据的脚本"""

import json
import random
from datetime import datetime, timedelta
from pathlib import Path

# 设备配置
DEVICES = [
    {
        "device_id": "DEV-PUMP-001",
        "device_name": "循环水泵-001",
        "device_type": "centrifugal_pump",
        "current_health_score": 0.72,
    },
    {
        "device_id": "DEV-PUMP-002",
        "device_name": "进料泵-002",
        "device_type": "centrifugal_pump",
        "current_health_score": 0.88,
    },
    {
        "device_id": "DEV-COMP-001",
        "device_name": "富气压缩机-001",
        "device_type": "compressor",
        "current_health_score": 0.91,
    },
    {
        "device_id": "DEV-HX-001",
        "device_name": "原料预热器-001",
        "device_type": "heat_exchanger",
        "current_health_score": 0.95,
    },
    {
        "device_id": "DEV-PUMP-003",
        "device_name": "常压塔底泵-003",
        "device_type": "centrifugal_pump",
        "current_health_score": 0.85,
    },
]


def generate_health_trend(base_score: float, days: int = 10) -> list[dict]:
    """生成健康趋势数据（过去N天，每天一个点）"""
    trend = []
    now = datetime.now()
    # 生成一个下降趋势（模拟设备退化）
    for i in range(days):
        # 轻微波动 + 缓慢下降
        day_offset = days - i - 1
        # 从稍高的值开始，逐渐下降到当前值
        start_score = min(0.95, base_score + 0.15)
        progress = day_offset / (days - 1) if days > 1 else 0
        score = start_score - (start_score - base_score) * (1 - progress) + random.uniform(-0.02, 0.02)
        score = max(0.3, min(1.0, score))  # 限制在0.3-1.0之间
        timestamp = (now - timedelta(days=day_offset)).replace(hour=12, minute=0, second=0, microsecond=0)
        trend.append({
            "timestamp": timestamp.isoformat() + "Z",
            "score": round(score, 3),
        })
    return trend


def generate_alerts(health_score: float, device_type: str) -> list[dict]:
    """根据健康评分生成告警信息"""
    alerts = []
    now = datetime.now()
    
    # 健康评分越低，告警越多
    if health_score < 0.6:
        # 严重告警（3-4条）
        alerts.append({
            "type": "critical",
            "message": "设备健康评分低于60%，存在严重故障风险，建议立即停机检修",
            "since": (now - timedelta(hours=2)).isoformat() + "Z",
        })
        alerts.append({
            "type": "vibration_critical",
            "message": "振动值严重超标 (5.8 mm/s)，可能为轴承故障或机械不平衡",
            "since": (now - timedelta(hours=1)).isoformat() + "Z",
        })
        alerts.append({
            "type": "temperature_critical",
            "message": f"温度 {random.randint(85, 95)}°C 严重偏高，存在过热风险",
            "since": (now - timedelta(hours=1, minutes=30)).isoformat() + "Z",
        })
        if "pump" in device_type.lower():
            alerts.append({
                "type": "bearing_failure_risk",
                "message": "轴承故障风险高，建议立即更换轴承",
                "since": (now - timedelta(minutes=45)).isoformat() + "Z",
            })
    elif health_score < 0.75:
        # 警告级别（3-4条）
        if "pump" in device_type.lower():
            alerts.append({
                "type": "vibration_warning",
                "message": f"振动RMS值 {random.uniform(3.5, 4.5):.1f} mm/s 超过预警阈值，建议关注轴承状态",
                "since": (now - timedelta(hours=3)).isoformat() + "Z",
            })
            alerts.append({
                "type": "bearing_degradation",
                "message": "轴承性能退化，预计剩余使用寿命约336小时",
                "since": (now - timedelta(hours=4)).isoformat() + "Z",
            })
        alerts.append({
            "type": "temperature_warning",
            "message": f"温度 {random.randint(70, 80)}°C 偏高，超出正常范围 (正常: 50-65°C)",
            "since": (now - timedelta(hours=2)).isoformat() + "Z",
        })
        alerts.append({
            "type": "performance_degradation",
            "message": "设备效率下降约8%，建议安排预防性维护",
            "since": (now - timedelta(hours=5)).isoformat() + "Z",
        })
    elif health_score < 0.85:
        # 轻微警告（2条）
        alerts.append({
            "type": "performance_degradation",
            "message": "设备性能轻微下降，建议安排预防性维护",
            "since": (now - timedelta(hours=6)).isoformat() + "Z",
        })
        if random.random() < 0.5:  # 50%概率生成第二条
            alerts.append({
                "type": "routine_maintenance",
                "message": "建议在下次停机时进行例行检查",
                "since": (now - timedelta(hours=12)).isoformat() + "Z",
            })
    else:
        # 健康设备也可能有轻微提醒（1条，可选）
        if random.random() < 0.3:  # 30%概率
            alerts.append({
                "type": "routine_check",
                "message": "设备运行正常，建议按计划进行例行检查",
                "since": (now - timedelta(days=1)).isoformat() + "Z",
            })
    
    return alerts


def generate_all_health_data():
    """为所有设备生成健康数据"""
    health_data = {}
    
    for device in DEVICES:
        device_id = device["device_id"]
        health_score = device["current_health_score"]
        device_type = device["device_type"]
        
        # 生成健康趋势
        health_trend = generate_health_trend(health_score, days=10)
        
        # 生成告警
        active_alerts = generate_alerts(health_score, device_type)
        
        health_data[device_id] = {
            "device_id": device_id,
            "device_name": device["device_name"],
            "device_type": device_type,
            "current_health_score": health_score,
            "health_trend": health_trend,
            "active_alerts": active_alerts,
        }
    
    return health_data


def main():
    """主函数：生成数据并保存到JSON文件"""
    script_dir = Path(__file__).parent
    output_file = script_dir / "device_health_data.json"
    
    print("正在生成设备健康数据...")
    health_data = generate_all_health_data()
    
    # 保存到JSON文件
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(health_data, f, ensure_ascii=False, indent=2)
    
    print(f"OK: Data generated and saved to: {output_file}")
    print(f"   Generated data for {len(health_data)} devices")
    
    # 打印摘要
    for device_id, data in health_data.items():
        print(f"\n{data['device_name']} ({device_id}):")
        print(f"  Health Score: {data['current_health_score']:.2%}")
        print(f"  Trend Data Points: {len(data['health_trend'])}")
        print(f"  Alerts Count: {len(data['active_alerts'])}")


if __name__ == "__main__":
    main()
