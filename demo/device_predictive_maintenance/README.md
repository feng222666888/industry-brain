# 设备预测性维护演示系统

这是一个独立的演示系统，展示石化行业关键设备预测性维护场景的完整能力。

## 目录结构

```
demo/device_predictive_maintenance/
├── README.md                    # 本文件
├── data/                        # 演示数据
│   ├── devices.json             # 设备元数据
│   ├── sensor_timeseries.jsonl  # 传感器时序数据
│   ├── fault_history.json       # 故障历史
│   ├── maintenance_logs.json   # 维修记录
│   ├── knowledge_base.json     # 知识库
│   ├── real_cases/             # 真实案例数据
│   └── generator.py            # 数据生成脚本
├── backend/                     # 后端API
│   └── api/
│       ├── router.py           # API路由
│       └── schemas.py          # 数据模型
├── frontend/                    # 前端界面
│   ├── app/
│   │   └── device-demo/        # 演示页面
│   └── components/
│       └── device-demo/        # UI组件
└── docs/                        # 文档
    ├── background_analysis.md   # 场景背景分析
    ├── solution_design.md      # 落地方案设计
    └── references.md           # 参考资料
```

## 快速开始

详细启动指南请查看：[START.md](START.md)

### 一键启动（Windows）

```cmd
start-demo.bat
```

### 手动启动

1. **生成数据**：`python demo/device_predictive_maintenance/data/generate_health_data.py`
2. **启动后端**：在项目根目录运行 `python -m uvicorn backend.main:app --reload --port 8000`
3. **启动前端**：`cd frontend && pnpm dev`
4. **访问**：http://localhost:3000/device

## 文档

- [START.md](START.md) - 快速启动指南
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 故障排查指南
- [README_DATA.md](README_DATA.md) - 数据生成说明
- [docs/](docs/) - 设计文档（背景分析、方案设计等）

## API端点

所有API端点前缀：`/api/device-demo`

- `GET /devices` - 获取设备列表
- `GET /devices/{device_id}` - 获取设备详情
- `GET /devices/{device_id}/health` - 获取设备健康状态
- `GET /devices/{device_id}/sensor-data` - 获取传感器数据
- `GET /devices/{device_id}/fault-history` - 获取故障历史
- `GET /devices/{device_id}/maintenance-logs` - 获取维修记录
- `POST /devices/{device_id}/diagnose` - 触发诊断（SSE流式）
- `GET /case-studies` - 获取真实案例研究
- `GET /industry-stats` - 获取行业统计
- `GET /knowledge-base` - 获取知识库

## 数据说明

- **设备数据**：10个不同类型的设备（泵、压缩机、换热器、反应器）
- **传感器数据**：30天的时序数据，包含正常和故障状态
- **故障历史**：20条历史故障记录
- **维修记录**：30条维修记录
- **真实案例**：5个来自互联网的真实案例研究

## 注意事项

- 所有文件都在独立目录下，删除整个演示系统只需删除 `demo/device_predictive_maintenance/` 目录
- 数据文件使用相对路径，确保运行脚本时在正确的目录下
- API路由需要手动集成到主应用中
