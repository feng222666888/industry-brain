"""Online evolution pipeline: signal sensing → strategy matching → safety gate → execution → asset settlement.

Implements the real-time closed-loop evolution flow. Each step is a pluggable
component configured per scenario via scenario_config.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Optional

from backend.engine.safety_gate import SafetyGate

logger = logging.getLogger(__name__)


@dataclass
class Signal:
    """Sensed signal from the production environment."""
    signal_type: str
    source_id: str
    data: dict[str, Any] = field(default_factory=dict)
    timestamp: float = 0.0

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = time.time()


@dataclass
class Strategy:
    """A matched or generated strategy to be evaluated and executed."""
    strategy_id: str
    scenario_id: str
    industry_id: str = "petrochemical"
    params: dict[str, Any] = field(default_factory=dict)
    source: str = "online"
    score: float = 0.0
    generation: int = 0


@dataclass
class ExecutionResult:
    """Result of applying a strategy in the production environment."""
    success: bool
    metrics: dict[str, float] = field(default_factory=dict)
    message: str = ""


class OnlineEvolutionPipeline:
    """Real-time evolution: sense → match → gate → execute → settle.

    Each scenario provides:
    - signal_sensor: extracts signals from live data
    - strategy_matcher: finds best matching strategy from asset repo
    - executor: applies the strategy (with safety gate)
    - asset_settler: persists successful outcomes
    """

    def __init__(self, scenario_id: str, industry_id: str = "petrochemical"):
        self.scenario_id = scenario_id
        self.industry_id = industry_id
        self.safety_gate = SafetyGate()
        self._strategy_repo: list[Strategy] = []

    def register_strategy(self, strategy: Strategy) -> None:
        self._strategy_repo.append(strategy)

    async def run(self, raw_signal_data: dict[str, Any]) -> dict[str, Any]:
        """Execute one cycle of online evolution."""
        result_log = {"scenario_id": self.scenario_id, "steps": []}

        # Step 1: Signal Sensing
        signal = self._sense_signal(raw_signal_data)
        result_log["steps"].append({
            "step": "signal_sensing",
            "signal_type": signal.signal_type,
            "source_id": signal.source_id,
        })

        # Step 2: Strategy Matching
        matched = self._match_strategy(signal)
        result_log["steps"].append({
            "step": "strategy_matching",
            "matched": matched is not None,
            "strategy_id": matched.strategy_id if matched else None,
            "score": matched.score if matched else 0,
        })

        if not matched:
            result_log["outcome"] = "no_matching_strategy"
            return result_log

        # Step 3: Safety Gate
        gate_passed = self.safety_gate.evaluate(matched)
        result_log["steps"].append({
            "step": "safety_gate",
            "passed": gate_passed,
            "strategy_id": matched.strategy_id,
        })

        if not gate_passed:
            result_log["outcome"] = "blocked_by_safety_gate"
            return result_log

        # Step 4: Execution
        exec_result = await self._execute_strategy(matched, signal)
        result_log["steps"].append({
            "step": "execution",
            "success": exec_result.success,
            "metrics": exec_result.metrics,
        })

        # Step 5: Asset Settlement
        if exec_result.success:
            settled = self._settle_asset(matched, exec_result)
            result_log["steps"].append({
                "step": "asset_settlement",
                "settled": settled,
                "updated_score": matched.score,
            })

        result_log["outcome"] = "success" if exec_result.success else "execution_failed"
        return result_log

    def _sense_signal(self, raw_data: dict[str, Any]) -> Signal:
        return Signal(
            signal_type=raw_data.get("signal_type", "unknown"),
            source_id=raw_data.get("source_id", "unknown"),
            data=raw_data,
        )

    def _match_strategy(self, signal: Signal) -> Optional[Strategy]:
        """Find the best matching strategy from the repository."""
        candidates = [
            s for s in self._strategy_repo
            if s.scenario_id == self.scenario_id and s.industry_id == self.industry_id
        ]
        if not candidates:
            return None
        return max(candidates, key=lambda s: s.score)

    async def _execute_strategy(self, strategy: Strategy, signal: Signal) -> ExecutionResult:
        """Apply strategy — in production this would invoke actual control actions."""
        logger.info(f"Executing strategy {strategy.strategy_id} for signal {signal.source_id}")
        return ExecutionResult(
            success=True,
            metrics={"improvement": 0.02, "confidence": strategy.score},
            message=f"Strategy {strategy.strategy_id} applied successfully",
        )

    def _settle_asset(self, strategy: Strategy, result: ExecutionResult) -> bool:
        """Persist successful outcome — boost strategy score and update repo."""
        improvement = result.metrics.get("improvement", 0)
        strategy.score = min(1.0, strategy.score + improvement * 0.1)
        logger.info(f"Asset settled: {strategy.strategy_id} score → {strategy.score:.3f}")
        return True
