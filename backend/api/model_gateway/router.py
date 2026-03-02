"""Model gateway API — LiteLLM config, Ollama status, metrics."""

from __future__ import annotations

import logging
from pathlib import Path

import yaml
from fastapi import APIRouter

from backend.models.schemas import APIResponse

logger = logging.getLogger(__name__)
router = APIRouter()

CONFIG_PATH = Path(__file__).resolve().parents[2] / "config" / "litellm_config.yaml"

AGENT_ROUTES = [
    {"agent": "monitor_agent", "model_alias": "agent-reasoning"},
    {"agent": "diagnosis_agent", "model_alias": "agent-reasoning"},
    {"agent": "repair_agent", "model_alias": "agent-reasoning"},
    {"agent": "optimization_agent", "model_alias": "agent-reasoning"},
    {"agent": "research_agent", "model_alias": "vision-analysis"},
]

PARAM_MAP = {
    "deepseek-r1:14b": "14B",
    "qwen2.5-vl:7b": "7B",
    "bge-m3": "568M",
}

PURPOSE_MAP = {
    "agent-reasoning": "Agent 推理与工具调用",
    "vision-analysis": "电镜图像多模态分析",
    "knowledge-extraction": "NER 与关系抽取",
    "embedding": "中英双语向量化 (RAG)",
}


def _load_config() -> list[dict]:
    try:
        with open(CONFIG_PATH) as f:
            cfg = yaml.safe_load(f) or {}
        return cfg.get("model_list", [])
    except Exception as exc:
        logger.warning(f"Failed to load litellm config: {exc}")
        return []


@router.get("/models", response_model=APIResponse)
async def list_models():
    raw = _load_config()
    models = []
    for item in raw:
        alias = item.get("model_name", "")
        lp = item.get("litellm_params", {})
        model_str = lp.get("model", "")
        short = model_str.replace("ollama/", "")
        models.append({
            "alias": alias,
            "engine": "Ollama",
            "model": short,
            "purpose": PURPOSE_MAP.get(alias, ""),
            "params": PARAM_MAP.get(short, "—"),
            "status": "unknown",
        })
    return APIResponse(code=0, data={"models": models, "routes": AGENT_ROUTES})


@router.get("/status", response_model=APIResponse)
async def engine_status():
    connected = False
    loaded: list[str] = []
    try:
        import httpx
        resp = httpx.get("http://localhost:11434/api/tags", timeout=3)
        if resp.status_code == 200:
            connected = True
            data = resp.json()
            loaded = [m["name"] for m in data.get("models", [])]
    except Exception:
        pass
    return APIResponse(
        code=0,
        data={"connected": connected, "models_loaded": loaded, "gpu_memory": None},
    )


@router.get("/metrics", response_model=APIResponse)
async def model_metrics():
    raw = _load_config()
    metrics = []
    for item in raw:
        alias = item.get("model_name", "")
        metrics.append({"alias": alias, "calls": 0, "avgLatency": "—", "tokens": 0})
    return APIResponse(code=0, data={"metrics": metrics})
