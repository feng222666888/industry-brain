.PHONY: setup test test-unit test-integration test-e2e test-cov lint hooks check

# ── 环境初始化 ────────────────────────────────────────────
setup:
	@echo ">>> Installing dev dependencies..."
	cd backend && pip install -r requirements.txt pytest pytest-asyncio pytest-cov
	@echo ">>> Installing pre-commit hooks..."
	pip install pre-commit
	pre-commit install
	@echo ">>> Done. Git hooks activated."

hooks:
	pip install pre-commit
	pre-commit install

# ── 测试命令 ──────────────────────────────────────────────
test:
	PYTHONPATH=. pytest tests/ -v --tb=short

test-unit:
	PYTHONPATH=. pytest tests/unit/ -v --tb=short

test-integration:
	PYTHONPATH=. pytest tests/integration/ -v --tb=short

test-e2e:
	PYTHONPATH=. pytest tests/e2e/ -v --tb=short

test-cov:
	PYTHONPATH=. pytest tests/ --cov=backend --cov-report=term-missing --cov-fail-under=60

# ── 代码检查 ──────────────────────────────────────────────
lint:
	ruff check backend/ --fix
	ruff format backend/

# ── CI 门控（本地预检）──────────────────────────────────────
check: lint
	python scripts/check_test_mapping.py
	PYTHONPATH=. pytest tests/ -v --tb=short
	@echo ">>> All checks passed ✅"
