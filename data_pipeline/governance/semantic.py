"""Semantic normalization for industry terms."""

from __future__ import annotations


TERM_MAPS = {
    "petrochemical": {
        "催化裂化": "FCC",
        "流化催化裂化": "FCC",
        "重整装置": "催化重整",
        "循环油浆泵": "循环水泵",
        "压气机": "压缩机",
    }
}


def standardize_terms(text: str, industry_id: str) -> str:
    normalized = text or ""
    mapping = TERM_MAPS.get(industry_id, {})
    for source, target in mapping.items():
        normalized = normalized.replace(source, target)
    return normalized
