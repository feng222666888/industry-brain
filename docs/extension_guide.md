# Scenario / Industry Extension Guide

Step-by-step guides for extending the Industry Brain platform with new scenarios, industries, agents, and data sources.

---

## 1. Adding a New Petrochemical Scenario (e.g. Supply Chain Optimization)

| Step | Action | Path |
|------|--------|------|
| 1 | Create scenario config | `backend/engine/scenario_config/petrochemical/supply_chain.py` |
| 2 | Register scenario in industry config | `backend/industries/petrochemical/__init__.py` → add to `scenarios` list |
| 3 | Implement agent(s) | `backend/industries/petrochemical/agents/supply_chain/` |
| 4 | Register agent in registry | `backend/core/agent_factory/registry.py` (or via decorator) |
| 5 | Add API router + frontend page | `backend/api/supply_chain/router.py`, `frontend/app/supply-chain/page.tsx` |

---

## 2. Adding a New Industry (e.g. Steel)

| Step | Action | Path |
|------|--------|------|
| 1 | Create industry directory | `backend/industries/steel/` |
| 2 | Add `__init__.py` with `INDUSTRY_CONFIG` | `backend/industries/steel/__init__.py` |
| 3 | Create scenario configs | `backend/engine/scenario_config/steel/` |
| 4 | Create agents | `backend/industries/steel/agents/` |
| 5 | Add industry router / API branching | `backend/api/` (use `industry_id` routing) |
| 6 | Add industry seed data | `data_pipeline/seed_data/steel/` |

---

## 3. Creating a New Agent

Template:

```python
# backend/industries/{industry}/agents/{scenario}/{agent_name}.py

async def run(input_data: dict, memory: Any, tracer: Any) -> AgentResult:
    """Agent entrypoint. Must return AgentResult."""
    # 1. System prompt: define role and constraints
    system_prompt = "You are a {role}. {constraints}."

    # 2. Tool descriptions: define available tools
    tools = ["search", "simulate", "graph_query"]

    # 3. Output format: structured JSON for downstream
    # e.g. {"recommendation": str, "confidence": float}

    return AgentResult(status="COMPLETE", data={...})
```

---

## 4. Adding a New Data Source (Scraper)

Scraper template location: `data_pipeline/scrapers/`

```python
# data_pipeline/scrapers/petrochemical_supply_scraper.py

"""Scraper for petrochemical supply chain data."""

import asyncio
from typing import Any

async def fetch(source_url: str, config: dict[str, Any]) -> list[dict]:
    """Fetch raw data from source. Return list of records."""
    # Implement HTTP/DB/API fetch logic
    records = []
    # ...
    return records

async def run():
    """Entrypoint for scheduled or manual runs."""
    config = {...}
    data = await fetch("https://...", config)
    # Persist to data_pipeline output or governance sink
```

Register in a scheduler or `data_pipeline/` orchestration script.
