"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "../../../lib/api";

interface StepStatus {
  step: string;
  label: string;
  count: number;
  lastResult?: string;
}

interface OnlineLog {
  timestamp: string;
  signal_source: string;
  signal_type: string;
  strategy_id: string;
  gate_result: "pass" | "degrade" | "block";
  quality_weight: number;
  improvement: number;
}

interface GateStats {
  pass: number;
  degrade: number;
  block: number;
  minScoreThreshold: number;
  minQualityThreshold: number;
}

const STEPS = ["信号感知", "策略匹配", "安全门控", "执行", "资产沉淀"];

export default function EvolutionOnlinePage() {
  const [stepStatus, setStepStatus] = useState<StepStatus[]>(STEPS.map((s) => ({ step: s, label: s, count: 0 })));
  const [logs, setLogs] = useState<OnlineLog[]>([]);
  const [gate, setGate] = useState<GateStats>({ pass: 0, degrade: 0, block: 0, minScoreThreshold: 0.5, minQualityThreshold: 0.5 });
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.allSettled([
      fetchAPI<{ steps: StepStatus[] }>("/api/evolution/online/status"),
      fetchAPI<{ logs: OnlineLog[] }>("/api/evolution/online/logs"),
      fetchAPI<GateStats>("/api/evolution/online/gate-stats"),
    ]).then(([sRes, lRes, gRes]) => {
      if (sRes.status === "fulfilled" && sRes.value.steps?.length) setStepStatus(sRes.value.steps);
      if (lRes.status === "fulfilled") setLogs(lRes.value.logs || []);
      if (gRes.status === "fulfilled") setGate(gRes.value);
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTrigger = () => {
    setTriggering(true);
    fetchAPI("/api/evolution/online/trigger", { method: "POST", body: JSON.stringify({ scenario_id: "process_optimization", industry_id: "petrochemical" }) })
      .then(() => { loadData(); })
      .catch(() => {})
      .finally(() => setTriggering(false));
  };

  const gateTotal = gate.pass + gate.degrade + gate.block || 1;
  const gateColors = { pass: "bg-emerald-500", degrade: "bg-amber-500", block: "bg-red-500" };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">在线演进</h1>
            <p className="mt-1 text-sm text-slate-400">实时信号驱动 · 五步进化流水线</p>
          </div>
          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            {triggering ? "执行中…" : "触发在线演进"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {stepStatus.map((s, i) => (
              <div key={s.step} className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-900 px-4 py-3 text-center min-w-[100px]">
                  <p className="text-sm font-medium text-blue-400">{s.label}</p>
                  <p className="mt-1 text-lg font-bold text-slate-200">{s.count}</p>
                  {s.lastResult && <p className="text-[10px] text-slate-500">{s.lastResult}</p>}
                </div>
                {i < stepStatus.length - 1 && <span className="text-xl text-slate-600">→</span>}
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-xl border border-slate-700 bg-slate-800 lg:col-span-2">
            <h2 className="border-b border-slate-700 px-4 py-3 text-sm font-medium text-slate-300">在线执行日志</h2>
            {logs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left text-slate-400">
                      <th className="px-4 py-2 font-medium">时间</th>
                      <th className="px-4 py-2 font-medium">信号来源</th>
                      <th className="px-4 py-2 font-medium">策略</th>
                      <th className="px-4 py-2 font-medium">门控</th>
                      <th className="px-4 py-2 font-medium">质量权重</th>
                      <th className="px-4 py-2 font-medium">提升</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l, i) => (
                      <tr key={i} className="border-b border-slate-700/50">
                        <td className="px-4 py-2 text-xs text-slate-500">{l.timestamp}</td>
                        <td className="px-4 py-2">{l.signal_source}</td>
                        <td className="px-4 py-2 font-mono text-xs text-blue-400">{l.strategy_id}</td>
                        <td className="px-4 py-2">
                          <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                            l.gate_result === "pass" ? "bg-emerald-500/20 text-emerald-400"
                              : l.gate_result === "degrade" ? "bg-amber-500/20 text-amber-400"
                              : "bg-red-500/20 text-red-400"
                          }`}>
                            {l.gate_result}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-mono">{l.quality_weight.toFixed(2)}</td>
                        <td className="px-4 py-2 font-mono text-emerald-400">+{(l.improvement * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-4 py-12 text-center text-sm text-slate-500">{loading ? "加载中…" : "暂无执行日志"}</p>
            )}
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <h2 className="mb-4 text-sm font-medium text-slate-300">安全门控统计</h2>
            <div className="mb-4 h-4 flex overflow-hidden rounded bg-slate-700">
              <div className={`${gateColors.pass}`} style={{ width: `${(gate.pass / gateTotal) * 100}%` }} />
              <div className={`${gateColors.degrade}`} style={{ width: `${(gate.degrade / gateTotal) * 100}%` }} />
              <div className={`${gateColors.block}`} style={{ width: `${(gate.block / gateTotal) * 100}%` }} />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-emerald-400">Pass</span><span>{gate.pass}</span></div>
              <div className="flex justify-between"><span className="text-amber-400">Degrade</span><span>{gate.degrade}</span></div>
              <div className="flex justify-between"><span className="text-red-400">Block</span><span>{gate.block}</span></div>
            </div>
            <div className="mt-4 border-t border-slate-700 pt-4 text-xs text-slate-500">
              <p>最低分数阈值: {gate.minScoreThreshold}</p>
              <p>最低质量阈值: {gate.minQualityThreshold}</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
