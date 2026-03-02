"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { fetchAPI, sseStream } from "../../lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CorrosionObject {
  id: string;
  name: string;
  type: string;
  material: string;
  medium: string;
  location: string;
  wall_thickness_mm: number;
  install_date: string;
}

interface DomainStat {
  name: string;
  count?: number;
  pct: string;
}

interface ModelInfo {
  id: string;
  name: string;
  training_data: string;
  domains: number;
  accuracy: string;
}

interface RiskResult {
  mechanism: string;
  category: string;
  risk_level: string;
  risk_color: string;
  corrosion_rate_mm_yr: number;
  condition: string;
  formula: string;
}

interface AnalysisResult {
  object_type: string;
  object_name: string;
  risk_results: RiskResult[];
  risk_summary: { A: number; B: number; C: number };
  max_risk_level: string;
  recommended_inspection_interval_months: number;
  conclusion: string;
}

interface AgentStep {
  label: string;
  result: string;
}

/* ------------------------------------------------------------------ */
/*  Fallback Data                                                      */
/* ------------------------------------------------------------------ */

const FALLBACK_OBJECTS: CorrosionObject[] = [
  { id: "EQ-CDU-T101", name: "常压塔T-101", type: "equipment", material: "碳钢(Q345R)", medium: "原油/石脑油", location: "常减压装置", wall_thickness_mm: 28.0, install_date: "2018-06-15" },
  { id: "PL-H2S-001", name: "含硫污水管线-001", type: "pipeline", material: "碳钢(20#)", medium: "含H₂S酸性水", location: "硫磺回收装置", wall_thickness_mm: 8.0, install_date: "2020-01-10" },
  { id: "CP-PUMP-IMP01", name: "离心泵叶轮-01", type: "component", material: "双相不锈钢(2205)", medium: "含固催化剂浆液", location: "催化裂化装置", wall_thickness_mm: 12.0, install_date: "2021-04-18" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function riskBadge(level: string) {
  const cls =
    level === "A"
      ? "bg-red-500/20 text-red-400 border-red-500/30"
      : level === "B"
        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
        : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      风险{level}级
    </span>
  );
}

function typeIcon(t: string) {
  if (t === "equipment") return "🏗️";
  if (t === "pipeline") return "🔧";
  if (t === "component") return "⚙️";
  return "🔩";
}

function typeLabel(t: string) {
  if (t === "equipment") return "设备";
  if (t === "pipeline") return "管道";
  if (t === "component") return "部件";
  return "管件";
}

function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />;
}

/* ------------------------------------------------------------------ */
/*  Data Overview Panel                                                */
/* ------------------------------------------------------------------ */

function DataOverview({
  domains,
  models,
}: {
  domains: DomainStat[];
  models: ModelInfo[];
}) {
  const maxPct = Math.max(...domains.map((d) => parseFloat(d.pct)));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-slate-700 bg-[#0c1322] p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-300">数据域分布（增广后 · 58万条）</h3>
        <div className="space-y-2">
          {domains.map((d) => {
            const pct = parseFloat(d.pct);
            return (
              <div key={d.name} className="flex items-center gap-3">
                <span className="w-16 text-xs text-slate-400">{d.name}</span>
                <div className="flex-1 h-4 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${(pct / maxPct) * 100}%` }}
                  />
                </div>
                <span className="w-12 text-right text-xs font-mono text-slate-400">{d.pct}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="rounded-lg border border-slate-700 bg-[#0c1322] p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-300">AI 模型</h3>
        <div className="space-y-3">
          {models.map((m) => (
            <div key={m.id} className="rounded-md border border-slate-700/60 bg-slate-800/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-200">{m.name}</span>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">{m.accuracy}</span>
              </div>
              <div className="mt-1.5 flex gap-4 text-xs text-slate-500">
                <span>训练数据: {m.training_data}</span>
                <span>覆盖域: {m.domains}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Object Selection Sidebar                                           */
/* ------------------------------------------------------------------ */

function ObjectList({
  objects,
  selectedId,
  onSelect,
}: {
  objects: CorrosionObject[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const grouped: Record<string, CorrosionObject[]> = {};
  objects.forEach((o) => {
    const key = typeLabel(o.type);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(o);
  });

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-slate-700 bg-[#0c1322]">
      <div className="border-b border-slate-700 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-wide text-slate-300">监测对象</h2>
        <p className="mt-0.5 text-xs text-slate-500">{objects.length} 个对象</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="mb-2">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              {group}（{items.length}）
            </div>
            {items.map((obj) => (
              <button
                key={obj.id}
                onClick={() => onSelect(obj.id)}
                className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm transition-colors ${
                  selectedId === obj.id
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-slate-400 hover:bg-slate-700/40 hover:text-slate-200"
                }`}
              >
                <span className="text-base">{typeIcon(obj.type)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{obj.name}</p>
                  <p className="truncate text-[10px] text-slate-500">{obj.material} · {obj.location}</p>
                </div>
              </button>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Analysis Result Panel                                              */
/* ------------------------------------------------------------------ */

function RiskResultsPanel({
  result,
  steps,
  running,
}: {
  result: AnalysisResult | null;
  steps: AgentStep[];
  running: boolean;
}) {
  if (steps.length === 0 && !running && !result) return null;

  return (
    <div className="space-y-4">
      {(steps.length > 0 || running) && (
        <div className="rounded-lg border border-slate-700 bg-[#0c1322] p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-300">Agent 分析流程</h3>
          <div className="space-y-3">
            {steps.map((s, i) => (
              <div key={i}>
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">✓</span>
                  <span className="text-xs font-medium text-emerald-400">{s.label}</span>
                </div>
                <div className="ml-7 mt-1 whitespace-pre-wrap rounded bg-slate-800/60 px-3 py-2 text-xs text-slate-300">
                  {s.result}
                </div>
              </div>
            ))}
            {running && (
              <div className="flex items-center gap-2">
                <Spinner />
                <span className="text-xs text-blue-400">Agent 分析中...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {result && (
        <>
          <div className="rounded-lg border border-slate-700 bg-[#0c1322] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300">风险评估结果</h3>
              <div className="flex items-center gap-3">
                {riskBadge(result.max_risk_level)}
                <span className="text-xs text-slate-500">
                  建议检修周期: <span className="font-semibold text-slate-300">{result.recommended_inspection_interval_months}个月</span>
                </span>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-3">
              {(["A", "B", "C"] as const).map((level) => {
                const count = result.risk_summary[level];
                const colors = {
                  A: "border-red-500/30 bg-red-500/10 text-red-400",
                  B: "border-amber-500/30 bg-amber-500/10 text-amber-400",
                  C: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
                };
                return (
                  <div key={level} className={`rounded-lg border p-3 text-center ${colors[level]}`}>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs opacity-70">风险{level}级</p>
                  </div>
                );
              })}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-xs text-slate-500">
                    <th className="pb-2 pr-4">腐蚀因素</th>
                    <th className="pb-2 pr-4">分类</th>
                    <th className="pb-2 pr-4">风险等级</th>
                    <th className="pb-2 pr-4">腐蚀速率</th>
                    <th className="pb-2 pr-4">触发条件</th>
                    <th className="pb-2">反应机理</th>
                  </tr>
                </thead>
                <tbody>
                  {result.risk_results.map((r, i) => (
                    <tr key={i} className="border-b border-slate-700/40">
                      <td className="py-2 pr-4 font-medium text-slate-200">{r.mechanism}</td>
                      <td className="py-2 pr-4">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] ${
                          r.category === "腐蚀分子" ? "bg-purple-500/20 text-purple-400" : "bg-slate-700 text-slate-400"
                        }`}>{r.category || "腐蚀机理"}</span>
                      </td>
                      <td className="py-2 pr-4">{riskBadge(r.risk_level)}</td>
                      <td className="py-2 pr-4 font-mono text-xs text-slate-400">{r.corrosion_rate_mm_yr} mm/yr</td>
                      <td className="py-2 pr-4 text-xs text-slate-400">{r.condition}</td>
                      <td className="py-2 text-xs text-slate-500">{r.formula}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
            <h3 className="mb-2 text-sm font-semibold text-blue-400">综合结论</h3>
            <p className="text-sm leading-relaxed text-slate-300">{result.conclusion}</p>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function CorrosionPage() {
  const [objects, setObjects] = useState<CorrosionObject[]>(FALLBACK_OBJECTS);
  const [selectedId, setSelectedId] = useState(FALLBACK_OBJECTS[0].id);
  const [domains, setDomains] = useState<DomainStat[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const selected = objects.find((o) => o.id === selectedId) || objects[0];

  useEffect(() => {
    Promise.allSettled([
      fetchAPI<{ data_stats: { augmented: { balanced_domains: DomainStat[] } }; models: ModelInfo[] }>("/api/corrosion/overview"),
      fetchAPI<{ objects: CorrosionObject[] }>("/api/corrosion/objects"),
    ]).then(([ovRes, objRes]) => {
      if (ovRes.status === "fulfilled") {
        setDomains(ovRes.value.data_stats?.augmented?.balanced_domains || []);
        setModels(ovRes.value.models || []);
      }
      if (objRes.status === "fulfilled" && objRes.value.objects?.length) {
        setObjects(objRes.value.objects);
        setSelectedId(objRes.value.objects[0].id);
      }
    });
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setAnalysisResult(null);
    setAgentSteps([]);
    setRunning(false);
    abortRef.current?.abort();
  }, []);

  const runAnalysis = useCallback(() => {
    abortRef.current?.abort();
    setRunning(true);
    setAgentSteps([]);
    setAnalysisResult(null);

    const ctrl = sseStream(
      "/api/corrosion/analyze",
      { object_id: selectedId },
      (event, data) => {
        if (event === "agent_step") {
          const step = data as { agent: string; action: string; result?: string; summary?: string };
          setAgentSteps((prev) => [
            ...prev,
            {
              label: `${step.agent} — ${step.action}`,
              result: step.result || step.summary || JSON.stringify(step),
            },
          ]);
        } else if (event === "complete") {
          const result = data as { results?: Record<string, AnalysisResult> };
          const risk = result?.results?.risk;
          if (risk) {
            setAnalysisResult(risk);
          }
          setRunning(false);
        }
      },
      () => setRunning(false),
    );
    abortRef.current = ctrl;
  }, [selectedId]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0f172a] text-slate-100">
      <ObjectList objects={objects} selectedId={selectedId} onSelect={handleSelect} />

      <main className="flex flex-1 flex-col overflow-y-auto">
        <header className="flex items-center justify-between border-b border-slate-700 bg-[#1e293b] px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">{typeIcon(selected.type)}</span>
            <div>
              <h1 className="text-lg font-semibold">{selected.name}</h1>
              <p className="text-xs text-slate-400">
                {selected.material} · {selected.medium} · {selected.location}
              </p>
            </div>
            <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-400">{selected.id}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span>壁厚 <span className="font-semibold text-slate-200">{selected.wall_thickness_mm}mm</span></span>
            <span className="text-slate-600">|</span>
            <span>投用 <span className="font-semibold text-slate-200">{selected.install_date}</span></span>
          </div>
        </header>

        <div className="flex-1 space-y-5 p-6">
          {domains.length > 0 && <DataOverview domains={domains} models={models} />}

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-700 bg-[#0c1322] px-4 py-3">
              <p className="text-[11px] text-slate-500">对象类型</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-200">{typeLabel(selected.type)}</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-[#0c1322] px-4 py-3">
              <p className="text-[11px] text-slate-500">材质</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-200">{selected.material}</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-[#0c1322] px-4 py-3">
              <p className="text-[11px] text-slate-500">接触介质</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-200">{selected.medium}</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-[#0c1322] px-4 py-3">
              <p className="text-[11px] text-slate-500">壁厚</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-200">{selected.wall_thickness_mm} mm</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={runAnalysis}
              disabled={running}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? (
                <span className="flex items-center gap-2"><Spinner /> 分析中...</span>
              ) : (
                "智能防腐分析"
              )}
            </button>
            {analysisResult && !running && (
              <span className="text-xs text-emerald-400">
                ✓ 分析完成 — 最高风险{analysisResult.max_risk_level}级，建议{analysisResult.recommended_inspection_interval_months}个月检修
              </span>
            )}
          </div>

          <RiskResultsPanel result={analysisResult} steps={agentSteps} running={running} />
        </div>
      </main>
    </div>
  );
}
