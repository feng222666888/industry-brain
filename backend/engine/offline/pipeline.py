"""Offline evolution pipeline: data replay → strategy mutation → sandbox simulation → scoring → repository.

Implements batch optimization using genetic/evolutionary algorithms.
Strategies evolve over generations, tested in sandbox before promotion.
"""

from __future__ import annotations

import logging
import random
import time
from dataclasses import dataclass, field
from typing import Any

from backend.engine.data_quality.policy import decide_quality_action
from backend.engine.online.pipeline import Strategy

logger = logging.getLogger(__name__)


@dataclass
class SimulationResult:
    score: float
    metrics: dict[str, float] = field(default_factory=dict)
    passed: bool = False


class OfflineEvolutionPipeline:
    """Batch evolution: replay → mutate → simulate → score → persist.

    Uses a simplified genetic algorithm:
    1. Population of strategies from previous generation
    2. Select top performers
    3. Mutate/crossover to produce offspring
    4. Evaluate in sandbox simulation
    5. Persist top strategies as new generation
    """

    def __init__(
        self,
        scenario_id: str,
        industry_id: str = "petrochemical",
        population_size: int = 10,
        mutation_rate: float = 0.2,
        top_k: int = 3,
    ):
        self.scenario_id = scenario_id
        self.industry_id = industry_id
        self.population_size = population_size
        self.mutation_rate = mutation_rate
        self.top_k = top_k
        self.generations: list[list[Strategy]] = []

    async def run_generation(
        self,
        parent_strategies: list[Strategy] | None = None,
        param_ranges: dict[str, tuple[float, float]] | None = None,
    ) -> dict[str, Any]:
        """Run one generation of offline evolution."""
        generation_num = len(self.generations) + 1
        param_ranges = param_ranges or {
            "reactor_temp": (480.0, 540.0),
            "catalyst_ratio": (0.04, 0.12),
            "pressure": (1.5, 3.5),
            "residence_time": (2.0, 8.0),
        }

        # Step 1: Generate population
        if parent_strategies:
            population = self._evolve_population(parent_strategies, param_ranges, generation_num)
        else:
            population = self._init_population(param_ranges, generation_num)

        # Step 2: Sandbox simulation for each strategy
        scored = []
        for strategy in population:
            sim_result = await self._sandbox_simulate(strategy)
            quality_decision = decide_quality_action(strategy.data_quality_score)
            if quality_decision["action"] == "block":
                strategy.score = 0.0
            else:
                weighted = sim_result.score * quality_decision["weight"]
                strategy.score = round(weighted, 4)
            scored.append((strategy, sim_result))

        # Step 3: Select top performers
        scored.sort(key=lambda x: x[0].score, reverse=True)
        top_strategies = [s for s, _ in scored[:self.top_k]]

        self.generations.append([s for s, _ in scored])

        return {
            "generation": generation_num,
            "population_size": len(population),
            "best_score": top_strategies[0].score if top_strategies else 0,
            "avg_score": sum(s.score for s, _ in scored) / len(scored) if scored else 0,
            "top_strategies": [
                {
                    "strategy_id": s.strategy_id,
                    "params": s.params,
                    "score": round(s.score, 4),
                    "data_quality_score": round(s.data_quality_score, 4),
                    "quality_action": decide_quality_action(s.data_quality_score)["action"],
                }
                for s in top_strategies
            ],
            "convergence": self._check_convergence(),
        }

    def _init_population(self, param_ranges: dict, generation: int) -> list[Strategy]:
        population = []
        for i in range(self.population_size):
            params = {
                name: round(random.uniform(lo, hi), 4)
                for name, (lo, hi) in param_ranges.items()
            }
            population.append(Strategy(
                strategy_id=f"strat-g{generation}-{i:03d}",
                scenario_id=self.scenario_id,
                industry_id=self.industry_id,
                params=params,
                source="offline",
                generation=generation,
            ))
        return population

    def _evolve_population(self, parents: list[Strategy], param_ranges: dict, generation: int) -> list[Strategy]:
        """Create new population via crossover and mutation from parents."""
        offspring = []
        for i in range(self.population_size):
            p1, p2 = random.choices(parents, k=2)
            child_params = {}
            for name in param_ranges:
                lo, hi = param_ranges[name]
                if random.random() < 0.5:
                    val = p1.params.get(name, (lo + hi) / 2)
                else:
                    val = p2.params.get(name, (lo + hi) / 2)

                if random.random() < self.mutation_rate:
                    delta = (hi - lo) * random.gauss(0, 0.1)
                    val = max(lo, min(hi, val + delta))

                child_params[name] = round(val, 4)

            offspring.append(Strategy(
                strategy_id=f"strat-g{generation}-{i:03d}",
                scenario_id=self.scenario_id,
                industry_id=self.industry_id,
                params=child_params,
                source="offline",
                generation=generation,
                data_quality_score=round((p1.data_quality_score + p2.data_quality_score) / 2.0, 4),
            ))
        return offspring

    async def _sandbox_simulate(self, strategy: Strategy) -> SimulationResult:
        """Simulate strategy in sandbox — models TEP-like process dynamics.

        Score is based on how close parameters are to an optimal operating point,
        with realistic noise and interaction effects.
        """
        p = strategy.params
        temp = p.get("reactor_temp", 510)
        cat = p.get("catalyst_ratio", 0.08)
        pressure = p.get("pressure", 2.5)
        time_val = p.get("residence_time", 5.0)

        temp_score = 1.0 - abs(temp - 515) / 40.0
        cat_score = 1.0 - abs(cat - 0.075) / 0.05
        press_score = 1.0 - abs(pressure - 2.8) / 1.5
        time_score = 1.0 - abs(time_val - 5.5) / 4.0

        interaction = 0.05 * (temp_score * cat_score)

        raw_score = (0.35 * temp_score + 0.25 * cat_score + 0.20 * press_score + 0.20 * time_score + interaction)
        noise = random.gauss(0, 0.02)
        score = max(0.0, min(1.0, raw_score + noise))

        yield_pct = 65 + score * 20
        energy_kwh = 350 - score * 80

        return SimulationResult(
            score=round(score, 4),
            metrics={
                "predicted_yield_pct": round(yield_pct, 2),
                "predicted_energy_kwh": round(energy_kwh, 2),
            },
            passed=score > 0.6,
        )

    def _check_convergence(self) -> dict[str, Any]:
        """Check if evolution is converging."""
        if len(self.generations) < 2:
            return {"converged": False, "improvement": 0}

        prev_best = max(s.score for s in self.generations[-2])
        curr_best = max(s.score for s in self.generations[-1])
        improvement = curr_best - prev_best

        return {
            "converged": abs(improvement) < 0.005,
            "improvement": round(improvement, 4),
            "generations_run": len(self.generations),
        }

    def get_evolution_timeline(self) -> list[dict[str, Any]]:
        """Return generation-by-generation evolution history for visualization."""
        timeline = []
        for gen_idx, gen_strategies in enumerate(self.generations):
            scores = [s.score for s in gen_strategies]
            best = max(gen_strategies, key=lambda s: s.score)
            timeline.append({
                "generation": gen_idx + 1,
                "best_score": round(max(scores), 4),
                "avg_score": round(sum(scores) / len(scores), 4),
                "min_score": round(min(scores), 4),
                "strategy_count": len(gen_strategies),
                "best_params": best.params,
            })
        return timeline
