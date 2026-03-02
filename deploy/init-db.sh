#!/bin/bash
set -e

echo "=== Industry Brain Database Initialization ==="

echo "[1/3] Waiting for PostgreSQL..."
until pg_isready -h postgres -U brain 2>/dev/null; do sleep 2; done

echo "[2/3] Importing seed data..."
psql -h postgres -U brain -d industry_brain -f /seed_data/petrochemical/init.sql 2>/dev/null || true

echo "[3/3] Running application init..."
python -m backend.models.init_db 2>/dev/null || true

echo "=== Initialization complete ==="
