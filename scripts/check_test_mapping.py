#!/usr/bin/env python3
"""CI gate: require test updates when critical code changes."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

CRITICAL_PREFIXES = (
    "data_pipeline/",
    "backend/engine/",
    "backend/industries/",
    "backend/api/",
    "backend/core/",
)


def _run(cmd: list[str]) -> str:
    return subprocess.check_output(cmd, text=True).strip()


def _changed_from_git() -> list[str]:
    base_ref = os.getenv("GITHUB_BASE_REF")
    event_path = os.getenv("GITHUB_EVENT_PATH")
    in_ci = os.getenv("CI", "").lower() == "true"

    try:
        if base_ref:
            return _run(["git", "diff", "--name-only", f"origin/{base_ref}...HEAD"]).splitlines()

        if event_path and Path(event_path).exists():
            with open(event_path, "r", encoding="utf-8") as f:
                payload = json.load(f)
            before = payload.get("before")
            after = payload.get("after") or os.getenv("GITHUB_SHA")
            if before and after and before != "0" * 40:
                return _run(["git", "diff", "--name-only", f"{before}...{after}"]).splitlines()

        return _run(["git", "diff", "--name-only", "HEAD~1...HEAD"]).splitlines()
    except Exception as exc:  # noqa: BLE001
        if in_ci:
            print(f"[check_test_mapping] ERROR: cannot detect changed files in CI: {exc}")
            sys.exit(2)
        print(f"[check_test_mapping] WARN: cannot detect changed files locally: {exc}")
        return []


def _load_changed_files() -> list[str]:
    env_files = os.getenv("CHANGED_FILES", "").strip()
    if env_files:
        return [x.strip() for x in env_files.split(",") if x.strip()]
    return _changed_from_git()


def main() -> int:
    changed = _load_changed_files()
    if not changed:
        print("[check_test_mapping] no changed files detected; skip")
        return 0

    critical_changed = [
        p
        for p in changed
        if p.startswith(CRITICAL_PREFIXES)
        and not p.startswith("tests/")
        and not p.startswith("docs/")
        and not p.startswith(".cursor/rules/")
    ]
    test_changed = [p for p in changed if p.startswith("tests/")]

    print(f"[check_test_mapping] changed={len(changed)} critical={len(critical_changed)} tests={len(test_changed)}")
    if critical_changed and not test_changed:
        print("[check_test_mapping] FAIL: critical code changed but no test file changed.")
        print()
        print("Critical files changed (require test coverage):")
        for item in critical_changed:
            print(f"  - {item}")
        print()
        print("Expected test locations:")
        for item in critical_changed:
            module = item.replace("/", "_").replace(".py", "")
            if "backend/api/" in item:
                print(f"  - tests/integration/test_api_endpoints.py  (add tests for {item})")
            elif "backend/industries/" in item and "/agents/" in item:
                parts = item.split("/")
                agent_name = parts[-1].replace(".py", "")
                print(f"  - tests/unit/test_{agent_name}.py")
            elif "backend/engine/" in item:
                parts = item.split("/")
                fname = parts[-1].replace(".py", "")
                print(f"  - tests/unit/test_{fname}.py")
            elif "backend/core/" in item:
                parts = item.split("/")
                fname = parts[-1].replace(".py", "")
                print(f"  - tests/unit/test_{fname}.py")
            elif "data_pipeline/" in item:
                parts = item.split("/")
                fname = parts[-1].replace(".py", "")
                print(f"  - tests/unit/test_{fname}.py")
        print()
        print("Run locally: PYTHONPATH=. pytest tests/ -v")
        return 1

    print("[check_test_mapping] PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
