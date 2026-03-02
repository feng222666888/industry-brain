"""Evolution service — facade for online/offline pipelines + mock data generation.

Provides a unified interface for the evolution API and generates demo data
for the evolution timeline visualization.
"""

from __future__ import annotations

import random
from typing import Any

from backend.engine.offline.pipeline import OfflineEvolutionPipeline
from backend.engine.online.pipeline import OnlineEvolutionPipeline, Strategy


class EvolutionService:
    """Unified service for both online and offline evolution."""

    def __init__(self, scenario_id: str, industry_id: str = "petrochemical"):
        self.scenario_id = scenario_id
        self.industry_id = industry_id
        self.online = OnlineEvolutionPipeline(scenario_id, industry_id)
        self.offline = OfflineEvolutionPipeline(scenario_id, industry_id, population_size=10, top_k=3)
        self._mock_generated = False

    async def ensure_mock_data(self) -> None:
        """Generate 15 generations of evolution history for demo visualization."""
        if self._mock_generated:
            return

        random.seed(42)
        parents = None
        for _ in range(15):
            result = await self.offline.run_generation(parent_strategies=parents)
            top = result["top_strategies"]
            parents = [
                Strategy(s["strategy_id"], self.scenario_id, self.industry_id, params=s["params"], score=s["score"])
                for s in top
            ]

        best_strategy = parents[0] if parents else None
        if best_strategy:
            self.online.register_strategy(best_strategy)

        self._mock_generated = True

    def get_timeline(self) -> list[dict[str, Any]]:
        return self.offline.get_evolution_timeline()

    def get_strategies(self, min_score: float = 0.0) -> list[dict[str, Any]]:
        all_strategies = []
        for gen_strategies in self.offline.generations:
            for s in gen_strategies:
                if s.score >= min_score:
                    all_strategies.append({
                        "strategy_id": s.strategy_id,
                        "industry_id": s.industry_id,
                        "scenario_id": s.scenario_id,
                        "generation": s.generation,
                        "score": round(s.score, 4),
                        "params": s.params,
                        "source": s.source,
                    })
        return sorted(all_strategies, key=lambda x: x["score"], reverse=True)


_services: dict[str, EvolutionService] = {}


def get_evolution_service(scenario_id: str, industry_id: str = "petrochemical") -> EvolutionService:
    key = f"{industry_id}:{scenario_id}"
    if key not in _services:
        _services[key] = EvolutionService(scenario_id, industry_id)
    return _services[key]
