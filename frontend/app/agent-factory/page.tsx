"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "../../lib/api";

interface AgentMeta {
  name: string;
  industry_id: string;
  scenario_id: string;
  description: string;
  module_path: string;
  status: "online" | "offline";
}

interface AgentStats {
  total: number;
  online: number;
  totalCalls: number;
  avgLatency: string;
}

const TOPOLOGY = [
  {
    scenario: "设备预测维护",
    agents: ["monitor_agent", "diagnosis_agent", "repair_agent"],
    mode: "chain",
  },
  {
    scenario: "工艺参数寻优",
    agents: ["optimization_agent"],
    mode: "standalone",
  },
  {
    scenario: "催化剂研发",
    agents: ["research_agent"],
    mode: "standalone",
  },
];

export default function AgentFactoryPage() {
  const [agents, setAgents] = useState<AgentMeta[]>([]);
  const [stats, setStats] = useState<AgentStats>({ total: 0, online: 0, totalCalls: 0, avgLatency: "—" });
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      fetchAPI<{ agents: AgentMeta[] }>("/api/agent-factory/agents"),
      fetchAPI<AgentStats>("/api/agent-factory/stats"),
    ]).then(([aRes, sRes]) => {
      if (cancelled) return;
      if (aRes.status === "fulfilled") setAgents(aRes.value.agents || []);
      if (sRes.status === "fulfilled") setStats(sRes.value);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800 px-6 py-4">
        <h1 className="text-xl font-bold">Agent 生产系统</h1>
        <p className="mt-1 text-sm text-slate-400">Agent 构建 · Agent 发布/运行</p>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "已注册 Agent", value: stats.total, color: "text-blue-400" },
            { label: "在线数", value: stats.online, color: "text-emerald-400" },
            { label: "总调用次数", value: stats.totalCalls, color: "text-purple-400" },
            { label: "平均延迟", value: stats.avgLatency, color: "text-amber-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <p className="text-sm text-slate-400">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${s.color}`}>{loading ? "—" : s.value}</p>
            </div>
          ))}
        </div>

        <section className="rounded-xl border border-slate-700 bg-slate-800">
          <h2 className="border-b border-slate-700 px-4 py-3 text-sm font-medium text-slate-300">Agent 注册表</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-slate-400">
                  <th className="px-4 py-3 font-medium">名称</th>
                  <th className="px-4 py-3 font-medium">行业</th>
                  <th className="px-4 py-3 font-medium">场景</th>
                  <th className="px-4 py-3 font-medium">描述</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr
                    key={a.name}
                    onClick={() => setSelected(selected === a.name ? null : a.name)}
                    className="cursor-pointer border-b border-slate-700/50 transition-colors hover:bg-slate-700/20"
                  >
                    <td className="px-4 py-3 font-mono text-blue-400">{a.name}</td>
                    <td className="px-4 py-3">{a.industry_id}</td>
                    <td className="px-4 py-3">{a.scenario_id}</td>
                    <td className="px-4 py-3 text-slate-400">{a.description}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${a.status === "online" ? "bg-emerald-500" : "bg-slate-500"}`} />
                        {a.status === "online" ? "在线" : "离线"}
                      </span>
                    </td>
                  </tr>
                ))}
                {agents.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">{loading ? "加载中…" : "暂无 Agent"}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {selected && (
            <div className="border-t border-slate-700 bg-slate-900/50 px-6 py-4">
              <p className="text-xs text-slate-500">模块路径</p>
              <p className="mt-1 font-mono text-sm text-slate-300">{agents.find((a) => a.name === selected)?.module_path || "—"}</p>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-200">Agent 拓扑</h2>
          <div className="space-y-4">
            {TOPOLOGY.map((t) => (
              <div key={t.scenario} className="rounded-lg bg-slate-900 p-4">
                <p className="mb-2 text-sm font-medium text-slate-300">{t.scenario}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-400">Manager</span>
                  {t.agents.map((a, i) => (
                    <span key={a} className="flex items-center gap-2">
                      <span className="text-slate-600">→</span>
                      <span className={`rounded px-2 py-1 text-xs font-mono ${
                        agents.find((ag) => ag.name === a)?.status === "online"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-slate-700 text-slate-400"
                      }`}>
                        {a}
                      </span>
                      {t.mode === "chain" && i < t.agents.length - 1 && (
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
        </section>
      </main>
    </div>
  );
}
