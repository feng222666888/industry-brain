# Contributing Guide

## 分支策略

```
main (保护) ← dev (集成) ← feature/{module} | fix/{issue}
```

- `main`: 生产就绪，仅通过PR合入
- `dev`: 集成分支，日常开发合入此处
- `feature/xxx`: 功能分支，从dev拉取
- `fix/xxx`: 修复分支

## 提交规范 (Conventional Commits)

```
feat(agent): add monitor agent anomaly detection
fix(engine): fix safety gate evaluation logic
docs: update API spec for device endpoint
refactor(core): simplify memory session management
test: add unit tests for knowledge graph
chore: update dependencies
```

## PR流程

1. 从 `dev` 创建 `feature/xxx` 分支
2. 完成开发 + 本地测试通过
3. 提交PR到 `dev`，填写PR模板（数据治理影响声明 + 变更->测试映射为必填）
4. 至少1人Code Review通过
5. CI（lint + test + build）全部通过
6. Squash Merge合入 `dev`

### 变更门禁（强制）

- 若变更涉及 `data_pipeline/`、`backend/engine/`、`backend/industries/`，必须同步更新 `tests/`。
- CI 会执行 `scripts/check_test_mapping.py`，关键代码变更但未修改测试将直接失败。
- 本地建议统一执行：

```bash
PYTHONPATH=. pytest tests/unit tests/integration tests/e2e -v
```

## 代码规范

- **后端**: `ruff check` + `ruff format`（pre-commit自动执行）
- **前端**: `eslint` + `prettier`
- 所有Prompt变更需经石化领域顾问审核

## 本地开发环境

```bash
# 启动基础设施
cd deploy && docker compose -f docker-compose.dev.yml up -d

# 后端
cd backend && uv sync && uv run uvicorn backend.main:app --reload

# 前端
cd frontend && pnpm install && pnpm dev
```
