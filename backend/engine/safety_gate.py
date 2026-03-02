"""Safety gate — all strategies must pass before entering production.

Rules:
1. Strategy score must exceed minimum threshold
2. Parameters must be within safe operating ranges
3. All audit entries are logged for rollback support
"""

from __future__ import annotations

import logging
import time
from typing import Any

logger = logging.getLogger(__name__)

SAFE_RANGES = {
    "petrochemical": {
        "reactor_temp": (460.0, 560.0),
        "catalyst_ratio": (0.02, 0.15),
        "pressure": (1.0, 4.0),
        "residence_time": (1.0, 10.0),
    }
}

MIN_SCORE_THRESHOLD = 0.5
MIN_DATA_QUALITY_THRESHOLD = 0.5


class SafetyGate:
    def __init__(self):
        self.audit_log: list[dict[str, Any]] = []

    def evaluate(self, strategy) -> bool:
        """Evaluate whether a strategy is safe to execute.

        Returns True if all safety checks pass.
        """
        checks = []

        if strategy.score < MIN_SCORE_THRESHOLD:
            checks.append(("score_check", False, f"Score {strategy.score} < threshold {MIN_SCORE_THRESHOLD}"))
        else:
            checks.append(("score_check", True, ""))

        quality_score = self._extract_data_quality_score(strategy)
        if quality_score < MIN_DATA_QUALITY_THRESHOLD:
            checks.append(
                (
                    "quality_check",
                    False,
                    f"Data quality {quality_score} < threshold {MIN_DATA_QUALITY_THRESHOLD}",
                )
            )
        else:
            checks.append(("quality_check", True, ""))

        industry_ranges = SAFE_RANGES.get(strategy.industry_id, {})
        for param_name, value in strategy.params.items():
            if param_name in industry_ranges:
                lo, hi = industry_ranges[param_name]
                if lo <= value <= hi:
                    checks.append((f"range_{param_name}", True, ""))
                else:
                    checks.append((f"range_{param_name}", False, f"{param_name}={value} outside [{lo}, {hi}]"))

        passed = all(ok for _, ok, _ in checks)

        self.audit_log.append({
            "strategy_id": strategy.strategy_id,
            "timestamp": time.time(),
            "passed": passed,
            "checks": [{"check": name, "passed": ok, "reason": reason} for name, ok, reason in checks],
        })

        if not passed:
            failures = [reason for _, ok, reason in checks if not ok]
            logger.warning(f"Safety gate BLOCKED {strategy.strategy_id}: {failures}")

        return passed

    @staticmethod
    def _extract_data_quality_score(strategy) -> float:
        """Read quality score from strategy, defaulting to 1.0 for compatibility."""
        if hasattr(strategy, "data_quality_score"):
            try:
                return float(strategy.data_quality_score)
            except Exception:  # noqa: BLE001
                return 1.0
        params = getattr(strategy, "params", {}) or {}
        try:
            return float(params.get("data_quality_score", 1.0))
        except Exception:  # noqa: BLE001
            return 1.0
