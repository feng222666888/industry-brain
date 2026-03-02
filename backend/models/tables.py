"""Core database tables — aligned with plan section 12.5."""

from datetime import datetime

from sqlalchemy import Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import Base, IndustryMixin, TimestampMixin, generate_id


class Enterprise(Base, TimestampMixin):
    __tablename__ = "enterprises"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_id)
    industry_id: Mapped[str] = mapped_column(String(50), default="petrochemical", index=True)
    name: Mapped[str] = mapped_column(String(200))
    short_name: Mapped[str | None] = mapped_column(String(50))
    address: Mapped[str | None] = mapped_column(String(500))
    contact: Mapped[str | None] = mapped_column(String(200))

    devices: Mapped[list["Device"]] = relationship(back_populates="enterprise")


class Device(Base, IndustryMixin, TimestampMixin):
    """Device registry with tree hierarchy (parent_id)."""

    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_id)
    enterprise_id: Mapped[str] = mapped_column(ForeignKey("enterprises.id"), index=True)
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("devices.id"))
    device_code: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    device_type: Mapped[str] = mapped_column(String(50))
    manufacturer: Mapped[str | None] = mapped_column(String(200))
    model: Mapped[str | None] = mapped_column(String(100))
    install_date: Mapped[datetime | None] = mapped_column()
    status: Mapped[str] = mapped_column(String(20), default="running")
    specs: Mapped[dict | None] = mapped_column(JSONB)

    enterprise: Mapped["Enterprise"] = relationship(back_populates="devices")
    children: Mapped[list["Device"]] = relationship(back_populates="parent")
    parent: Mapped["Device | None"] = relationship(back_populates="children", remote_side="Device.id")


class SensorReading(Base):
    """High-frequency time-series data — TimescaleDB hypertable."""

    __tablename__ = "sensor_readings"

    time: Mapped[datetime] = mapped_column(primary_key=True)
    device_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    metric_name: Mapped[str] = mapped_column(String(50), primary_key=True)
    value: Mapped[float] = mapped_column(Float)
    unit: Mapped[str | None] = mapped_column(String(20))


class AgentSession(Base, IndustryMixin, TimestampMixin):
    __tablename__ = "agent_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_id)
    scenario_id: Mapped[str] = mapped_column(String(50), index=True)
    enterprise_id: Mapped[str | None] = mapped_column(ForeignKey("enterprises.id"))
    user_message: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="active")
    context: Mapped[dict | None] = mapped_column(JSONB)

    traces: Mapped[list["AgentTrace"]] = relationship(back_populates="session", order_by="AgentTrace.created_at")


class AgentTrace(Base, TimestampMixin):
    """Agent call chain tracing — one row per agent step."""

    __tablename__ = "agent_traces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_id)
    session_id: Mapped[str] = mapped_column(ForeignKey("agent_sessions.id"), index=True)
    agent_name: Mapped[str] = mapped_column(String(100))
    action: Mapped[str] = mapped_column(String(100))
    input_data: Mapped[dict | None] = mapped_column(JSONB)
    output_data: Mapped[dict | None] = mapped_column(JSONB)
    tools_called: Mapped[list | None] = mapped_column(JSONB)
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    error: Mapped[str | None] = mapped_column(Text)

    session: Mapped["AgentSession"] = relationship(back_populates="traces")


class EvolutionStrategy(Base, IndustryMixin, TimestampMixin):
    """Evolution strategy asset — indexed by industry + scenario + generation."""

    __tablename__ = "evolution_strategies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_id)
    scenario_id: Mapped[str] = mapped_column(String(50))
    generation: Mapped[int] = mapped_column(Integer, default=0)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    params: Mapped[dict] = mapped_column(JSONB, default=dict)
    source: Mapped[str] = mapped_column(String(20), default="offline")
    is_active: Mapped[bool] = mapped_column(default=False)

    __table_args__ = (
        Index("ix_evolution_industry_scenario", "industry_id", "scenario_id"),
        Index("ix_evolution_generation", "industry_id", "scenario_id", "generation"),
    )


class EvolutionRun(Base, IndustryMixin, TimestampMixin):
    """Evolution execution record — online or offline."""

    __tablename__ = "evolution_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_id)
    scenario_id: Mapped[str] = mapped_column(String(50))
    run_type: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="running")
    input_config: Mapped[dict | None] = mapped_column(JSONB)
    result_summary: Mapped[dict | None] = mapped_column(JSONB)
    strategy_id: Mapped[str | None] = mapped_column(ForeignKey("evolution_strategies.id"))
    duration_ms: Mapped[int | None] = mapped_column(Integer)
