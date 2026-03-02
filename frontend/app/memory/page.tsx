"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "../../lib/api";

interface MemoryStats {
  activeSessions: number;
  totalMessages: number;
  avgContextLength: number;
}

interface SessionSummary {
  session_id: string;
  scenario: string;
  message_count: number;
  created_at: string;
  last_active: string;
}

interface MemoryEntry {
  role: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export default function MemoryPage() {
  const [stats, setStats] = useState<MemoryStats>({ activeSessions: 0, totalMessages: 0, avgContextLength: 0 });
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      fetchAPI<MemoryStats>("/api/memory/stats"),
      fetchAPI<{ sessions: SessionSummary[] }>("/api/memory/sessions"),
    ]).then(([sRes, ssRes]) => {
      if (cancelled) return;
      if (sRes.status === "fulfilled") setStats(sRes.value);
      if (ssRes.status === "fulfilled") setSessions(ssRes.value.sessions || []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const loadDetail = (id: string) => {
    if (selected === id) { setSelected(null); return; }
    setSelected(id);
    fetchAPI<{ entries: MemoryEntry[] }>(`/api/memory/sessions/${id}`)
      .then((d) => setDetail(d.entries || []))
      .catch(() => setDetail([]));
  };

  const roleColors: Record<string, string> = {
    user: "bg-blue-500/20 text-blue-400",
    agent: "bg-emerald-500/20 text-emerald-400",
    tool: "bg-amber-500/20 text-amber-400",
    system: "bg-slate-600/30 text-slate-400",
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800 px-6 py-4">
        <h1 className="text-xl font-bold">记忆系统</h1>
        <p className="mt-1 text-sm text-slate-400">会话管理 · 上下文管理</p>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "活跃会话", value: stats.activeSessions, color: "text-blue-400" },
            { label: "总消息数", value: stats.totalMessages, color: "text-emerald-400" },
            { label: "平均上下文长度", value: stats.avgContextLength, color: "text-purple-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <p className="text-sm text-slate-400">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${s.color}`}>{loading ? "—" : s.value}</p>
            </div>
          ))}
        </div>

        <section className="rounded-xl border border-slate-700 bg-slate-800">
          <h2 className="border-b border-slate-700 px-4 py-3 text-sm font-medium text-slate-300">会话列表</h2>
          {sessions.length > 0 ? (
            <div className="divide-y divide-slate-700/50">
              {sessions.map((s) => (
                <div key={s.session_id}>
                  <button
                    onClick={() => loadDetail(s.session_id)}
                    className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-slate-700/30"
                  >
                    <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-emerald-500" />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm text-blue-400">{s.session_id}</p>
                      <p className="text-xs text-slate-500">{s.scenario} · {s.message_count} 条消息</p>
                    </div>
                    <span className="text-xs text-slate-500">{s.last_active}</span>
                    <span className={`text-[10px] text-slate-500 transition-transform ${selected === s.session_id ? "rotate-90" : ""}`}>▶</span>
                  </button>
                  {selected === s.session_id && (
                    <div className="border-t border-slate-700/50 bg-slate-900/50 px-6 py-4">
                      {detail.length > 0 ? (
                        <div className="space-y-2">
                          {detail.map((e, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <span className={`mt-0.5 rounded px-2 py-0.5 text-xs font-medium ${roleColors[e.role] || roleColors.system}`}>
                                {e.role}
                              </span>
                              <p className="flex-1 text-sm text-slate-300">{e.content}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">加载中…</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="px-4 py-12 text-center text-sm text-slate-500">{loading ? "加载中…" : "暂无会话"}</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-2 text-sm font-medium text-slate-300">存储架构</h2>
          <div className="flex gap-4 text-sm">
            <div className="flex-1 rounded-lg bg-slate-900 p-4">
              <p className="font-medium text-amber-400">当前: 进程内存</p>
              <p className="mt-1 text-xs text-slate-500">dict[str, list] 存储，重启后丢失</p>
            </div>
            <div className="flex items-center text-slate-600">→</div>
            <div className="flex-1 rounded-lg bg-slate-900 p-4">
              <p className="font-medium text-emerald-400">生产路线: Redis + PostgreSQL</p>
              <p className="mt-1 text-xs text-slate-500">Redis 热缓存 + PostgreSQL 冷持久化</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
