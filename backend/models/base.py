"""SQLAlchemy base and common mixins."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class IndustryMixin:
    """All business tables include industry_id for cross-industry isolation."""

    industry_id: Mapped[str] = mapped_column(String(50), default="petrochemical", index=True)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


def generate_id() -> str:
    return str(uuid.uuid4())
