"use client";

import Link from "next/link";

const EVOLUTION_SCORES = [
  0.55, 0.58, 0.61, 0.59, 0.64, 0.68, 0.71, 0.74, 0.76, 0.79, 0.82, 0.85,
  0.88, 0.9, 0.92,
];

const ONLINE_STEPS = [
  "信号感知",
  "策略匹配",
  "安全门控",
  "执行",
  "资产沉淀",
];
const OFFLINE_STEPS = [
  "数据回放",
  "策略变异",
  "沙盒仿真",
  "评分",
  "策略入库",
];

const SAFETY_LOG = [
  { id: "S-014", passed: true, reason: "收率预测达标" },
  { id: "S-013", passed: false, reason: "能耗超限" },
  { id: "S-012", passed: true, reason: "通过全项检验" },
];

export default function EvolutionPage() {
  const maxScore = Math.max(...EVOLUTION_SCORES);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">自我进化引擎</h1>
            <p className="mt-1 text-sm text-slate-400">
              在线演进 + 离线进化 双轮驱动
            </p>
          </div>
          <Link
            href="/cockpit"
            className="text-sm text-blue-500 hover:text-blue-400"
          >
            返回总驾驶舱 ←
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 p-6">
        {/* Evolution Timeline Chart */}
        <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-200">
            进化历程
          </h2>
          <div className="flex h-48 items-end gap-1">
            {EVOLUTION_SCORES.map((score, i) => {
              const pct = (score / maxScore) * 100;
              const ratio = score / 1.0;
              const r = Math.round(220 + (1 - ratio) * 35);
              const g = Math.round(38 + ratio * 180);
              const color = `rgb(${r},${g},38)`;
              return (
                <div
                  key={i}
                  className="group flex flex-1 flex-col items-center"
                >
                  <div className="absolute -top-7 hidden rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-200 group-hover:block">
                    {score.toFixed(2)}
                  </div>
                  <div
                    className="w-full rounded-t transition-all"
                    style={{
                      height: `${pct}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-xs text-slate-500">
            <span>Generation 1</span>
            <span>0.0</span>
            <span>1.0</span>
            <span>Generation 15</span>
          </div>
        </section>

        {/* Best Strategy Card */}
        <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-200">
            当前最优策略
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-slate-900 px-4 py-3">
              <p className="text-xs text-slate-500">reactor_temp</p>
              <p className="font-mono font-semibold text-slate-200">
                515.2°C
              </p>
            </div>
            <div className="rounded-lg bg-slate-900 px-4 py-3">
              <p className="text-xs text-slate-500">catalyst_ratio</p>
              <p className="font-mono font-semibold text-slate-200">0.074</p>
            </div>
            <div className="rounded-lg bg-slate-900 px-4 py-3">
              <p className="text-xs text-slate-500">pressure</p>
              <p className="font-mono font-semibold text-slate-200">
                2.82 MPa
              </p>
            </div>
            <div className="rounded-lg bg-slate-900 px-4 py-3">
              <p className="text-xs text-slate-500">residence_time</p>
              <p className="font-mono font-semibold text-slate-200">
                5.48 min
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-4">
            <span className="rounded bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-400">
              得分 0.92
            </span>
            <span className="rounded bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-400">
              第 15 代
            </span>
          </div>
        </section>

        {/* Dual-Track Mechanism */}
        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h3 className="mb-4 font-semibold text-blue-400">在线演进</h3>
            <div className="flex flex-wrap items-center gap-2">
              {ONLINE_STEPS.map((step, i) => (
                <span key={step}>
                  <span className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-slate-200">
                    {step}
                  </span>
                  {i < ONLINE_STEPS.length - 1 && (
                    <span className="mx-1 text-slate-500">→</span>
                  )}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h3 className="mb-4 font-semibold text-blue-400">离线进化</h3>
            <div className="flex flex-wrap items-center gap-2">
              {OFFLINE_STEPS.map((step, i) => (
                <span key={step}>
                  <span className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-slate-200">
                    {step}
                  </span>
                  {i < OFFLINE_STEPS.length - 1 && (
                    <span className="mx-1 text-slate-500">→</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Safety Gate Log */}
        <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-200">
            安全门控日志
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600 text-left text-slate-400">
                  <th className="pb-2 pr-4">策略ID</th>
                  <th className="pb-2 pr-4">结果</th>
                  <th className="pb-2">原因</th>
                </tr>
              </thead>
              <tbody>
                {SAFETY_LOG.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-700/50 text-slate-300"
                  >
                    <td className="py-2 pr-4 font-mono">{row.id}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          row.passed
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }
                      >
                        {row.passed ? "通过" : "拦截"}
                      </span>
                    </td>
                    <td className="py-2">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
