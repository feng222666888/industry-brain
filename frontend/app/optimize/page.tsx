"use client";

import { useState } from "react";
import Link from "next/link";

const DEFAULT_PARAMS = {
  temp: 510,
  catalyst: 0.08,
  pressure: 2.5,
  residence: 5.0,
};
const RECOMMENDED_PARAMS = {
  temp: 515,
  catalyst: 0.074,
  pressure: 2.82,
  residence: 5.48,
};

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
  );
}

export default function OptimizePage() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [loading, setLoading] = useState(false);
  const [optimized, setOptimized] = useState(false);

  const handleOptimize = () => {
    setLoading(true);
    setOptimized(false);
    setTimeout(() => {
      setLoading(false);
      setOptimized(true);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">工艺寻优驾驶舱</h1>
          <Link
            href="/cockpit"
            className="text-sm text-blue-500 hover:text-blue-400"
          >
            返回总驾驶舱 ←
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 p-6">
        {/* Current Process Parameters */}
        <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-200">
            当前工艺参数
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                反应温度 (°C)
              </label>
              <input
                type="number"
                value={params.temp}
                onChange={(e) =>
                  setParams((p) => ({ ...p, temp: +e.target.value }))
                }
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                催化剂配比
              </label>
              <input
                type="number"
                step="0.01"
                value={params.catalyst}
                onChange={(e) =>
                  setParams((p) => ({ ...p, catalyst: +e.target.value }))
                }
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                反应压力 (MPa)
              </label>
              <input
                type="number"
                step="0.1"
                value={params.pressure}
                onChange={(e) =>
                  setParams((p) => ({ ...p, pressure: +e.target.value }))
                }
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                停留时间 (min)
              </label>
              <input
                type="number"
                step="0.1"
                value={params.residence}
                onChange={(e) =>
                  setParams((p) => ({ ...p, residence: +e.target.value }))
                }
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            onClick={handleOptimize}
            disabled={loading}
            className="mt-6 rounded-lg bg-blue-500 px-6 py-2.5 font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner /> 寻优中...
              </span>
            ) : (
              "开始寻优"
            )}
          </button>
        </section>

        {/* Optimization Results */}
        {optimized && !loading && (
          <>
            <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-200">
                推荐参数与预测
              </h2>
              <div className="mb-4 space-y-1 text-sm text-slate-300">
                <p>
                  推荐: 温度 {RECOMMENDED_PARAMS.temp}°C · 催化剂{" "}
                  {RECOMMENDED_PARAMS.catalyst} · 压力{" "}
                  {RECOMMENDED_PARAMS.pressure} MPa · 停留时间{" "}
                  {RECOMMENDED_PARAMS.residence} min
                </p>
                <p className="text-blue-400">
                  来自离线进化第15代最优策略
                </p>
              </div>
              <div className="flex gap-6">
                <div className="rounded-lg bg-emerald-500/20 px-6 py-4">
                  <span className="text-3xl font-bold text-emerald-400">
                    +2.3%
                  </span>
                  <span className="ml-2 text-slate-200">收率提升</span>
                </div>
                <div className="rounded-lg bg-emerald-500/20 px-6 py-4">
                  <span className="text-3xl font-bold text-emerald-400">
                    -8.5%
                  </span>
                  <span className="ml-2 text-slate-200">能耗降低</span>
                </div>
              </div>
            </section>

            {/* Before/After Comparison */}
            <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-200">
                优化前后对比
              </h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="rounded-lg border border-slate-600 bg-slate-900 p-4">
                  <h3 className="mb-3 font-medium text-slate-400">优化前</h3>
                  <p className="text-xs text-slate-500">
                    温度 {params.temp}°C · 催化剂 {params.catalyst} · 压力{" "}
                    {params.pressure} MPa · 停留 {params.residence} min
                  </p>
                  <div className="mt-3 space-y-1">
                    <p className="text-slate-300">收率 72.5%</p>
                    <p className="text-slate-300">能耗 320 kWh</p>
                  </div>
                </div>
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
                  <h3 className="mb-3 font-medium text-emerald-400">优化后</h3>
                  <p className="text-xs text-slate-400">
                    温度 {RECOMMENDED_PARAMS.temp}°C · 催化剂{" "}
                    {RECOMMENDED_PARAMS.catalyst} · 压力{" "}
                    {RECOMMENDED_PARAMS.pressure} MPa · 停留{" "}
                    {RECOMMENDED_PARAMS.residence} min
                  </p>
                  <div className="mt-3 space-y-1">
                    <p className="font-semibold text-emerald-400">收率 74.8% ↑</p>
                    <p className="font-semibold text-emerald-400">
                      能耗 293 kWh ↓
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
