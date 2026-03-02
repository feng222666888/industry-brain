# 部署与测试指南 (Deployment & Testing Guide)

为保证用户（客户或内部验收人员）能够方便地进行人工检查和全链路体验，请按照以下步骤部署和测试石化行业大脑。

## 1. 环境准备

确保您的本地机器安装了以下环境：
- Docker & Docker Compose (版本 >= 24)
- [uv](https://docs.astral.sh/uv/) (Python 包管理器，安装后会自动管理 Python 3.11+ 运行时)
- Node.js 20+ 及 [pnpm](https://pnpm.io/)（`npm install -g pnpm`）

## 2. 一键部署 (POC 模式)

我们提供了基于 Docker Compose 的开箱即用部署方案。它会自动启动 PostgreSQL (包含 pgvector 扩展)、Neo4j、Redis 和 Ollama，并初始化种子数据。

```bash
cd deploy
docker compose -f docker-compose.dev.yml up -d
```

### 初始化数据
第一次启动后，需执行初始化脚本将默认的设备、策略等数据注入数据库：
```bash
./deploy/init-db.sh
```

## 3. 启动应用服务

您可以选择在容器外启动后端和前端，以便于查看日志和调试：

### 启动后端
```bash
cd backend
uv sync
PYTHONPATH=.. uv run uvicorn main:app --reload --port 8000
```
> **注意**：`PYTHONPATH=..` 是必须的，因为代码中所有导入均使用绝对路径 `from backend.xxx`，需要将项目根目录加入 Python 搜索路径。

- 后端 API 文档：[http://localhost:8000/docs](http://localhost:8000/docs)

### 启动前端
```bash
cd frontend
pnpm install
pnpm dev
```
- 前端工作台：[http://localhost:3000](http://localhost:3000)

## 4. 人工检查与演示路径

用户可以通过前端工作台执行以下检查路径：

1. **企业总驾驶舱 (`/cockpit`)**
   - 检查数字孪生看板，观察 4 个核心指标是否正常加载。
   - 检查 Agent 活动流是否实时滚动。

2. **设备健康驾驶舱 (`/device`)**
   - 在左侧设备树选择 `DEV-PUMP-001` (状态为 degrading)。
   - 点击 **一键诊断**，观察 3 步 Agent 协同（监测 -> 诊断 -> 维修）。
   - 检查生成的 SOP 是否合理。

3. **工艺寻优驾驶舱 (`/optimize`)**
   - 调整反应温度、压力等参数。
   - 点击 **开始寻优**，检查是否能在 2-3 秒内返回推荐的最优参数，以及预测的收率/能耗变化。

4. **进化引擎追踪 (`/evolution`)**
   - 检查 15 代进化历史图表。
   - 检查安全门控日志，验证不合规参数是否被拦截。

## 5. 自动化测试

项目包含了完整的自动化测试套件，可供验收检查：

```bash
# 在 backend/ 目录下执行（含三大场景）
cd backend
PYTHONPATH=.. uv run pytest tests/unit tests/integration tests/e2e -v
```

说明：
- `tests/unit/`：底层逻辑（安全门、数据治理、Agent 输出结构）
- `tests/integration/`：FastAPI 接口契约（device / optimize / catalyst / evolution）
- `tests/e2e/`：场景链路（工艺寻优、催化剂研发、设备预测性维护）

## 6. 人工验收最小清单（推荐）

在自动化通过后，建议按以下最小清单进行人工验收：

1. **场景1 工艺寻优**
   - 页面可加载推荐参数
   - 推荐后收率提升、能耗下降数值有变化
2. **场景2 催化剂研发**
   - 图像分析接口返回特征、文献、知识图谱匹配
   - 知识图谱节点/边可视化正常
3. **场景3 设备维护**
   - 一键诊断可展示 monitor -> diagnosis -> repair 三阶段
   - 高风险工况触发维修建议与 SOP
4. **进化引擎**
   - 时间线可查看多代策略演化
   - 安全门可拦截越界参数并记录日志

## 7. 变更后的自检与回归策略

每次新增/变更都执行以下步骤：

1. 建立“变更 -> 测试”映射（本次改了什么，对应补了哪些单测/集成/E2E）
2. 在 `backend/` 下运行 `PYTHONPATH=.. uv run pytest tests/unit tests/integration tests/e2e -v`
3. 若涉及前端交互，按第 4 节与第 6 节做人工冒烟
4. 记录未覆盖风险点与后续补测计划（避免“测试假完备”）
5. 若涉及依赖变更，需同步更新 `backend/pyproject.toml` 与 `backend/requirements.txt`（前者用于本地 `uv sync`，后者用于 `Dockerfile.backend` 构建）

## 8. 数据抓取管道（P5）验证

为验证“白名单调度 + 去重 + 增量状态”执行流，可运行：

```bash
# 在 backend/ 目录下执行
cd backend
uv sync --group pipeline   # 首次需安装 scrapy / playwright 等管道依赖

# 周期任务 dry-run（不落状态）
PYTHONPATH=.. uv run python -m data_pipeline.scrapers.run_pipeline --trigger periodic --dry-run

# 事件触发任务（落状态）
PYTHONPATH=.. uv run python -m data_pipeline.scrapers.run_pipeline --trigger event
```

预期检查点：
- 能输出 selected sources 数量；
- 能输出 `new / updated / unchanged` 统计；
- 非 dry-run 时写入 `data_pipeline/seed_data/petrochemical/source_state.json`。
