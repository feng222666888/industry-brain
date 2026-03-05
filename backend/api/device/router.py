"""Device predictive maintenance API — Scenario 3.

Endpoints aligned with docs/api_spec.md section 1.
"""

from __future__ import annotations

import asyncio
import json
import logging
import random
from collections.abc import AsyncGenerator
from datetime import datetime, timedelta

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from backend.industries.petrochemical.agents.device.monitor_agent import (
    _classify_fault,
    _compute_features,
)
from backend.industries.petrochemical.agents.device.pipeline import device_pipeline
from backend.models.schemas import (
    APIResponse,
    DiagnoseRequest,
    PredictRequest,
    PredictResult,
)

logger = logging.getLogger(__name__)

# 导入调试日志器
try:
    from backend.api.device.debug_logger import log_device_api
except ImportError:
    # 如果导入失败，使用空函数
    def log_device_api(*args, **kwargs):
        pass
router = APIRouter()


def _generate_health_trend(base_score: float, days: int = 10) -> list[dict]:
    """生成健康趋势数据（过去N天，每天一个点）"""
    trend = []
    now = datetime.now()
    # 生成一个下降趋势（模拟设备退化）
    for i in range(days):
        # 轻微波动 + 缓慢下降
        day_offset = days - i - 1
        score = base_score + (0.95 - base_score) * (day_offset / days) + random.uniform(-0.02, 0.02)
        score = max(0.3, min(1.0, score))  # 限制在0.3-1.0之间
        timestamp = (now - timedelta(days=day_offset)).replace(hour=12, minute=0, second=0, microsecond=0)
        trend.append(
            {
                "timestamp": timestamp.isoformat() + "Z",
                "score": round(score, 3),
            }
        )
    return trend


def _generate_alerts(health_score: float, device_type: str) -> list[dict]:
    """根据健康评分生成告警信息"""
    alerts = []
    now = datetime.now()

    # 健康评分越低，告警越多
    if health_score < 0.6:
        # 严重告警（3-4条）
        alerts.append(
            {
                "type": "critical",
                "message": "设备健康评分低于60%，存在严重故障风险，建议立即停机检修",
                "since": (now - timedelta(hours=2)).isoformat() + "Z",
            }
        )
        alerts.append(
            {
                "type": "vibration_critical",
                "message": "振动值严重超标 (5.8 mm/s)，可能为轴承故障或机械不平衡",
                "since": (now - timedelta(hours=1)).isoformat() + "Z",
            }
        )
        alerts.append(
            {
                "type": "temperature_critical",
                "message": f"温度 {random.randint(85, 95)}°C 严重偏高，存在过热风险",
                "since": (now - timedelta(hours=1, minutes=30)).isoformat() + "Z",
            }
        )
        if "pump" in device_type.lower():
            alerts.append(
                {
                    "type": "bearing_failure_risk",
                    "message": "轴承故障风险高，建议立即更换轴承",
                    "since": (now - timedelta(minutes=45)).isoformat() + "Z",
                }
            )
    elif health_score < 0.75:
        # 警告级别（3-4条）
        if "pump" in device_type.lower():
            alerts.append(
                {
                    "type": "vibration_warning",
                    "message": f"振动RMS值 {random.uniform(3.5, 4.5):.1f} mm/s 超过预警阈值，建议关注轴承状态",
                    "since": (now - timedelta(hours=3)).isoformat() + "Z",
                }
            )
            alerts.append(
                {
                    "type": "bearing_degradation",
                    "message": "轴承性能退化，预计剩余使用寿命约336小时",
                    "since": (now - timedelta(hours=4)).isoformat() + "Z",
                }
            )
        alerts.append(
            {
                "type": "temperature_warning",
                "message": f"温度 {random.randint(70, 80)}°C 偏高，超出正常范围 (正常: 50-65°C)",
                "since": (now - timedelta(hours=2)).isoformat() + "Z",
            }
        )
        alerts.append(
            {
                "type": "performance_degradation",
                "message": "设备效率下降约8%，建议安排预防性维护",
                "since": (now - timedelta(hours=5)).isoformat() + "Z",
            }
        )
    elif health_score < 0.85:
        # 轻微警告（2条）
        alerts.append(
            {
                "type": "performance_degradation",
                "message": "设备性能轻微下降，建议安排预防性维护",
                "since": (now - timedelta(hours=6)).isoformat() + "Z",
            }
        )
        if random.random() < 0.5:  # 50%概率生成第二条
            alerts.append(
                {
                    "type": "routine_maintenance",
                    "message": "建议在下次停机时进行例行检查",
                    "since": (now - timedelta(hours=12)).isoformat() + "Z",
                }
            )
    else:
        # 健康设备也可能有轻微提醒（1条，可选）
        if random.random() < 0.3:  # 30%概率
            alerts.append(
                {
                    "type": "routine_check",
                    "message": "设备运行正常，建议按计划进行例行检查",
                    "since": (now - timedelta(days=1)).isoformat() + "Z",
                }
            )

    return alerts


DEMO_DEVICE_HEALTH = {
    "DEV-PUMP-001": {
        "device_name": "循环水泵-001",
        "device_type": "centrifugal_pump",
        "current_health_score": 0.72,
    },
    "DEV-PUMP-002": {
        "device_name": "进料泵-002",
        "device_type": "centrifugal_pump",
        "current_health_score": 0.88,
    },
    "DEV-COMP-001": {
        "device_name": "富气压缩机-001",
        "device_type": "compressor",
        "current_health_score": 0.91,
    },
    "DEV-HX-001": {
        "device_name": "原料预热器-001",
        "device_type": "heat_exchanger",
        "current_health_score": 0.95,
    },
    "DEV-PUMP-003": {
        "device_name": "常压塔底泵-003",
        "device_type": "centrifugal_pump",
        "current_health_score": 0.85,
    },
}


@router.post("/predict")
async def predict_failure(req: PredictRequest):
    """Predict device failure based on sensor time-series data."""
    features = _compute_features(req.sensor_data.vibration)
    fault_type, risk_level, confidence = _classify_fault(features)

    health_score = max(0.1, 1.0 - features["rms"] * 2)
    rul_hours = None
    recommended_action = "continue_monitoring"

    if risk_level == "high":
        rul_hours = 72
        recommended_action = "schedule_immediate_inspection"
    elif risk_level == "medium":
        rul_hours = 336
        recommended_action = "schedule_inspection"

    result = PredictResult(
        device_id=req.device_id,
        health_score=round(health_score, 2),
        risk_level=risk_level,
        predicted_failure=fault_type if fault_type != "normal" else None,
        confidence=confidence,
        remaining_useful_life_hours=rul_hours,
        recommended_action=recommended_action,
    )

    return APIResponse(data=result.model_dump())


@router.get("/{device_id}/health")
async def get_device_health(device_id: str):
    """Get device health score and trend."""
    logger.info(f"[Device Health API] Request for device_id: {device_id}")
    log_device_api("INFO", f"Health API request", device_id=device_id)
    
    # 优先从JSON文件读取（如果存在）
    try:
        from pathlib import Path

        # 正确路径：从 backend/api/device/router.py 到 demo/device_predictive_maintenance/data/device_health_data.json
        # backend/api/device/router.py -> backend/api/device/ -> backend/api/ -> backend/ -> 项目根目录
        # 然后 -> demo/device_predictive_maintenance/data/device_health_data.json
        health_data_file = Path(__file__).parent.parent.parent.parent / "demo" / "device_predictive_maintenance" / "data" / "device_health_data.json"
        logger.info(f"[Device Health API] Checking health data file: {health_data_file}")
        log_device_api("INFO", f"Checking health data file", file_path=str(health_data_file), exists=health_data_file.exists())
        
        if health_data_file.exists():
            with open(health_data_file, encoding="utf-8") as f:
                health_data = json.load(f)
                logger.info(f"[Device Health API] Loaded health data for {len(health_data)} devices")
                log_device_api("INFO", f"Loaded health data", device_count=len(health_data), available_ids=list(health_data.keys())[:5])
                
                if device_id in health_data:
                    device_health = health_data[device_id]
                    trend_count = len(device_health.get("health_trend", []))
                    alerts_count = len(device_health.get("active_alerts", []))
                    trend_sample = [t.get("score") for t in device_health.get("health_trend", [])[:3]]
                    logger.info(f"[Device Health API] Found device {device_id}: trend={trend_count} points, alerts={alerts_count}")
                    log_device_api("INFO", f"Found device in file", 
                                 device_id=device_id, 
                                 trend_count=trend_count, 
                                 alerts_count=alerts_count,
                                 trend_sample=trend_sample,
                                 health_score=device_health.get("current_health_score"))
                    return APIResponse(data=device_health)
                else:
                    logger.warning(f"[Device Health API] Device {device_id} not found in health data file")
                    log_device_api("WARNING", f"Device not found in file", device_id=device_id, available_ids=list(health_data.keys())[:5])
    except Exception as e:
        logger.warning(f"[Device Health API] Failed to load health data from file: {e}", exc_info=True)
        log_device_api("ERROR", f"Failed to load health data file", error=str(e), error_type=type(e).__name__)

    # Fallback到原有逻辑（生成数据）
    logger.info(f"[Device Health API] Using fallback logic for device {device_id}")
    log_device_api("INFO", f"Using fallback logic", device_id=device_id)
    health = DEMO_DEVICE_HEALTH.get(device_id)
    if not health:
        base_score = random.uniform(0.75, 0.95)
        health = {
            "device_name": f"设备-{device_id}",
            "device_type": "unknown",
            "current_health_score": base_score,
        }
        logger.info(f"[Device Health API] Generated default health for unknown device: {device_id}")
        log_device_api("INFO", f"Generated default health", device_id=device_id, health_score=base_score)

    health_trend = _generate_health_trend(health["current_health_score"], days=10)
    active_alerts = _generate_alerts(health["current_health_score"], health.get("device_type", "unknown"))
    
    logger.info(f"[Device Health API] Generated fallback data: trend={len(health_trend)} points, alerts={len(active_alerts)}")
    log_device_api("INFO", f"Generated fallback data", 
                   device_id=device_id,
                   trend_count=len(health_trend),
                   alerts_count=len(active_alerts),
                   trend_sample=[t.get("score") for t in health_trend[:3]] if isinstance(health_trend[0], dict) else health_trend[:3])

    return APIResponse(
        data={
            "device_id": device_id,
            "device_name": health["device_name"],
            "device_type": health["device_type"],
            "current_health_score": health["current_health_score"],
            "health_trend": health_trend,
            "active_alerts": active_alerts,
        }
    )


@router.post("/{device_id}/diagnose")
async def diagnose_fault(device_id: str, req: DiagnoseRequest):
    """Trigger Multi-Agent collaborative diagnosis — SSE stream."""
    logger.info(f"[Device Diagnose API] Starting diagnosis for device: {device_id}")
    logger.info(f"[Device Diagnose API] Request: {req.model_dump()}")
    log_device_api("INFO", f"Diagnosis request", device_id=device_id, request=req.model_dump())

    async def event_stream() -> AsyncGenerator[str, None]:
        try:
            logger.info(f"[Device Diagnose API] Running device pipeline for {device_id}")
            log_device_api("INFO", f"Running device pipeline", device_id=device_id)
            
            initial_input = {
                "device_id": device_id,
                "sensor_data": {"vibration": _generate_demo_vibration(req.anomaly_type)},
                "anomaly_type": req.anomaly_type,
                "context": req.context,
            }
            log_device_api("INFO", f"Pipeline initial input", device_id=device_id, input_keys=list(initial_input.keys()))
            
            result = await device_pipeline.run(
                session_id=f"diag-{device_id}",
                entry_agent="monitor",
                initial_input=initial_input,
            )
            
            log_device_api("INFO", f"Pipeline completed", 
                         device_id=device_id,
                         steps=result.get("steps", 0),
                         has_traces=bool(result.get("traces")),
                         has_results=bool(result.get("results")))

            # 发送每个Agent步骤
            traces = result.get("traces", [])
            results = result.get("results", {})
            
            log_device_api("INFO", f"Pipeline result received", 
                         device_id=device_id,
                         has_traces=bool(traces),
                         traces_count=len(traces) if traces else 0,
                         has_results=bool(results),
                         result_keys=list(results.keys()) if results else [])

            if traces:
                # 使用traces数据
                for trace in traces:
                    agent_name = trace.get("agent_name", "unknown")
                    action = trace.get("action", "processing")
                    output_summary = trace.get("output_summary", "")
                    message = trace.get("output_summary", trace.get("message", ""))

                    trace_data = {
                        "agent": agent_name,
                        "action": action,
                        "result": message or output_summary,
                        "summary": output_summary or message,
                        "message": message,
                    }
                    log_device_api("INFO", f"Sending agent step", 
                                 device_id=device_id,
                                 agent=agent_name,
                                 action=action)
                    yield f"event: agent_step\ndata: {json.dumps(trace_data, ensure_ascii=False)}\n\n"
                    await asyncio.sleep(0.5)
            elif results:
                # 如果没有traces，从results中提取信息
                agent_names = ["monitor", "diagnosis", "repair"]
                for agent_name in agent_names:
                    if agent_name in results:
                        agent_data = results[agent_name]
                        if isinstance(agent_data, dict):
                            message = agent_data.get("message", str(agent_data))
                        else:
                            message = str(agent_data)

                        trace_data = {
                            "agent": agent_name,
                            "action": "completed",
                            "result": message,
                            "summary": message,
                            "message": message,
                        }
                        yield f"event: agent_step\ndata: {json.dumps(trace_data, ensure_ascii=False)}\n\n"
                        await asyncio.sleep(0.5)

            # 发送完成事件
            log_device_api("INFO", f"Sending complete event", device_id=device_id)
            yield f"event: complete\ndata: {json.dumps({'session_id': result['session_id'], 'total_latency_ms': result['total_latency_ms'], 'results': result['results']}, ensure_ascii=False, default=str)}\n\n"
        except Exception as e:
            logger.exception(f"[Device Diagnose API] Error in diagnosis stream for {device_id}: {e}")
            error_msg = str(e)
            error_type = type(e).__name__
            logger.error(f"[Device Diagnose API] Error details: {error_type}: {error_msg}")
            log_device_api("ERROR", f"Diagnosis stream error", 
                         device_id=device_id,
                         error=error_msg,
                         error_type=error_type,
                         error_traceback=str(e.__traceback__) if hasattr(e, '__traceback__') else None)
            yield f"event: error\ndata: {json.dumps({'error': error_msg, 'type': error_type}, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _generate_demo_vibration(anomaly_type: str) -> list[float]:
    """Generate demo vibration data matching the anomaly type for diagnosis."""
    import math
    import random

    random.seed(42)
    n = 200
    t_step = 1.0 / 12000

    signal = [0.05 * random.gauss(0, 1) for _ in range(n)]

    if "vibration" in anomaly_type or "bearing" in anomaly_type:
        for i in range(n):
            signal[i] += 0.3 * math.sin(2 * math.pi * 162 * i * t_step)
            if i % 74 == 0:
                for j in range(min(20, n - i)):
                    signal[i + j] += 0.8 * math.exp(-j * 0.15)
    elif "cavitation" in anomaly_type:
        for i in range(n):
            if random.random() < 0.1:
                signal[i] += random.uniform(0.5, 1.2)

    return signal
