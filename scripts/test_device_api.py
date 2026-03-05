"""测试设备API并查看日志"""

import asyncio
import json
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.api.device.router import get_device_health, diagnose_fault
from backend.models.schemas import DiagnoseRequest


async def test_health_api():
    """测试健康API"""
    print("=" * 60)
    print("测试健康API")
    print("=" * 60)
    
    device_id = "DEV-PUMP-002"
    print(f"\n请求设备: {device_id}")
    
    try:
        result = await get_device_health(device_id)
        print(f"响应代码: {result.code}")
        
        if result.code == 0 and result.data:
            data = result.data
            print(f"设备ID: {data.get('device_id')}")
            print(f"设备名称: {data.get('device_name')}")
            print(f"健康评分: {data.get('current_health_score')}")
            
            trend = data.get('health_trend', [])
            print(f"趋势数据数量: {len(trend)}")
            if trend:
                print(f"趋势数据前5个: {[t.get('score') if isinstance(t, dict) else t for t in trend[:5]]}")
            
            alerts = data.get('active_alerts', [])
            print(f"告警数量: {len(alerts)}")
            if alerts:
                print(f"告警信息: {[a.get('message', '')[:50] for a in alerts[:3]]}")
        else:
            print(f"错误: {result.message}")
    except Exception as e:
        print(f"异常: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()


async def test_diagnose_api():
    """测试诊断API"""
    print("\n" + "=" * 60)
    print("测试诊断API")
    print("=" * 60)
    
    device_id = "DEV-PUMP-002"
    print(f"\n请求设备: {device_id}")
    
    req = DiagnoseRequest(
        anomaly_type="vibration_bearing",
        context="routine_check"
    )
    
    print(f"请求参数: {req.model_dump()}")
    
    try:
        # 注意：diagnose_fault返回StreamingResponse，需要特殊处理
        print("\n注意: 诊断API返回SSE流，需要HTTP客户端测试")
        print("请查看后端日志文件: logs/device_api_*.log")
    except Exception as e:
        print(f"异常: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()


def check_logs():
    """检查日志文件"""
    print("\n" + "=" * 60)
    print("检查日志文件")
    print("=" * 60)
    
    log_dir = project_root / "logs"
    if not log_dir.exists():
        print(f"日志目录不存在: {log_dir}")
        return
    
    log_files = list(log_dir.glob("device_api_*.log"))
    if not log_files:
        print("没有找到日志文件")
        return
    
    # 读取最新的日志文件
    latest_log = max(log_files, key=lambda p: p.stat().st_mtime)
    print(f"\n最新日志文件: {latest_log}")
    print(f"文件大小: {latest_log.stat().st_size} bytes")
    
    # 读取最后50行
    with open(latest_log, encoding="utf-8") as f:
        lines = f.readlines()
        print(f"\n总行数: {len(lines)}")
        print("\n最后20行:")
        print("-" * 60)
        for line in lines[-20:]:
            print(line.rstrip())


async def main():
    """主函数"""
    await test_health_api()
    await test_diagnose_api()
    check_logs()


if __name__ == "__main__":
    asyncio.run(main())
