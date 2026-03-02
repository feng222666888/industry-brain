"""Database initialization — create tables, hypertables, and Neo4j constraints."""

import asyncio
import logging

from neo4j import AsyncGraphDatabase
from sqlalchemy import text

from backend.config.settings import settings
from backend.models.base import Base
from backend.models.database import engine
from backend.models.tables import *  # noqa: F401,F403 — register all models

logger = logging.getLogger(__name__)


async def init_postgres():
    """Create all PostgreSQL tables and extensions."""
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        await conn.run_sync(Base.metadata.create_all)
    logger.info("PostgreSQL pgvector extension and tables created")

    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"))
            result = await conn.execute(
                text("""
                    SELECT EXISTS (
                        SELECT 1 FROM timescaledb_information.hypertables
                        WHERE hypertable_name = 'sensor_readings'
                    );
                """)
            )
            if not result.scalar():
                await conn.execute(
                    text("SELECT create_hypertable('sensor_readings', 'time', if_not_exists => TRUE);")
                )
                logger.info("Created TimescaleDB hypertable: sensor_readings")
    except Exception as e:
        logger.warning(f"TimescaleDB setup skipped (extension not available): {e}")

    logger.info("PostgreSQL initialization complete")


async def init_neo4j():
    """Create Neo4j constraints and indexes for petrochemical knowledge graph."""
    driver = AsyncGraphDatabase.driver(settings.neo4j_url, auth=(settings.neo4j_user, settings.neo4j_password))

    constraints = [
        "CREATE CONSTRAINT IF NOT EXISTS FOR (e:Equipment) REQUIRE e.id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (c:Component) REQUIRE c.id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (f:Fault) REQUIRE f.id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (r:RootCause) REQUIRE r.id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (cat:Catalyst) REQUIRE cat.id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (m:Method) REQUIRE m.id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (p:ProcessParam) REQUIRE p.id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (y:Yield) REQUIRE y.id IS UNIQUE",
        "CREATE INDEX IF NOT EXISTS FOR (e:Equipment) ON (e.industry_id)",
    ]

    async with driver.session() as session:
        for stmt in constraints:
            await session.run(stmt)
        logger.info("Neo4j constraints and indexes created")

    await driver.close()


async def seed_demo_devices():
    """Insert demo device hierarchy for POC demonstration."""
    from backend.models.database import async_session

    demo_devices = [
        {
            "id": "ENT-001",
            "name": "京博石化演示工厂",
            "industry_id": "petrochemical",
        }
    ]

    device_tree = [
        ("DEV-FCC-001", None, "FCC-催化裂化装置", "reactor", "ENT-001"),
        ("DEV-PUMP-001", "DEV-FCC-001", "循环水泵-001", "centrifugal_pump", "ENT-001"),
        ("DEV-PUMP-002", "DEV-FCC-001", "进料泵-002", "centrifugal_pump", "ENT-001"),
        ("DEV-COMP-001", "DEV-FCC-001", "富气压缩机-001", "compressor", "ENT-001"),
        ("DEV-HX-001", "DEV-FCC-001", "原料预热器-001", "heat_exchanger", "ENT-001"),
        ("DEV-CDU-001", None, "常减压蒸馏装置", "distillation_column", "ENT-001"),
        ("DEV-PUMP-003", "DEV-CDU-001", "常压塔底泵-003", "centrifugal_pump", "ENT-001"),
    ]

    async with async_session() as session:
        from backend.models.tables import Device, Enterprise

        existing = await session.get(Enterprise, "ENT-001")
        if existing:
            logger.info("Demo data already exists, skipping seed")
            return

        for ent in demo_devices:
            session.add(Enterprise(**ent))

        for dev_id, parent_id, name, dev_type, ent_id in device_tree:
            session.add(
                Device(
                    id=dev_id,
                    enterprise_id=ent_id,
                    parent_id=parent_id,
                    device_code=dev_id,
                    name=name,
                    device_type=dev_type,
                )
            )

        await session.commit()
        logger.info(f"Seeded {len(device_tree)} demo devices")


async def init_all():
    await init_postgres()
    try:
        await init_neo4j()
    except Exception as e:
        logger.warning(f"Neo4j init skipped (not available): {e}")
    await seed_demo_devices()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(init_all())
