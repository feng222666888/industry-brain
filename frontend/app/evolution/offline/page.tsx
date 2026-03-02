"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "../../../lib/api";

interface Generation {
  generation: number;
  best_score: number;
  strategy_count?: number;
}

interface Strategy {
  strategy_id: string;
  score: number;
  generation: number;
  params: Record<string, number>;
  data_quality_score?: number;
}

interface Convergence {
  converged: boolean;
  convergenceGen: number | null;
  threshold: number;
  diversity: number;
}

const STEPS = ["数据回放", "策略变异", "沙盒仿真", "评分择优", "策略入库"];

export default function EvolutionOfflinePage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [convergence, setConvergence] = useState<Convergence>({ converged: false, convergenceGen: null, threshold: 0.001, diversity: 0 });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.allSettled([
      fetchAPI<{ generations: Generation[] }>("/api/evolution/timeline"),
      fetchAPI<{ strategies: Strategy[] }>("/api/evolution/strategies?min_score=0"),
      fetchAPI<Convergence>("/api/evolution/offline/convergence"),
    ]).then(([gRes, sRes, cRes]) => {
      if (gRes.status === "fulfilled") setGenerations(gRes.value.generations || []);
      if (sRes.status === "fulfilled") setStrategies(sRes.value.strategies || []);
      if (cRes.status === "fulfilled") setConvergence(cRes.value);
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRun = () => {
    setRunning(true);
    fetchAPI("/api/evolution/offline/run", { method: "POST", body: JSON.stringify({ generations: 5 }) })
      .then(() => loadData())
      .catch(() => {})
      .finally(() => setRunning(false));
  };

  const scores = generations.map((g) => g.best_score);
  const maxScore = scores.length > 0 ? Math.max(...scores, 0.01) : 1;
  const best = strategies.length > 0 ? strategies.reduce((a, b) => (a.score >= b.score ? a : b)) : null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">离线进化</h1>
            <p className="mt-1 text-sm text-slate-400">遗传算法 · 沙盒仿真 · 策略择优</p>
          </div>
          <button
            onClick={handleRun}
            disabled={running}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            {running ? "进化中…" : "触发 5 代进化"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-3">
                <span className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-blue-400">{s}</span>
                {i < STEPS.length - 1 && <span className="text-xl text-slate-600">→</span>}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-200">
            进化历程 <span className="ml-2 text-sm font-normal text-slate-400">{generations.length} 代</span>
          </h2>
          {scores.length > 0 ? (
            <>
              <div className="flex h-48 items-end gap-1">
                {scores.map((score, i) => {
                  const pct = (score / maxScore) * 100;
                  const ratio = score / 1.0;
                  const r = Math.round(220 + (1 - ratio) * 35);
                  const g = Math.round(38 + ratio * 180);
                  return (
                    <div key={i} className="group relative flex flex-1 flex-col items-center">
                      <div className="absolute -top-7 z-10 hidden rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-200 group-hover:block">
                        {score.toFixed(3)}
                      </div>
                      <div className="w-full rounded-t transition-all" style={{ height: `${pct}%`, backgroundColor: `rgb(${r},${g},38)` }} />
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>Generation 1</span>
                <span>Generation {generations.length}</span>
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">{loading ? "加载中…" : "暂无进化数据"}</p>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          {best && (
            <section className="rounded-xl border border-emerald-800 bg-slate-800 p-6">
              <h2 className="mb-3 text-sm font-medium text-emerald-400">当前最优策略</h2>
              <div className="space-y-2">
                {Object.entries(best.params).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-sm text-slate-400">{k}</span>
                    <span className="font-mono text-sm text-slate-200">{typeof v === "number" ? v.toFixed(3) : v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">得分 {best.score.toFixed(3)}</span>
                <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">第 {best.generation} 代</span>
                {best.data_quality_score !== undefined && (
                  <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">质量 {best.data_quality_score.toFixed(2)}</span>
                )}
              </div>
            </section>
          )}

          <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h2 className="mb-3 text-sm font-medium text-slate-300">收敛分析</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">已收敛</span>
                <span className={convergence.converged ? "text-emerald-400" : "text-amber-400"}>
                  {convergence.converged ? "是" : "否"}
                </span>
              </div>
              {convergence.convergenceGen && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">收敛代数</span>
                  <span className="text-slate-200">第 {convergence.convergenceGen} 代</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">阈值</span>
                <span className="font-mono text-slate-200">{convergence.threshold}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">种群多样性</span>
                <span className="font-mono text-slate-200">{convergence.diversity.toFixed(4)}</span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h2 className="mb-3 text-sm font-medium text-slate-300">策略统计</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">策略总数</span>
                <span className="text-slate-200">{strategies.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">最高分</span>
                <span className="font-mono text-emerald-400">{best ? best.score.toFixed(3) : "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">平均分</span>
                <span className="font-mono text-slate-200">
                  {strategies.length > 0 ? (strategies.reduce((s, x) => s + x.score, 0) / strategies.length).toFixed(3) : "—"}
                </span>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-slate-700 bg-slate-800">
          <h2 className="border-b border-slate-700 px-4 py-3 text-sm font-medium text-slate-300">策略资产库</h2>
          {strategies.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-slate-400">
                    <th className="px-4 py-2 font-medium">策略ID</th>
                    <th className="px-4 py-2 font-medium">代数</th>
                    <th className="px-4 py-2 font-medium">得分</th>
                    <th className="px-4 py-2 font-medium">质量分</th>
                    <th className="px-4 py-2 font-medium">参数</th>
                  </tr>
                </thead>
                <tbody>
                  {strategies.slice(0, 20).map((s) => (
                    <tr key={s.strategy_id} className="border-b border-slate-700/50">
                      <td className="px-4 py-2 font-mono text-xs text-blue-400">{s.strategy_id}</td>
                      <td className="px-4 py-2">{s.generation}</td>
                      <td className="px-4 py-2 font-mono text-emerald-400">{s.score.toFixed(3)}</td>
                      <td className="px-4 py-2 font-mono">{s.data_quality_score?.toFixed(2) ?? "—"}</td>
                      <td className="px-4 py-2 text-xs text-slate-400">
                        {Object.entries(s.params).map(([k, v]) => `${k}=${typeof v === "number" ? v.toFixed(1) : v}`).join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-4 py-12 text-center text-sm text-slate-500">{loading ? "加载中…" : "暂无策略"}</p>
          )}
        </section>
      </main>
    </div>
  );
}
