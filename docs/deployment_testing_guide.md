# 部署与测试指南 (Deployment & Testing Guide)

为保证用户（客户或内部验收人员）能够方便地进行人工检查和全链路体验，请按照以下步骤部署和测试石化行业大脑。

## 1. 环境准备

确保您的本地机器安装了以下环境：
- Docker & Docker Compose (版本 >= 24)
- Python 3.11+ (如需本地开发运行，测试环境可以使用 3.9+)
- Node.js 20+

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
uv sync  # 或 pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
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
# 运行单元和集成测试
python -m pytest tests/unit tests/integration -v

# 运行核心端到端测试 (Agent 链路与进化引擎)
python tests/e2e/test_scenario3_device.py
python tests/e2e/test_scenario1_optimize.py
```
