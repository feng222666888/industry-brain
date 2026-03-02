"""Data quality checks for scraped or generated datasets."""

from __future__ import annotations

from typing import Any


def _to_rows(data: Any) -> list[dict[str, Any]]:
    if isinstance(data, dict):
        return [data]
    if isinstance(data, list):
        return [row for row in data if isinstance(row, dict)]
    return []


def validate_quality(
    data: Any,
    required_fields: list[str] | None = None,
    numeric_ranges: dict[str, tuple[float, float]] | None = None,
    return_report: bool = False,
):
    """Validate data completeness and physical-range sanity.

    By default returns bool for backward compatibility.
    Set ``return_report=True`` to get a structured report.
    """
    rows = _to_rows(data)
    required = required_fields or []
    ranges = numeric_ranges or {}

    if not rows:
        report = {"passed": False, "records": 0, "missing_fields": {}, "range_violations": {}, "completeness": 0.0}
        return report if return_report else report["passed"]

    missing_fields: dict[str, int] = {}
    for field in required:
        missing_fields[field] = sum(1 for row in rows if row.get(field) in (None, ""))

    range_violations: dict[str, int] = {}
    for field, (lo, hi) in ranges.items():
        violations = 0
        for row in rows:
            value = row.get(field)
            if value is None:
                continue
            if not isinstance(value, (int, float)) or value < lo or value > hi:
                violations += 1
        range_violations[field] = violations

    total_required_slots = len(rows) * len(required) if required else 0
    total_missing = sum(missing_fields.values())
    completeness = 1.0 if total_required_slots == 0 else max(0.0, 1.0 - total_missing / total_required_slots)
    passed = total_missing == 0 and all(v == 0 for v in range_violations.values())

    report = {
        "passed": passed,
        "records": len(rows),
        "missing_fields": missing_fields,
        "range_violations": range_violations,
        "completeness": round(completeness, 4),
    }
    return report if return_report else report["passed"]
