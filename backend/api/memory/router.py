"""Memory system API — sessions, stats, detail."""

from __future__ import annotations

from fastapi import APIRouter

from backend.core.memory.session_memory import session_memory
from backend.models.schemas import APIResponse

router = APIRouter()


@router.get("/stats", response_model=APIResponse)
async def memory_stats():
    store = session_memory._sessions  # noqa: SLF001
    total_msgs = sum(len(v) for v in store.values())
    avg_ctx = round(total_msgs / max(len(store), 1), 1)
    return APIResponse(
        code=0,
        data={
            "activeSessions": len(store),
            "totalMessages": total_msgs,
            "avgContextLength": avg_ctx,
        },
    )


@router.get("/sessions", response_model=APIResponse)
async def list_sessions():
    store = session_memory._sessions  # noqa: SLF001
    sessions = []
    for sid, entries in store.items():
        scenario = "unknown"
        for e in entries:
            if e.role == "system":
                if "device" in e.content:
                    scenario = "设备维护"
                elif "optim" in e.content:
                    scenario = "工艺寻优"
                elif "catalyst" in e.content:
                    scenario = "催化剂研发"
                break
        sessions.append({
            "session_id": sid,
            "scenario": scenario,
            "message_count": len(entries),
            "created_at": "",
            "last_active": "",
        })
    return APIResponse(code=0, data={"sessions": sessions})


@router.get("/sessions/{session_id}", response_model=APIResponse)
async def session_detail(session_id: str):
    entries = session_memory.get_history(session_id)
    return APIResponse(
        code=0,
        data={
            "entries": [
                {"role": e.role, "content": e.content, "metadata": e.metadata}
                for e in entries
            ]
        },
    )
