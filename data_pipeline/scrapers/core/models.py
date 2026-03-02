"""Canonical data models shared by scraper pipeline stages."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class DatasetMeta:
    source_id: str
    source_url: str
    industry_id: str
    scenario_id: str
    acquired_at: datetime
    content_hash: str
    language: str = "zh-CN"
    tags: list[str] = field(default_factory=list)


@dataclass
class RawRecord:
    record_id: str
    title: str
    content: str
    meta: DatasetMeta
    extras: dict[str, Any] = field(default_factory=dict)


@dataclass
class CuratedRecord:
    record_id: str
    normalized_title: str
    normalized_content: str
    meta: DatasetMeta
    quality_score: float = 0.0
    compliance_flags: dict[str, Any] = field(default_factory=dict)

