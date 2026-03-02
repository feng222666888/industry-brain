"""Deduplication utilities for source URLs and textual payloads."""

from __future__ import annotations

import hashlib
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from data_pipeline.scrapers.core.models import RawRecord


TRACKING_QUERY_KEYS = {
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "spm",
    "from",
}


def canonicalize_url(url: str) -> str:
    """Normalize URL for deterministic dedup matching."""
    parts = urlsplit((url or "").strip())
    scheme = parts.scheme.lower() or "https"
    netloc = parts.netloc.lower()

    query_items = []
    for key, value in parse_qsl(parts.query, keep_blank_values=False):
        if key.lower() in TRACKING_QUERY_KEYS:
            continue
        query_items.append((key, value))
    query_items.sort()
    normalized_query = urlencode(query_items, doseq=True)

    path = parts.path or "/"
    while "//" in path:
        path = path.replace("//", "/")
    if len(path) > 1 and path.endswith("/"):
        path = path[:-1]

    return urlunsplit((scheme, netloc, path, normalized_query, ""))


def content_hash(text: str) -> str:
    payload = " ".join((text or "").split())
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def deduplicate_records(records: list[RawRecord]) -> tuple[list[RawRecord], list[dict[str, str]]]:
    """Deduplicate records by canonical URL and content hash.

    Returns:
        (deduped_records, dropped_items)
    """
    seen_urls: set[str] = set()
    seen_hashes: set[str] = set()
    kept: list[RawRecord] = []
    dropped: list[dict[str, str]] = []

    for record in records:
        canonical_url = canonicalize_url(record.meta.source_url)
        body_hash = content_hash(record.content)

        if canonical_url in seen_urls:
            dropped.append(
                {
                    "record_id": record.record_id,
                    "reason": "duplicate_url",
                    "key": canonical_url,
                }
            )
            continue

        if body_hash in seen_hashes:
            dropped.append(
                {
                    "record_id": record.record_id,
                    "reason": "duplicate_content",
                    "key": body_hash,
                }
            )
            continue

        seen_urls.add(canonical_url)
        seen_hashes.add(body_hash)
        kept.append(record)

    return kept, dropped

