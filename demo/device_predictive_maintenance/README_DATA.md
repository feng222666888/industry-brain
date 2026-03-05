# 设备健康数据生成说明

## 数据生成

运行以下命令生成设备健康数据：

```bash
python demo/device_predictive_maintenance/data/generate_health_data.py
```

或者使用批处理文件：

```bash
test_health_data.bat
```

## 生成的数据

脚本会为以下5个设备生成健康数据：

1. **DEV-PUMP-001** (循环水泵-001) - 健康评分: 72%
2. **DEV-PUMP-002** (进料泵-002) - 健康评分: 88%
3. **DEV-COMP-001** (富气压缩机-001) - 健康评分: 91%
4. **DEV-HX-001** (原料预热器-001) - 健康评分: 95%
5. **DEV-PUMP-003** (常压塔底泵-003) - 健康评分: 85%

## 数据格式

每个设备包含：

- `device_id`: 设备ID
- `device_name`: 设备名称
- `device_type`: 设备类型
- `current_health_score`: 当前健康评分 (0.0-1.0)
- `health_trend`: 健康趋势数据（过去10天，每天一个点）
  - `timestamp`: 时间戳
  - `score`: 健康评分
- `active_alerts`: 活跃告警列表
  - `type`: 告警类型
  - `message`: 告警消息
  - `since`: 告警时间

## 数据文件位置

生成的数据保存在：
```
demo/device_predictive_maintenance/data/device_health_data.json
```

## API使用

Demo API会自动从该文件读取数据：

```
GET /api/device-demo/devices/{device_id}/health
```

如果文件不存在或设备不在文件中，API会fallback到从传感器数据计算。
