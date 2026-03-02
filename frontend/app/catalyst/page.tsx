"use client";

import { useState } from "react";
import Link from "next/link";

const STEPS = [
  { label: "视觉模型分析图像特征...", delay: 2000 },
  { label: "知识图谱关联推理...", delay: 2000 },
  { label: "生成研发结论报告...", delay: 1000 },
];

const REFERENCES = [
  "Wang et al. FCC催化剂孔径分布对催化活性的影响, 2023",
  "Li et al. Y型分子筛稀土改性机理研究, 2024",
];

const GRAPH_NODES = [
  { id: "fcc", label: "FCC催化剂", color: "bg-blue-500" },
  { id: "y", label: "Y型分子筛", color: "bg-emerald-500" },
  { id: "re", label: "稀土改性", color: "bg-amber-500" },
  { id: "matrix", label: "基质材料", color: "bg-purple-500" },
  { id: "active", label: "催化活性", color: "bg-rose-500" },
  { id: "heavy", label: "抗重金属", color: "bg-cyan-500" },
];

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
  );
}

export default function CatalystPage() {
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [complete, setComplete] = useState(false);

  const handleAnalyze = () => {
    setLoading(true);
    setStepIndex(0);
    setComplete(false);
    let cumulative = 0;
    STEPS.forEach((s, i) => {
      cumulative += s.delay;
      setTimeout(() => {
        setStepIndex(i + 1);
        if (i === STEPS.length - 1) {
          setTimeout(() => {
            setLoading(false);
            setComplete(true);
          }, 100);
        }
      }, cumulative);
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">催化剂研发助手</h1>
          <Link
            href="/cockpit"
            className="text-sm text-blue-500 hover:text-blue-400"
          >
            返回总驾驶舱 ←
          </Link>
        </div>
      </header>

      <main className="grid gap-6 p-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-200">
              上传电镜图像
            </h2>
            <div className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-600 bg-slate-900/50 transition hover:border-slate-500">
              <span className="text-4xl text-slate-500">📷</span>
              <p className="mt-2 text-sm text-slate-400">
                拖拽或点击上传电镜图像
              </p>
              <p className="text-xs text-slate-500">支持 JPG、PNG</p>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="mt-4 w-full rounded-lg bg-blue-500 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner /> 分析中...
                </span>
              ) : (
                "开始分析"
              )}
            </button>

            {loading && (
              <div className="mt-4 space-y-3">
                {STEPS.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {i < stepIndex ? (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                        ✓
                      </span>
                    ) : i === stepIndex ? (
                      <span className="shrink-0">
                        <Spinner />
                      </span>
                    ) : (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-600 text-xs text-slate-500">
                        {i + 1}
                      </span>
                    )}
                    <span
                      className={
                        i < stepIndex
                          ? "text-emerald-400"
                          : i === stepIndex
                            ? "text-blue-400"
                            : "text-slate-500"
                      }
                    >
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {complete && !loading && (
              <div className="mt-6 space-y-4 rounded-lg border border-slate-600 bg-slate-900/50 p-4">
                <div>
                  <h3 className="mb-2 font-medium text-slate-300">
                    识别特征
                  </h3>
                  <p className="text-sm text-slate-400">
                    颗粒尺寸 ~2.5μm · 孔径 8-12nm · BET比表面积 ~280
                    m²/g
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 font-medium text-slate-300">
                    性能预测
                  </h3>
                  <p className="text-sm text-slate-400">
                    催化活性 高 · 选择性 中等 · 稳定性 良好
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 font-medium text-slate-300">
                    文献参考
                  </h3>
                  <ul className="space-y-1 text-sm text-slate-400">
                    {REFERENCES.map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Column - Knowledge Graph */}
        <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-200">
            催化剂知识图谱
          </h2>
          <div className="relative h-[320px] w-full">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 160">
              <line x1="100" y1="20" x2="40" y2="56" stroke="#475569" strokeWidth="1" />
              <line x1="100" y1="20" x2="136" y2="56" stroke="#475569" strokeWidth="1" />
              <line x1="100" y1="20" x2="100" y2="83" stroke="#475569" strokeWidth="1" />
              <line x1="40" y1="56" x2="20" y2="125" stroke="#475569" strokeWidth="1" />
              <line x1="40" y1="56" x2="100" y2="125" stroke="#475569" strokeWidth="1" />
              <line x1="136" y1="56" x2="20" y2="125" stroke="#475569" strokeWidth="1" />
              <line x1="100" y1="83" x2="176" y2="125" stroke="#475569" strokeWidth="1" />
            </svg>
            <div className="absolute left-1/2 top-[12%] -translate-x-1/2 -translate-y-1/2">
              <div className="rounded-full bg-blue-500 px-3 py-1.5 text-xs font-medium text-white">
                FCC催化剂
              </div>
            </div>
            <div className="absolute left-[20%] top-[35%] -translate-x-1/2 -translate-y-1/2">
              <div className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white">
                Y型分子筛
              </div>
            </div>
            <div className="absolute left-[68%] top-[35%] -translate-x-1/2 -translate-y-1/2">
              <div className="rounded-full bg-amber-500 px-3 py-1.5 text-xs font-medium text-white">
                稀土改性
              </div>
            </div>
            <div className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2">
              <div className="rounded-full bg-purple-500 px-3 py-1.5 text-xs font-medium text-white">
                基质材料
              </div>
            </div>
            <div className="absolute left-[10%] top-[78%] -translate-x-1/2 -translate-y-1/2">
              <div className="rounded-full bg-rose-500 px-3 py-1.5 text-xs font-medium text-white">
                催化活性
              </div>
            </div>
            <div className="absolute left-[88%] top-[78%] -translate-x-1/2 -translate-y-1/2">
              <div className="rounded-full bg-cyan-500 px-3 py-1.5 text-xs font-medium text-white">
                抗重金属
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
