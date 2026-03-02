"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "../../lib/api";

interface Pipeline {
  scenario: string;
  agents: string[];
  mode: string;
}

interface Execution {
  session_id: string;
  scenario: string;
  agents: string[];
  handoffs: number;
  total_latency_ms: number;
  status: "COMPLETE" | "ERROR";
  timestamp: string;
}

const ACTION_FLOW = [
  { label: "Manager 分配", desc: "根据输入选择首个 Agent" },
  { label: "Agent 执行", desc: "执行推理并返回结果" },
  { label: "评估决策", desc: "CONTINUE / HANDOFF / COMPLETE / ERROR" },
  { label: "转交或完成", desc: "转交下一个 Agent 或返回最终结果" },
];

export default function MultiAgentPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      fetchAPI<{ pipelines: Pipeline[] }>("/api/multi-agent/pipelines"),
      fetchAPI<{ executions: Execution[] }>("/api/multi-agent/executions"),
    ]).then(([pRes, eRes]) => {
      if (cancelled) return;
      if (pRes.status === "fulfilled") setPipelines(pRes.value.pipelines || []);
      if (eRes.status === "fulfilled") setExecutions(eRes.value.executions || []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800 px-6 py-4">
        <h1 className="text-xl font-bold">Multi-Agent 引擎</h1>
        <p className="mt-1 text-sm text-slate-400">Manager/Handoffs 协同编排 · 沙盒执行</p>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-200">编排模式: Manager/Handoffs</h2>
          <div className="flex flex-wrap items-center gap-3">
            {ACTION_FLOW.map((step, i) => (
              <div key={step.label} className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-900 px-4 py-3 text-center">
                  <p className="text-sm font-medium text-blue-400">{step.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{step.desc}</p>
                </div>
                {i < ACTION_FLOW.length - 1 && <span className="text-slate-600">→</span>}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-200">场景协同链路</h2>
          {pipelines.length > 0 ? (
            <div className="space-y-4">
              {pipelines.map((p) => (
                <div key={p.scenario} className="rounded-lg bg-slate-900 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-300">{p.scenario}</span>
                    <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-500">{p.mode}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-400">Manager</span>
                    {p.agents.map((a, i) => (
                      <span key={a} className="flex items-center gap-2">
                        <span className="text-slate-600">→</span>
                        <span className="rounded bg-blue-500/20 px-2 py-1 text-xs font-mono text-blue-400">{a}</span>
                        {i < p.agents.length - 1 && (
                          <span className="text-[10px] text-amber-500">HANDOFF</span>
                        )}
                      </span>
                    ))}
                    <span className="text-slate-600">→</span>
                    <span className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-400">COMPLETE</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">{loading ? "加载中…" : "暂无链路数据"}</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-800">
          <h2 className="border-b border-slate-700 px-4 py-3 text-sm font-medium text-slate-300">执行历史</h2>
          {executions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-slate-400">
                    <th className="px-4 py-3 font-medium">Session</th>
                    <th className="px-4 py-3 font-medium">场景</th>
                    <th className="px-4 py-3 font-medium">Agent 链</th>
                    <th className="px-4 py-3 font-medium">Handoffs</th>
                    <th className="px-4 py-3 font-medium">延迟</th>
                    <th className="px-4 py-3 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {executions.map((e) => (
                    <tr key={e.session_id} className="border-b border-slate-700/50">
                      <td className="px-4 py-3 font-mono text-xs text-blue-400">{e.session_id.slice(0, 12)}…</td>
                      <td className="px-4 py-3">{e.scenario}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{e.agents.join(" → ")}</td>
                      <td className="px-4 py-3 text-center">{e.handoffs}</td>
                      <td className="px-4 py-3">{e.total_latency_ms}ms</td>
                      <td className="px-4 py-3">
                        <span className={e.status === "COMPLETE" ? "text-emerald-400" : "text-red-400"}>{e.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-4 py-12 text-center text-sm text-slate-500">{loading ? "加载中…" : "暂无执行记录"}</p>
          )}
        </section>
      </main>
    </div>
  );
}
