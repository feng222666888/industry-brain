"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchAPI } from "../../lib/api";

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
  );
}

interface AnalysisResult {
  identified_features?: Record<string, string>;
  performance_prediction?: Record<string, string>;
  knowledge_references?: string[];
}

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

const NODE_COLORS: Record<string, string> = {
  catalyst: "bg-blue-500",
  carrier: "bg-emerald-500",
  additive: "bg-amber-500",
  modification: "bg-purple-500",
  zeolite: "bg-rose-500",
  effect: "bg-cyan-500",
  active_site: "bg-orange-500",
};

export default function CatalystPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [graphDesc, setGraphDesc] = useState("");

  useEffect(() => {
    fetchAPI<{ nodes: GraphNode[]; edges: GraphEdge[]; description: string }>(
      "/api/catalyst/knowledge-graph?query=FCC",
    )
      .then((data) => {
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        setGraphDesc(data.description || "");
      })
      .catch(() => {});
  }, []);

  const handleAnalyze = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await fetchAPI<AnalysisResult>("/api/catalyst/analyze-image", {
        method: "POST",
        body: JSON.stringify({
          catalyst_type: "FCC",
          image_description: "催化裂化催化剂SEM形貌，颗粒尺寸约2-3μm",
        }),
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "分析失败");
    } finally {
      setLoading(false);
    }
  };

  const nodePositions: Record<number, { left: string; top: string }> = {
    0: { left: "50%", top: "8%" },
    1: { left: "20%", top: "30%" },
    2: { left: "80%", top: "30%" },
    3: { left: "50%", top: "50%" },
    4: { left: "15%", top: "72%" },
    5: { left: "50%", top: "72%" },
    6: { left: "85%", top: "72%" },
    7: { left: "50%", top: "92%" },
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">催化剂研发助手</h1>
          <Link href="/cockpit" className="text-sm text-blue-500 hover:text-blue-400">返回总驾驶舱 ←</Link>
        </div>
      </header>

      <main className="grid gap-6 p-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-200">上传电镜图像</h2>
            <div className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-600 bg-slate-900/50 transition hover:border-slate-500">
              <span className="text-4xl text-slate-500">📷</span>
              <p className="mt-2 text-sm text-slate-400">拖拽或点击上传电镜图像</p>
              <p className="text-xs text-slate-500">支持 JPG、PNG</p>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="mt-4 w-full rounded-lg bg-blue-500 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <span className="flex items-center justify-center gap-2"><Spinner /> 分析中...</span> : "开始分析"}
            </button>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            {result && !loading && (
              <div className="mt-6 space-y-4 rounded-lg border border-slate-600 bg-slate-900/50 p-4">
                {result.identified_features && (
                  <div>
                    <h3 className="mb-2 font-medium text-slate-300">识别特征</h3>
                    <div className="space-y-1 text-sm text-slate-400">
                      {Object.entries(result.identified_features).map(([k, v]) => (
                        <p key={k}><span className="text-slate-500">{k}:</span> {v}</p>
                      ))}
                    </div>
                  </div>
                )}
                {result.performance_prediction && (
                  <div>
                    <h3 className="mb-2 font-medium text-slate-300">性能预测</h3>
                    <div className="space-y-1 text-sm text-slate-400">
                      {Object.entries(result.performance_prediction).map(([k, v]) => (
                        <p key={k}><span className="text-slate-500">{k}:</span> {v}</p>
                      ))}
                    </div>
                  </div>
                )}
                {result.knowledge_references && result.knowledge_references.length > 0 && (
                  <div>
                    <h3 className="mb-2 font-medium text-slate-300">文献参考</h3>
                    <ul className="space-y-1 text-sm text-slate-400">
                      {result.knowledge_references.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-200">催化剂知识图谱</h2>
          {graphDesc && <p className="mb-3 text-xs text-slate-400">{graphDesc}</p>}
          <div className="relative h-[360px] w-full">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 360">
              {edges.map((edge, i) => {
                const si = nodes.findIndex((n) => n.id === edge.source);
                const ti = nodes.findIndex((n) => n.id === edge.target);
                if (si < 0 || ti < 0) return null;
                const sp = nodePositions[si] || { left: "50%", top: "50%" };
                const tp = nodePositions[ti] || { left: "50%", top: "50%" };
                const x1 = parseFloat(sp.left) * 4;
                const y1 = parseFloat(sp.top) * 3.6;
                const x2 = parseFloat(tp.left) * 4;
                const y2 = parseFloat(tp.top) * 3.6;
                return (
                  <g key={i}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#475569" strokeWidth="1" />
                    <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 4} textAnchor="middle" fill="#64748b" fontSize="8">{edge.relation}</text>
                  </g>
                );
              })}
            </svg>
            {nodes.map((node, i) => {
              const pos = nodePositions[i];
              if (!pos) return null;
              const color = NODE_COLORS[node.type] || "bg-slate-500";
              return (
                <div key={node.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: pos.left, top: pos.top }}>
                  <div className={`rounded-full ${color} px-3 py-1.5 text-xs font-medium text-white shadow`}>{node.label}</div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
