"""演示专用API路由 - 设备预测性维护演示系统

提供设备列表、传感器数据查询、诊断触发等接口
所有数据从生成的演示数据文件中读取
"""

from __future__ import annotations

import json
import logging
from collections.abc import AsyncGenerator
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

# 导入现有的agent pipeline（复用现有功能）
import sys
from pathlib import Path as PathLib

# 添加项目根目录到路径
project_root = PathLib(__file__).parent.parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.industries.petrochemical.agents.device.pipeline import device_pipeline
from backend.models.schemas import DiagnoseRequest as BaseDiagnoseRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/device-demo", tags=["device-demo"])

# 数据文件路径
DATA_DIR = Path(__file__).parent.parent.parent / "data"
DEVICES_FILE = DATA_DIR / "devices.json"
SENSOR_DATA_FILE = DATA_DIR / "sensor_timeseries.jsonl"
FAULT_HISTORY_FILE = DATA_DIR / "fault_history.json"
MAINTENANCE_LOGS_FILE = DATA_DIR / "maintenance_logs.json"
KNOWLEDGE_BASE_FILE = DATA_DIR / "knowledge_base.json"
CASE_STUDIES_FILE = DATA_DIR / "real_cases" / "case_studies.json"
INDUSTRY_STATS_FILE = DATA_DIR / "real_cases" / "industry_stats.json"
HEALTH_DATA_FILE = DATA_DIR / "device_health_data.json"
DIAGNOSIS_DATA_FILE = DATA_DIR / "device_diagnosis_data.json"
PREDICTION_FEEDBACK_FILE = DATA_DIR / "prediction_feedback_data.json"


# 缓存数据
_cached_devices: list[dict] | None = None
_cached_sensor_data: list[dict] | None = None
_cached_fault_history: list[dict] | None = None
_cached_maintenance_logs: list[dict] | None = None
_cached_knowledge_base: dict | None = None
_cached_case_studies: dict | None = None
_cached_industry_stats: dict | None = None
_cached_diagnosis_data: dict | None = None
_cached_prediction_feedback: dict | None = None
_cached_health_data: dict | None = None


def _load_json_file(file_path: Path) -> dict | list:
    """加载JSON文件"""
    if not file_path.exists():
        logger.warning(f"File not found: {file_path}")
        # health_data文件返回空字典，其他根据文件名判断
        if "health" in file_path.name:
            return {}
        return {} if "case" in file_path.name or "stats" in file_path.name else []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading {file_path}: {e}")
        return {} if "case" in file_path.name or "stats" in file_path.name or "health" in file_path.name else []


def _load_jsonl_file(file_path: Path) -> list[dict]:
    """加载JSONL文件"""
    if not file_path.exists():
        logger.warning(f"File not found: {file_path}")
        return []
    data = []
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                data.append(json.loads(line))
    return data


def _get_devices() -> list[dict]:
    """获取设备列表（带缓存）"""
    global _cached_devices
    if _cached_devices is None:
        _cached_devices = _load_json_file(DEVICES_FILE)
    return _cached_devices


def _get_sensor_data() -> list[dict]:
    """获取传感器数据（带缓存）"""
    global _cached_sensor_data
    if _cached_sensor_data is None:
        _cached_sensor_data = _load_jsonl_file(SENSOR_DATA_FILE)
    return _cached_sensor_data


def _get_fault_history() -> list[dict]:
    """获取故障历史（带缓存）"""
    global _cached_fault_history
    if _cached_fault_history is None:
        _cached_fault_history = _load_json_file(FAULT_HISTORY_FILE)
    return _cached_fault_history


def _get_maintenance_logs() -> list[dict]:
    """获取维修记录（带缓存）"""
    global _cached_maintenance_logs
    if _cached_maintenance_logs is None:
        _cached_maintenance_logs = _load_json_file(MAINTENANCE_LOGS_FILE)
    return _cached_maintenance_logs


def _get_knowledge_base() -> dict:
    """获取知识库（带缓存）"""
    global _cached_knowledge_base
    if _cached_knowledge_base is None:
        _cached_knowledge_base = _load_json_file(KNOWLEDGE_BASE_FILE)
    return _cached_knowledge_base


def _get_case_studies() -> dict:
    """获取案例研究（带缓存）"""
    global _cached_case_studies
    if _cached_case_studies is None:
        _cached_case_studies = _load_json_file(CASE_STUDIES_FILE)
    return _cached_case_studies


def _get_industry_stats() -> dict:
    """获取行业统计（带缓存）"""
    global _cached_industry_stats
    if _cached_industry_stats is None:
        _cached_industry_stats = _load_json_file(INDUSTRY_STATS_FILE)
    return _cached_industry_stats


def _get_health_data() -> dict:
    """获取设备健康数据（带缓存）"""
    global _cached_health_data
    if _cached_health_data is None:
        health_data = _load_json_file(HEALTH_DATA_FILE)
        # 确保返回字典类型
        _cached_health_data = health_data if isinstance(health_data, dict) else {}
    return _cached_health_data


@router.get("/devices")
async def list_devices():
    """获取所有设备列表"""
    devices = _get_devices()
    return {"code": 0, "data": devices, "message": "ok"}


@router.get("/devices/{device_id}")
async def get_device(device_id: str):
    """获取单个设备详情"""
    devices = _get_devices()
    device = next((d for d in devices if d["device_id"] == device_id), None)
    if not device:
        return {"code": 404, "data": None, "message": f"Device {device_id} not found"}
    return {"code": 0, "data": device, "message": "ok"}


@router.get("/devices/{device_id}/health")
async def get_device_health(device_id: str):
    """获取设备健康状态和趋势（从JSON文件读取）"""
    # 优先从健康数据文件读取
    health_data = _get_health_data()
    
    if health_data and device_id in health_data:
        # 直接从文件读取完整数据
        return {
            "code": 0,
            "data": health_data[device_id],
            "message": "ok",
        }
    
    # 如果文件不存在或设备不在文件中，fallback到原有逻辑
    sensor_data = _get_sensor_data()
    devices = _get_devices()
    
    device = next((d for d in devices if d["device_id"] == device_id), None)
    if not device:
        return {"code": 404, "data": None, "message": f"Device {device_id} not found"}
    
    # 获取该设备的最新传感器数据
    device_sensor_data = [d for d in sensor_data if d["device_id"] == device_id]
    if not device_sensor_data:
        return {
            "code": 0,
            "data": {
                "device_id": device_id,
                "device_name": device["device_name"],
                "device_type": device["device_type"],
                "current_health_score": 0.90,
                "health_trend": [],
                "active_alerts": [],
            },
            "message": "ok",
        }
    
    # 按时间排序，获取最新的数据
    device_sensor_data.sort(key=lambda x: x["timestamp"])
    latest = device_sensor_data[-1]
    
    # 生成健康趋势（最近24小时，每小时一个点）
    recent_data = device_sensor_data[-24:] if len(device_sensor_data) >= 24 else device_sensor_data
    health_trend = [
        {"timestamp": d["timestamp"], "score": d["health_score"]}
        for d in recent_data
    ]
    
    # 生成告警
    active_alerts = []
    if latest["vibration_rms"] > 0.15:
        active_alerts.append({
            "type": "vibration_warning",
            "message": f"振动RMS值 {latest['vibration_rms']:.3f} 超过预警阈值",
            "since": latest["timestamp"],
        })
    if latest["temperature"] > 80:
        active_alerts.append({
            "type": "temperature_warning",
            "message": f"温度 {latest['temperature']:.1f}°C 偏高",
            "since": latest["timestamp"],
        })
    
    return {
        "code": 0,
        "data": {
            "device_id": device_id,
            "device_name": device["device_name"],
            "device_type": device["device_type"],
            "current_health_score": latest["health_score"],
            "health_trend": health_trend,
            "active_alerts": active_alerts,
        },
        "message": "ok",
    }


@router.get("/devices/{device_id}/sensor-data")
async def get_sensor_data(
    device_id: str,
    hours: int = Query(24, description="获取最近N小时的数据"),
    limit: int = Query(100, description="最大返回数据点数"),
):
    """获取设备传感器数据"""
    sensor_data = _get_sensor_data()
    device_data = [d for d in sensor_data if d["device_id"] == device_id]
    
    if not device_data:
        return {"code": 404, "data": [], "message": f"No sensor data for device {device_id}"}
    
    # 按时间排序
    device_data.sort(key=lambda x: x["timestamp"])
    
    # 过滤最近N小时的数据
    cutoff_time = datetime.now() - timedelta(hours=hours)
    recent_data = [
        d for d in device_data
        if datetime.fromisoformat(d["timestamp"].replace("Z", "+00:00").replace("+00:00", "")) >= cutoff_time
    ]
    
    # 限制返回数量
    if len(recent_data) > limit:
        # 均匀采样
        step = len(recent_data) // limit
        recent_data = recent_data[::step][:limit]
    
    return {"code": 0, "data": recent_data, "message": "ok"}


@router.get("/devices/{device_id}/fault-history")
async def get_fault_history(device_id: str, limit: int = Query(10, description="返回数量")):
    """获取设备故障历史"""
    fault_history = _get_fault_history()
    device_faults = [f for f in fault_history if f["device_id"] == device_id]
    device_faults.sort(key=lambda x: x["detected_at"], reverse=True)
    return {"code": 0, "data": device_faults[:limit], "message": "ok"}


@router.get("/devices/{device_id}/maintenance-logs")
async def get_maintenance_logs(device_id: str, limit: int = Query(10, description="返回数量")):
    """获取设备维修记录"""
    maintenance_logs = _get_maintenance_logs()
    device_logs = [m for m in maintenance_logs if m["device_id"] == device_id]
    device_logs.sort(key=lambda x: x["started_at"], reverse=True)
    return {"code": 0, "data": device_logs[:limit], "message": "ok"}


@router.get("/devices/{device_id}/diagnosis-result")
async def get_diagnosis_result(device_id: str):
    """获取设备诊断结果（问题列表和故障概率）"""
    global _cached_diagnosis_data
    
    try:
        # 加载诊断数据
        if _cached_diagnosis_data is None:
            if DIAGNOSIS_DATA_FILE.exists():
                with open(DIAGNOSIS_DATA_FILE, "r", encoding="utf-8") as f:
                    _cached_diagnosis_data = json.load(f)
            else:
                logger.warning(f"Diagnosis data file not found: {DIAGNOSIS_DATA_FILE}")
                _cached_diagnosis_data = {}
        
        # 获取设备诊断结果
        diagnosis = _cached_diagnosis_data.get(device_id)
        
        # 如果没有找到诊断结果，生成一个健康的默认诊断结果
        if not diagnosis:
            # 尝试从健康数据获取设备信息
            health_data = _get_health_data()
            device_health = health_data.get(device_id, {})
            device_name = device_health.get("device_name", device_id)
            health_score = device_health.get("current_health_score", 0.9)
            
            # 根据健康评分生成故障概率
            if health_score >= 0.9:
                prob_3d = 0.02
                prob_7d = 0.05
            elif health_score >= 0.8:
                prob_3d = 0.05
                prob_7d = 0.12
            elif health_score >= 0.7:
                prob_3d = 0.12
                prob_7d = 0.25
            else:
                prob_3d = 0.25
                prob_7d = 0.45
            
            # 生成健康的诊断结果
            diagnosis = {
                "device_id": device_id,
                "device_name": device_name,
                "diagnosis_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "issues": [],  # 没有问题
                "failure_probability": {
                    "3_days": prob_3d,
                    "7_days": prob_7d
                },
                "risk_level": "low",
                "overall_assessment": "设备运行状态良好，各项指标正常，未检测到明显故障风险，建议按计划维护即可。"
            }
        
        return {
            "code": 0,
            "data": diagnosis,
            "message": "ok"
        }
    except Exception as e:
        logger.exception(f"Error loading diagnosis data for {device_id}: {e}")
        return {
            "code": 500,
            "data": None,
            "message": f"加载诊断数据失败: {str(e)}"
        }


@router.get("/devices/{device_id}/prediction-feedback")
async def get_prediction_feedback(device_id: str, limit: int = Query(10, description="返回数量")):
    """获取设备的预测反馈历史"""
    global _cached_prediction_feedback
    
    try:
        # 加载预测反馈数据
        if _cached_prediction_feedback is None:
            if PREDICTION_FEEDBACK_FILE.exists():
                with open(PREDICTION_FEEDBACK_FILE, "r", encoding="utf-8") as f:
                    _cached_prediction_feedback = json.load(f)
            else:
                logger.warning(f"Prediction feedback file not found: {PREDICTION_FEEDBACK_FILE}")
                _cached_prediction_feedback = {}
        
        # 获取设备的预测反馈
        feedback_list = _cached_prediction_feedback.get(device_id, [])
        # 按时间倒序排列
        feedback_list.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        return {
            "code": 0,
            "data": feedback_list[:limit],
            "message": "ok"
        }
    except Exception as e:
        logger.exception(f"Error loading prediction feedback for {device_id}: {e}")
        return {
            "code": 500,
            "data": [],
            "message": f"加载预测反馈失败: {str(e)}"
        }


@router.post("/devices/{device_id}/prediction-feedback/{prediction_id}")
async def submit_prediction_feedback(device_id: str, prediction_id: str, feedback: str = Query(..., description="反馈类型: correct 或 incorrect")):
    """提交预测反馈"""
    global _cached_prediction_feedback
    
    try:
        # 加载预测反馈数据
        if _cached_prediction_feedback is None:
            if PREDICTION_FEEDBACK_FILE.exists():
                with open(PREDICTION_FEEDBACK_FILE, "r", encoding="utf-8") as f:
                    _cached_prediction_feedback = json.load(f)
            else:
                _cached_prediction_feedback = {}
        
        # 更新反馈
        device_feedback = _cached_prediction_feedback.get(device_id, [])
        for item in device_feedback:
            if item.get("id") == prediction_id:
                item["feedback"] = feedback
                break
        
        # 保存到文件
        _cached_prediction_feedback[device_id] = device_feedback
        with open(PREDICTION_FEEDBACK_FILE, "w", encoding="utf-8") as f:
            json.dump(_cached_prediction_feedback, f, ensure_ascii=False, indent=2)
        
        return {
            "code": 0,
            "data": {"prediction_id": prediction_id, "feedback": feedback},
            "message": "反馈提交成功"
        }
    except Exception as e:
        logger.exception(f"Error submitting prediction feedback for {device_id}/{prediction_id}: {e}")
        return {
            "code": 500,
            "data": None,
            "message": f"提交反馈失败: {str(e)}"
        }


@router.post("/devices/{device_id}/diagnose")
async def diagnose_fault(device_id: str, req: BaseDiagnoseRequest):
    """触发Multi-Agent协同诊断 - SSE流式输出"""
    
    async def event_stream() -> AsyncGenerator[str, None]:
        # 生成演示振动数据
        vibration_data = _generate_demo_vibration(req.anomaly_type)
        
        # 调用现有的device_pipeline
        result = await device_pipeline.run(
            session_id=f"demo-diag-{device_id}",
            entry_agent="monitor",
            initial_input={
                "device_id": device_id,
                "sensor_data": {"vibration": vibration_data},
                "anomaly_type": req.anomaly_type,
                "context": req.context,
            },
        )
        
        # 发送Agent执行步骤
        for trace in result.get("traces", []):
            yield f"event: agent_step\ndata: {json.dumps(trace, ensure_ascii=False)}\n\n"
        
        # 发送完成事件
        yield f"event: complete\ndata: {json.dumps({'session_id': result['session_id'], 'total_latency_ms': result.get('total_latency_ms', 0), 'results': result.get('results', {})}, ensure_ascii=False, default=str)}\n\n"
    
    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _generate_demo_vibration(anomaly_type: str) -> list[float]:
    """生成演示振动数据"""
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


@router.get("/case-studies")
async def get_case_studies():
    """获取真实案例研究数据"""
    case_studies = _get_case_studies()
    return {"code": 0, "data": case_studies, "message": "ok"}


@router.get("/industry-stats")
async def get_industry_stats():
    """获取行业统计数据"""
    industry_stats = _get_industry_stats()
    return {"code": 0, "data": industry_stats, "message": "ok"}


@router.get("/knowledge-base")
async def get_knowledge_base():
    """获取知识库数据"""
    knowledge_base = _get_knowledge_base()
    return {"code": 0, "data": knowledge_base, "message": "ok"}
