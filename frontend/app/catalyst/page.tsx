"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

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

/** 本地模拟：根据填写的参数生成分析结果，不请求后端 */
function mockAnalyze(params: {
  catalyst_type: string;
  particle_size: string;
  morphology: string;
  carrier: string;
  active_component: string;
}): AnalysisResult {
  const { catalyst_type, particle_size, morphology, carrier, active_component } = params;
  const base = catalyst_type || "通用";
  return {
    identified_features: {
      催化剂类型: base,
      粒径分布: particle_size || "未填写",
      形貌: morphology || "未填写",
      载体: carrier || "未填写",
      活性组分: active_component || "未填写",
      结晶度: `${70 + Math.floor(Math.random() * 25)}%`,
      比表面积: `${180 + Math.floor(Math.random() * 120)} m²/g`,
    },
    performance_prediction: {
      预期活性: `${75 + Math.floor(Math.random() * 20)}%`,
      稳定性指数: (0.82 + Math.random() * 0.15).toFixed(2),
      择形选择性: `${60 + Math.floor(Math.random() * 35)}%`,
      再生性能: "良好",
      备注: `基于${base}与${carrier || "载体"}的本地模拟结果，未调用后端。`,
    },
    knowledge_references: [
      "基于输入参数的本地模拟，无实际文献检索。",
      `催化剂类型「${base}」常见于炼油与化工领域。`,
      "如需真实分析请对接后端电镜图像识别服务。",
    ],
  };
}

/** 下拉选项 */
const PARAM_OPTIONS = {
  catalyst_type: [
    { value: "FCC", label: "FCC（催化裂化）" },
    { value: "加氢", label: "加氢" },
    { value: "分子筛", label: "分子筛" },
    { value: "重整", label: "重整" },
  ],
  particle_size: [
    { value: "1-2 μm", label: "1-2 μm" },
    { value: "2-3 μm", label: "2-3 μm" },
    { value: "3-5 μm", label: "3-5 μm" },
    { value: "5-10 μm", label: "5-10 μm" },
  ],
  morphology: [
    { value: "球形", label: "球形" },
    { value: "球形、部分团聚", label: "球形、部分团聚" },
    { value: "不规则", label: "不规则" },
    { value: "片状", label: "片状" },
  ],
  carrier: [
    { value: "氧化铝", label: "氧化铝" },
    { value: "氧化铝/分子筛", label: "氧化铝/分子筛" },
    { value: "分子筛", label: "分子筛" },
    { value: "硅藻土", label: "硅藻土" },
  ],
  active_component: [
    { value: "稀土", label: "稀土" },
    { value: "稀土/分子筛", label: "稀土/分子筛" },
    { value: "贵金属", label: "贵金属" },
    { value: "分子筛", label: "分子筛" },
  ],
} as const;

/** 根据当前选择参数生成知识图谱：不同类型/载体对应不同节点与边 */
function getGraphByParams(params: {
  catalyst_type: string;
  carrier: string;
  active_component: string;
}): { nodes: GraphNode[]; edges: GraphEdge[]; description: string } {
  const { catalyst_type, carrier, active_component } = params;
  const centerLabel = `${catalyst_type}催化剂`;
  const carrierLabel = carrier || "载体";
  const activeLabel = active_component || "活性组分";

  // 通用节点 id，保证同类型选择下结构稳定
  const nodes: GraphNode[] = [
    { id: "n1", label: centerLabel, type: "catalyst" },
    { id: "n2", label: carrier === "分子筛" || carrier === "氧化铝/分子筛" ? "Y型分子筛" : carrier || "基质", type: carrier?.includes("分子筛") ? "zeolite" : "carrier" },
    { id: "n3", label: carrier === "氧化铝" ? "氧化铝基质" : "基质", type: "carrier" },
    { id: "n4", label: "活性中心", type: "active_site" },
    { id: "n5", label: catalyst_type === "FCC" ? "稀土改性" : catalyst_type === "加氢" ? "硫化态" : "酸中心", type: "modification" },
    { id: "n6", label: catalyst_type === "分子筛" ? "择形催化" : "裂化/加氢", type: "effect" },
    { id: "n7", label: "抗磨添加剂", type: "additive" },
    { id: "n8", label: catalyst_type === "加氢" ? "脱硫活性" : "裂化活性", type: "effect" },
  ];

  const edges: GraphEdge[] = [
    { source: "n1", target: "n2", relation: "含" },
    { source: "n1", target: "n3", relation: "含" },
    { source: "n2", target: "n4", relation: "提供" },
    { source: "n1", target: "n5", relation: "可改性" },
    { source: "n4", target: "n6", relation: "导致" },
    { source: "n1", target: "n7", relation: "可含" },
    { source: "n4", target: "n8", relation: "导致" },
  ];

  const description = `当前选择：${catalyst_type} · 载体 ${carrier} · 活性组分 ${activeLabel}。图谱随选择更新（本地数据）。`;
  return { nodes, edges, description };
}

export default function CatalystPage() {
  const [params, setParams] = useState({
    catalyst_type: "FCC",
    particle_size: "2-3 μm",
    morphology: "球形、部分团聚",
    carrier: "氧化铝/分子筛",
    active_component: "稀土/分子筛",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  // 右侧图谱根据选择参数实时更新
  const { nodes, edges, description: graphDesc } = useMemo(
    () => getGraphByParams(params),
    [params.catalyst_type, params.carrier, params.active_component],
  );

  const handleAnalyze = () => {
    setLoading(true);
    setError("");
    setResult(null);
    window.setTimeout(() => {
      setResult(mockAnalyze(params));
      setLoading(false);
    }, 500);
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
            <h2 className="mb-4 text-lg font-semibold text-slate-200">选择参数（本地模拟分析）</h2>
            <div className="space-y-4">
              {(Object.keys(PARAM_OPTIONS) as Array<keyof typeof PARAM_OPTIONS>).map((key) => (
                <div key={key}>
                  <label className="mb-1 block text-xs text-slate-400">
                    {key === "catalyst_type" && "催化剂类型"}
                    {key === "particle_size" && "粒径/颗粒尺寸"}
                    {key === "morphology" && "形貌描述"}
                    {key === "carrier" && "载体"}
                    {key === "active_component" && "活性组分"}
                  </label>
                  <select
                    value={params[key]}
                    onChange={(e) => setParams((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {PARAM_OPTIONS[key].map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-blue-500 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
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
