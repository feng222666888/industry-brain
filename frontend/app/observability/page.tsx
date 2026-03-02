"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "../../lib/api";

interface ObsMetrics {
  avgLatency: number;
  successRate: number;
  todayCalls: number;
  activeSpans: number;
}

interface TraceRow {
  session_id: string;
  agent_name: string;
  action: string;
  latency_ms: number;
  tools_called: string[];
  status: "success" | "error";
  timestamp: string;
}

export default function ObservabilityPage() {
  const [metrics, setMetrics] = useState<ObsMetrics>({ avgLatency: 0, successRate: 0, todayCalls: 0, activeSpans: 0 });
  const [traces, setTraces] = useState<TraceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      fetchAPI<ObsMetrics>("/api/observability/metrics"),
      fetchAPI<{ traces: TraceRow[] }>("/api/observability/traces"),
    ]).then(([mRes, tRes]) => {
      if (cancelled) return;
      if (mRes.status === "fulfilled") setMetrics(mRes.value);
      if (tRes.status === "fulfilled") setTraces(tRes.value.traces || []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const agentLatencies = traces.reduce<Record<string, { total: number; count: number }>>((acc, t) => {
    if (!acc[t.agent_name]) acc[t.agent_name] = { total: 0, count: 0 };
    acc[t.agent_name].total += t.latency_ms;
    acc[t.agent_name].count += 1;
    return acc;
  }, {});
  const latencyBars = Object.entries(agentLatencies).map(([name, v]) => ({
    name,
    avg: Math.round(v.total / v.count),
  }));
  const maxLat = Math.max(...latencyBars.map((b) => b.avg), 1);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800 px-6 py-4">
        <h1 className="text-xl font-bold">可观测系统</h1>
        <p className="mt-1 text-sm text-slate-400">Agent 监控 · 评估分析</p>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "平均延迟", value: `${metrics.avgLatency}ms`, color: "text-blue-400" },
            { label: "调用成功率", value: `${(metrics.successRate * 100).toFixed(0)}%`, color: "text-emerald-400" },
            { label: "今日调用量", value: metrics.todayCalls, color: "text-purple-400" },
            { label: "活跃 Span", value: metrics.activeSpans, color: "text-amber-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <p className="text-sm text-slate-400">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${s.color}`}>{loading ? "—" : s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-xl border border-slate-700 bg-slate-800 lg:col-span-2">
            <h2 className="border-b border-slate-700 px-4 py-3 text-sm font-medium text-slate-300">调用链追踪</h2>
            {traces.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left text-slate-400">
                      <th className="px-4 py-2 font-medium">时间</th>
                      <th className="px-4 py-2 font-medium">Agent</th>
                      <th className="px-4 py-2 font-medium">Action</th>
                      <th className="px-4 py-2 font-medium">延迟</th>
                      <th className="px-4 py-2 font-medium">工具</th>
                      <th className="px-4 py-2 font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {traces.map((t, i) => (
                      <tr key={i} className="border-b border-slate-700/50">
                        <td className="px-4 py-2 text-xs text-slate-500">{t.timestamp}</td>
                        <td className="px-4 py-2 font-mono text-blue-400">{t.agent_name}</td>
                        <td className="px-4 py-2">{t.action}</td>
                        <td className="px-4 py-2 font-mono">{t.latency_ms}ms</td>
                        <td className="px-4 py-2 text-xs text-slate-400">{t.tools_called.join(", ") || "—"}</td>
                        <td className="px-4 py-2">
                          <span className={t.status === "success" ? "text-emerald-400" : "text-red-400"}>{t.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-4 py-12 text-center text-sm text-slate-500">{loading ? "加载中…" : "暂无追踪数据"}</p>
            )}
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <h2 className="mb-4 text-sm font-medium text-slate-300">Agent 延迟分布</h2>
            {latencyBars.length > 0 ? (
              <div className="space-y-3">
                {latencyBars.map((b) => (
                  <div key={b.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">{b.name.replace("_agent", "")}</span>
                      <span className="font-mono text-slate-300">{b.avg}ms</span>
                    </div>
                    <div className="h-4 overflow-hidden rounded bg-slate-700">
                      <div className="h-full rounded bg-blue-500 transition-all" style={{ width: `${(b.avg / maxLat) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-xs text-slate-500">{loading ? "加载中…" : "暂无数据"}</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
