#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="${BRAIN_COMPOSE_FILE:-$SCRIPT_DIR/docker-compose.dev.yml}"
SEED_SQL="$PROJECT_ROOT/data_pipeline/seed_data/petrochemical/init.sql"

echo "=== Industry Brain Database Initialization ==="
echo "    compose : $COMPOSE_FILE"
echo "    seed sql: $SEED_SQL"
echo ""

# ── Step 1: Wait for PostgreSQL ──────────────────────────────────────────────
echo "[1/3] Waiting for PostgreSQL..."
until docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U brain >/dev/null 2>&1; do
  sleep 2
done
echo "  ✓ PostgreSQL is ready"

# ── Step 2: Create tables + seed base data via ORM ──────────────────────────
# MUST run before SQL import — init.sql INSERT depends on tables existing
echo "[2/3] Creating tables and seeding base data (ORM)..."
(cd "$PROJECT_ROOT/backend" && PYTHONPATH="$PROJECT_ROOT" uv run python -m backend.models.init_db)
echo "  ✓ Tables and base data created"

# ── Step 3: Import additional seed data (evolution strategies, etc.) ─────────
echo "[3/3] Importing seed data from SQL..."
if [ -f "$SEED_SQL" ]; then
  docker compose -f "$COMPOSE_FILE" exec -T postgres \
    psql -U brain -d industry_brain < "$SEED_SQL"
  echo "  ✓ Seed data imported"
else
  echo "  ⚠ Seed file not found: $SEED_SQL (skipping)"
fi

echo ""
echo "=== Initialization complete ==="
