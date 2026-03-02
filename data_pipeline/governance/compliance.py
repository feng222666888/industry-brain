"""Compliance checks for data acquisition sources."""

from __future__ import annotations

from urllib.parse import urlparse


def check_compliance(source_url: str):
    parsed = urlparse(source_url or "")
    host = parsed.netloc.lower()
    scheme_ok = parsed.scheme in {"http", "https"}
    host_ok = bool(host)

    # Minimal baseline policy for demo:
    # 1) only http/https
    # 2) reject local/private addresses
    private_or_local = any(
        token in host for token in ("localhost", "127.0.0.1", "::1", "192.168.", "10.", "172.16.")
    )
    robots_ok = scheme_ok and host_ok and not private_or_local
    return {
        "robots_ok": robots_ok,
        "copyright_ok": True,
        "scheme_ok": scheme_ok,
        "host_ok": host_ok,
        "source_host": host,
    }
