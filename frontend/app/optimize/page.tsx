"use client";

import { useState } from "react";
import Link from "next/link";

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
  );
}

interface RecommendResult {
  recommended_params?: Record<string, number>;
  predicted_yield_pct?: number;
  predicted_energy_kwh?: number;
  strategy_source?: string;
  strategy_generation?: number;
  score?: number;
}

interface ComparisonResult {
  before: Record<string, number>;
  after: Record<string, number>;
  improvements: { yield_increase_pct: number; energy_saving_pct: number; cost_reduction_pct: number };
  description: string;
}

/** 本地模拟寻优：根据当前参数生成推荐与对比数据，不请求后端 */
function mockOptimize(current: { temp: number; catalyst: number; pressure: number; residence: number }): {
  recommend: RecommendResult;
  comparison: ComparisonResult;
} {
  // 模拟推荐参数：在当前值基础上微调
  const afterTemp = Math.round(current.temp + (Math.random() * 20 - 5));
  const afterCatalyst = Math.round((current.catalyst + (Math.random() * 0.02 - 0.005)) * 100) / 100;
  const afterPressure = Math.round((current.pressure + (Math.random() * 0.4 - 0.1)) * 10) / 10;
  const afterResidence = Math.round((current.residence + (Math.random() * 0.4 - 0.1)) * 10) / 10;

  const beforeYield = 82 + (current.temp - 500) * 0.02 + current.catalyst * 50;
  const afterYield = Math.min(98, beforeYield + 2 + Math.random() * 4);
  const beforeEnergy = 120 - current.pressure * 2;
  const afterEnergy = Math.max(85, beforeEnergy - 5 - Math.random() * 8);

  const yieldIncrease = Math.round((afterYield - beforeYield) * 10) / 10;
  const energySaving = Math.round((1 - afterEnergy / beforeEnergy) * 1000) / 10;

  return {
    recommend: {
      recommended_params: {
        reactor_temp: afterTemp,
        catalyst_ratio: afterCatalyst,
        pressure: afterPressure,
        residence_time: afterResidence,
      },
      predicted_yield_pct: afterYield,
      predicted_energy_kwh: afterEnergy,
      strategy_source: "本地模拟",
      strategy_generation: 1,
      score: 0.85 + Math.random() * 0.1,
    },
    comparison: {
      before: {
        reactor_temp: current.temp,
        catalyst_ratio: current.catalyst,
        pressure: current.pressure,
        residence_time: current.residence,
        yield_pct: Math.round(beforeYield * 10) / 10,
        energy_kwh_per_ton: Math.round(beforeEnergy * 10) / 10,
      },
      after: {
        reactor_temp: afterTemp,
        catalyst_ratio: afterCatalyst,
        pressure: afterPressure,
        residence_time: afterResidence,
        yield_pct: Math.round(afterYield * 10) / 10,
        energy_kwh_per_ton: Math.round(afterEnergy * 10) / 10,
      },
      improvements: {
        yield_increase_pct: yieldIncrease,
        energy_saving_pct: energySaving,
        cost_reduction_pct: Math.round((yieldIncrease * 0.3 + energySaving * 0.2) * 10) / 10,
      },
      description: `基于当前工艺参数，本地模拟给出优化建议：温度 ${afterTemp}°C、催化剂配比 ${afterCatalyst}、压力 ${afterPressure} MPa、停留时间 ${afterResidence} min。模拟收率提升约 ${yieldIncrease}%，能耗降低约 ${energySaving}%。（此为前端演示数据，未调用后端）`,
    },
  };
}

export default function OptimizePage() {
  const [params, setParams] = useState({ temp: 510, catalyst: 0.08, pressure: 2.5, residence: 5.0 });
  const [loading, setLoading] = useState(false);
  const [recommend, setRecommend] = useState<RecommendResult | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState("");

  const handleOptimize = () => {
    setLoading(true);
    setError("");
    setRecommend(null);
    setComparison(null);
    // 模拟短暂延迟后使用本地数据展示，不请求后端
    window.setTimeout(() => {
      const { recommend: rec, comparison: cmp } = mockOptimize(params);
      setRecommend(rec);
      setComparison(cmp);
      setLoading(false);
    }, 600);
  };

  const recParams = recommend?.recommended_params;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">工艺寻优驾驶舱</h1>
          <Link href="/cockpit" className="text-sm text-blue-500 hover:text-blue-400">返回总驾驶舱 ←</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 p-6">
        <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-200">当前工艺参数</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { key: "temp", label: "反应温度 (°C)", step: 1 },
              { key: "catalyst", label: "催化剂配比", step: 0.01 },
              { key: "pressure", label: "反应压力 (MPa)", step: 0.1 },
              { key: "residence", label: "停留时间 (min)", step: 0.1 },
            ].map(({ key, label, step }) => (
              <div key={key}>
                <label className="mb-1 block text-xs text-slate-400">{label}</label>
                <input
                  type="number"
                  step={step}
                  value={params[key as keyof typeof params]}
                  onChange={(e) => setParams((p) => ({ ...p, [key]: +e.target.value }))}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleOptimize}
            disabled={loading}
            className="mt-6 rounded-lg bg-blue-500 px-6 py-2.5 font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <span className="flex items-center gap-2"><Spinner /> 寻优中...</span> : "开始寻优"}
          </button>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </section>

        {recommend && !loading && (
          <>
            <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-200">推荐参数与预测</h2>
              {recParams && (
                <div className="mb-4 space-y-1 text-sm text-slate-300">
                  <p>
                    推荐: 温度 {recParams.reactor_temp ?? "-"}°C · 催化剂 {recParams.catalyst_ratio ?? "-"} · 压力 {recParams.pressure ?? "-"} MPa · 停留时间 {recParams.residence_time ?? "-"} min
                  </p>
                  <p className="text-blue-400">
                    来自{recommend.strategy_source || "进化引擎"}第{recommend.strategy_generation ?? "?"}代最优策略 · 得分 {recommend.score?.toFixed(2) ?? "-"}
                  </p>
                </div>
              )}
              {comparison && (
                <div className="flex gap-6">
                  <div className="rounded-lg bg-emerald-500/20 px-6 py-4">
                    <span className="text-3xl font-bold text-emerald-400">+{comparison.improvements.yield_increase_pct}%</span>
                    <span className="ml-2 text-slate-200">收率提升</span>
                  </div>
                  <div className="rounded-lg bg-emerald-500/20 px-6 py-4">
                    <span className="text-3xl font-bold text-emerald-400">-{comparison.improvements.energy_saving_pct}%</span>
                    <span className="ml-2 text-slate-200">能耗降低</span>
                  </div>
                </div>
              )}
            </section>

            {comparison && (
              <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
                <h2 className="mb-4 text-lg font-semibold text-slate-200">优化前后对比</h2>
                <p className="mb-4 text-sm text-slate-400">{comparison.description}</p>
                <div className="grid grid-cols-2 gap-6">
                  <div className="rounded-lg border border-slate-600 bg-slate-900 p-4">
                    <h3 className="mb-3 font-medium text-slate-400">优化前</h3>
                    <p className="text-xs text-slate-500">
                      温度 {comparison.before.reactor_temp}°C · 催化剂 {comparison.before.catalyst_ratio} · 压力 {comparison.before.pressure} MPa
                    </p>
                    <div className="mt-3 space-y-1">
                      <p className="text-slate-300">收率 {comparison.before.yield_pct}%</p>
                      <p className="text-slate-300">能耗 {comparison.before.energy_kwh_per_ton} kWh/吨</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
                    <h3 className="mb-3 font-medium text-emerald-400">优化后</h3>
                    <p className="text-xs text-slate-400">
                      温度 {comparison.after.reactor_temp}°C · 催化剂 {comparison.after.catalyst_ratio} · 压力 {comparison.after.pressure} MPa
                    </p>
                    <div className="mt-3 space-y-1">
                      <p className="font-semibold text-emerald-400">收率 {comparison.after.yield_pct}% ↑</p>
                      <p className="font-semibold text-emerald-400">能耗 {comparison.after.energy_kwh_per_ton} kWh/吨 ↓</p>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
