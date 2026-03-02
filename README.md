# Industry Brain / 行业大脑

> 基于"核心运行 + 底座支撑 + 自我进化引擎"三层架构，构建行业大脑产品。当前聚焦石化行业，支撑钢铁、新能源汽车等多行业扩展。

## 核心差异化

**自我进化引擎**：在线演进 + 离线进化双轮驱动，使行业大脑具备持续自主优化能力。

## 石化首批三场景

| 场景 | 架构能力切片 | 状态 |
|------|-----------|------|
| 设备预测性维护 | Multi-Agent协同 | 🔨 开发中 |
| 工艺参数在线寻优 | 自我进化引擎 | ⏳ 待开发 |
| 催化剂电镜图像识别 | 多模态+知识中心 | ⏳ 待开发 |

## 技术栈

- **前端**: Next.js + React + ECharts + ReactFlow + Tailwind CSS
- **后端**: Python/FastAPI + LangGraph + LiteLLM
- **存储**: PostgreSQL(pgvector) + Neo4j + Redis + TimescaleDB
- **部署**: Docker Compose (POC) / K8s Helm (生产)

## 快速开始

```bash
# 1. 启动基础设施
cd deploy && docker compose -f docker-compose.dev.yml up -d

# 2. 后端
cd backend && uv sync && uv run uvicorn backend.main:app --reload --port 8000

# 3. 前端
cd frontend && pnpm install && pnpm dev

# 4. 访问
# API: http://localhost:8000/docs
# Web: http://localhost:3000
```

## 项目结构

```
industry-brain/
├── frontend/          # 视图层 (Next.js)
├── backend/
│   ├── api/           # 业务API层
│   ├── engine/        # 自我进化引擎
│   ├── core/          # 核心运行系统 (行业无关)
│   ├── foundation/    # 底座支撑系统
│   └── industries/    # 行业场景包 (可扩展)
├── data_pipeline/     # 数据抓取与治理
├── deploy/            # 部署配置
├── tests/             # 测试
└── docs/              # 文档
```

详见 [架构说明](docs/architecture.md) | [API规范](docs/api_spec.md) | [扩展指南](docs/extension_guide.md) | [贡献指南](CONTRIBUTING.md)
