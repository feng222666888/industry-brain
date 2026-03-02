"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "../../lib/api";

interface GraphNode {
  id: string;
  label: string;
  type: string;
}
interface GraphEdge {
  source: string;
  target: string;
  relation: string;
}
interface KnowledgeStats {
  entities: number;
  relations: number;
  documents: number;
  vectorDim: number;
}
interface Term {
  raw: string;
  standard: string;
  domain: string;
}
interface ScenarioConfig {
  id: string;
  name: string;
  signal_type: string;
  strategy_type: string;
  sandbox_type: string;
}

export default function KnowledgePage() {
  const [stats, setStats] = useState<KnowledgeStats>({ entities: 0, relations: 0, documents: 0, vectorDim: 0 });
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [configs, setConfigs] = useState<ScenarioConfig[]>([]);
  const [tab, setTab] = useState<"graph" | "terms" | "models">("graph");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      fetchAPI<KnowledgeStats>("/api/knowledge/stats"),
      fetchAPI<{ nodes: GraphNode[]; edges: GraphEdge[] }>("/api/knowledge/graph"),
      fetchAPI<{ terms: Term[] }>("/api/knowledge/terms"),
      fetchAPI<{ configs: ScenarioConfig[] }>("/api/knowledge/scenario-configs"),
    ]).then(([sRes, gRes, tRes, cRes]) => {
      if (cancelled) return;
      if (sRes.status === "fulfilled") setStats(sRes.value);
      if (gRes.status === "fulfilled") {
        setNodes(gRes.value.nodes || []);
        setEdges(gRes.value.edges || []);
      }
      if (tRes.status === "fulfilled") setTerms(tRes.value.terms || []);
      if (cRes.status === "fulfilled") setConfigs(cRes.value.configs || []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const nodeTypes = [...new Set(nodes.map((n) => n.type))];
  const nodeColors: Record<string, string> = {
    catalyst: "bg-purple-500",
    equipment: "bg-blue-500",
    fault: "bg-red-500",
    process: "bg-emerald-500",
    material: "bg-amber-500",
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800 px-6 py-4">
        <h1 className="text-xl font-bold">知识中心</h1>
        <p className="mt-1 text-sm text-slate-400">行业知识图谱 · 业务模型 · 术语标准化 · 向量检索</p>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "实体总数", value: stats.entities, color: "text-blue-400" },
            { label: "关系总数", value: stats.relations, color: "text-emerald-400" },
            { label: "文档数", value: stats.documents, color: "text-purple-400" },
            { label: "向量维度", value: stats.vectorDim, color: "text-amber-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <p className="text-sm text-slate-400">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${s.color}`}>{loading ? "—" : s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 border-b border-slate-700 pb-0">
          {(["graph", "terms", "models"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === t ? "bg-slate-800 text-blue-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {{ graph: "知识图谱", terms: "术语标准化", models: "业务模型" }[t]}
            </button>
          ))}
        </div>

        {tab === "graph" && (
          <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <div className="mb-4 flex flex-wrap gap-3">
              {nodeTypes.map((t) => (
                <span key={t} className="flex items-center gap-2 text-xs text-slate-400">
                  <span className={`h-3 w-3 rounded-full ${nodeColors[t] || "bg-slate-500"}`} />
                  {t}
                </span>
              ))}
            </div>
            {nodes.length > 0 ? (
              <div className="relative min-h-[400px] rounded-lg bg-slate-900 p-4">
                <svg viewBox="0 0 800 400" className="h-full w-full">
                  {edges.map((e, i) => {
                    const src = nodes.find((n) => n.id === e.source);
                    const tgt = nodes.find((n) => n.id === e.target);
                    if (!src || !tgt) return null;
                    const si = nodes.indexOf(src);
                    const ti = nodes.indexOf(tgt);
                    const sx = 100 + (si % 5) * 150;
                    const sy = 80 + Math.floor(si / 5) * 120;
                    const tx = 100 + (ti % 5) * 150;
                    const ty = 80 + Math.floor(ti / 5) * 120;
                    return (
                      <g key={i}>
                        <line x1={sx} y1={sy} x2={tx} y2={ty} stroke="#475569" strokeWidth="1.5" />
                        <text x={(sx + tx) / 2} y={(sy + ty) / 2 - 6} textAnchor="middle" className="fill-slate-500 text-[10px]">
                          {e.relation}
                        </text>
                      </g>
                    );
                  })}
                  {nodes.map((n, i) => {
                    const cx = 100 + (i % 5) * 150;
                    const cy = 80 + Math.floor(i / 5) * 120;
                    const color = n.type === "catalyst" ? "#a855f7" : n.type === "equipment" ? "#3b82f6" : n.type === "fault" ? "#ef4444" : n.type === "process" ? "#10b981" : "#f59e0b";
                    return (
                      <g key={n.id}>
                        <circle cx={cx} cy={cy} r="24" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
                        <text x={cx} y={cy + 4} textAnchor="middle" className="fill-slate-200 text-[11px] font-medium">
                          {n.label.length > 6 ? n.label.slice(0, 6) + "…" : n.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-slate-500">{loading ? "加载中…" : "暂无图谱数据"}</p>
            )}
          </section>
        )}

        {tab === "terms" && (
          <section className="rounded-xl border border-slate-700 bg-slate-800">
            <div className="border-b border-slate-700 px-4 py-3">
              <h3 className="text-sm font-medium text-slate-300">术语标准化映射</h3>
            </div>
            {terms.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-slate-400">
                    <th className="px-4 py-3 font-medium">原始术语</th>
                    <th className="px-4 py-3 font-medium">标准术语</th>
                    <th className="px-4 py-3 font-medium">领域</th>
                  </tr>
                </thead>
                <tbody>
                  {terms.map((t, i) => (
                    <tr key={i} className="border-b border-slate-700/50">
                      <td className="px-4 py-2 text-slate-300">{t.raw}</td>
                      <td className="px-4 py-2 font-medium text-blue-400">{t.standard}</td>
                      <td className="px-4 py-2 text-slate-500">{t.domain}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="py-12 text-center text-sm text-slate-500">{loading ? "加载中…" : "暂无术语数据"}</p>
            )}
          </section>
        )}

        {tab === "models" && (
          <section className="grid gap-4 md:grid-cols-3">
            {configs.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <h3 className="font-semibold text-slate-200">{c.name}</h3>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">信号类型</span>
                    <span className="font-mono text-slate-300">{c.signal_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">策略类型</span>
                    <span className="font-mono text-slate-300">{c.strategy_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">沙盒类型</span>
                    <span className="font-mono text-slate-300">{c.sandbox_type}</span>
                  </div>
                </div>
              </div>
            ))}
            {configs.length === 0 && (
              <p className="col-span-3 py-12 text-center text-sm text-slate-500">{loading ? "加载中…" : "暂无配置"}</p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
