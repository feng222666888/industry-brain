# 行业大脑系统架构说明书

## 1. 三层架构概述

系统采用 **「核心运行 + 底座支撑 + 自我进化引擎」** 三层架构（参见 slides 第 6 页示意图）：

| 层级 | 职责 |
|------|------|
| **核心运行层** | 多 Agent 协同、场景编排、实时推理、前端交互 |
| **底座支撑层** | 知识中心（PostgreSQL + Neo4j）、数据治理、统一工具、LiteLLM 接入 |
| **自我进化引擎** | 离线进化（数据回放→仿真→优化）与在线进化（安全门控、反馈闭环） |

---

## 2. 技术栈

| 组件 | 技术 |
|------|------|
| 前端 | Next.js |
| 后端 | FastAPI |
| 编排 | LangGraph |
| 模型接入 | LiteLLM |
| 关系 + 向量 | PostgreSQL (pgvector) |
| 知识图谱 | Neo4j |
| 缓存 | Redis |
| 本地推理 | Ollama |

---

## 3. 代码结构映射

`industry-brain/` 为 monorepo：

```
industry-brain/
├── backend/              # FastAPI 后端
│   ├── api/              # REST 路由
│   ├── core/             # Agent 工厂、记忆、可观测
│   ├── engine/           # 进化服务、场景配置、资产库
│   ├── foundation/       # 知识、工具、检索
│   └── industries/       # 行业包（petrochemical 等）
├── frontend/             # Next.js 前端
├── data_pipeline/        # 数据治理、数据集、种子数据
└── deploy/               # Docker Compose、Helm
```

---

## 4. 扩展机制

### 新场景扩展

1. 在 `backend/engine/scenario_config/{industry}/` 新增场景配置
2. 在 `backend/industries/{industry}/agents/` 下新增 Agent 实现
3. 在 `backend/industries/{industry}/__init__.py` 中注册场景
4. 在 `backend/core/agent_factory/registry.py` 中注册 Agent
5. 在 `frontend/app/` 中新增对应页面与 API 调用

### 跨行业扩展

- **industry_id 隔离**：每个行业独立 `industry_id`，配置、图谱、Agent 隔离
- **行业包**：在 `backend/industries/` 下新建 `{industry}/` 目录，参照 `petrochemical` 实现

---

## 5. 部署架构

| 阶段 | 方式 |
|------|------|
| POC / 开发 | Docker Compose（`deploy/docker-compose.yml`） |
| 生产 | Kubernetes + Helm（`deploy/helm/`） |

---

## 6. 数据流

```
爬虫 / 数据接入 → 数据治理 → 知识中心（PostgreSQL + Neo4j）
                                    ↓
                          Agent 检索 + 推理
                                    ↓
                              前端展示
```

完整链路：

1. **爬虫 / 数据接入**：外部数据经 `data_pipeline/` 接入
2. **治理**：质量、合规、语义治理（`data_pipeline/governance/`）
3. **知识中心**：向量入库 PostgreSQL，图谱入 Neo4j
4. **Agent**：检索 + 工具调用 + LiteLLM 推理
5. **前端**：Next.js 调用 API，展示图表与对话
