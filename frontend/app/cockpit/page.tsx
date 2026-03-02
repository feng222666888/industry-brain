"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchAPI } from "../../lib/api";

function formatSimTime(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function dotColor(type: "success" | "warning" | "info") {
  if (type === "success") return "bg-emerald-500";
  if (type === "warning") return "bg-amber-500";
  return "bg-blue-500";
}

interface Stats {
  deviceOnline: string;
  yieldGain: string;
  agentCount: string;
  evolutionGen: string;
  deviceWarnings: number;
}

interface Activity {
  msg: string;
  time: string;
  type: "success" | "warning" | "info";
}

const FALLBACK_ACTIVITIES: Activity[] = [
  { msg: "监测Agent 检测到 DEV-PUMP-001 振动异常", time: "2分钟前", type: "warning" },
  { msg: "诊断Agent 完成 轴承外圈故障诊断", time: "5分钟前", type: "success" },
  { msg: "工艺Agent 生成优化策略", time: "12分钟前", type: "info" },
  { msg: "催化剂Agent 完成电镜图像分析", time: "18分钟前", type: "info" },
  { msg: "维修Agent 推送SOP至工单系统", time: "25分钟前", type: "success" },
];

export default function CockpitPage() {
  const [simTime, setSimTime] = useState(new Date());
  const [stats, setStats] = useState<Stats>({
    deviceOnline: "96.8%",
    yieldGain: "+¥285万/月",
    agentCount: "7个活跃",
    evolutionGen: "—",
    deviceWarnings: 2,
  });
  const [activities, setActivities] = useState<Activity[]>(FALLBACK_ACTIVITIES);

  useEffect(() => {
    const t = setInterval(() => setSimTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    Promise.allSettled([
      fetchAPI<{ generations: { generation: number; best_score: number }[] }>("/api/evolution/timeline"),
      fetchAPI<{ events: Record<string, unknown>[]; count: number }>("/api/governance/audit-events?limit=5"),
    ]).then(([tlResult, auditResult]) => {
      if (tlResult.status === "fulfilled") {
        const gens = tlResult.value.generations || [];
        if (gens.length > 0) {
          setStats((prev) => ({ ...prev, evolutionGen: `第${gens.length}代` }));
        }
      }
      if (auditResult.status === "fulfilled") {
        const events = auditResult.value.events || [];
        if (events.length > 0) {
          const mapped: Activity[] = events.map((e) => ({
            msg: `${e.event_type || "事件"}: ${(e.selected_sources as string[])?.join(", ") || "pipeline"} — 新增${e.new_records ?? 0}条`,
            time: typeof e.timestamp === "string" ? e.timestamp.slice(11, 16) : "",
            type: "info" as const,
          }));
          setActivities((prev) => [...mapped, ...prev].slice(0, 8));
        }
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800 px-6 py-4">
        <div>
          <h1 className="text-xl font-bold">石化行业大脑 · 企业总驾驶舱</h1>
          <p className="mt-1 text-sm text-slate-400">当前仿真时间: {formatSimTime(simTime)}</p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <p className="text-sm text-slate-400">设备在线率</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{stats.deviceOnline}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <p className="text-sm text-slate-400">工艺寻优收益</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{stats.yieldGain}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <p className="text-sm text-slate-400">Agent运行数</p>
            <p className="mt-1 text-2xl font-bold text-blue-400">{stats.agentCount}</p>
          </div>
          <Link href="/evolution/offline" className="rounded-xl border border-slate-700 bg-slate-800 p-5 transition hover:border-slate-600">
            <p className="text-sm text-slate-400">进化引擎代数</p>
            <p className="mt-1 text-2xl font-bold text-blue-400">{stats.evolutionGen}</p>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/knowledge" className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 transition hover:border-slate-600">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 text-lg">🏗️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-300">底座支撑</p>
              <p className="text-xs text-slate-500">知识中心 · 数据治理 · 工具库 · 模型网关</p>
            </div>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </Link>
          <Link href="/memory" className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 transition hover:border-slate-600">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 text-lg">⚡</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-300">核心运行</p>
              <p className="text-xs text-slate-500">记忆 · Agent · Multi-Agent · 可观测</p>
            </div>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </Link>
          <Link href="/evolution/online" className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 transition hover:border-slate-600">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 text-lg">🧬</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-300">自我进化</p>
              <p className="text-xs text-slate-500">在线演进 · 离线进化</p>
            </div>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/device" className="group rounded-xl border border-slate-700 bg-slate-800 p-6 transition hover:border-slate-600">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-700 text-2xl">⚙️</div>
            <h3 className="font-semibold text-slate-200">设备预测维护</h3>
            <p className="mt-2 text-amber-400">{stats.deviceWarnings} 设备预警中</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
              <div className="h-full rounded-full bg-amber-500" style={{ width: "72%" }} />
            </div>
            <p className="mt-3 text-sm text-blue-500 group-hover:text-blue-400">进入 →</p>
          </Link>
          <Link href="/optimize" className="group rounded-xl border border-slate-700 bg-slate-800 p-6 transition hover:border-slate-600">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-700 text-2xl">📈</div>
            <h3 className="font-semibold text-slate-200">工艺参数寻优</h3>
            <p className="mt-2 text-emerald-400">+2.3% 收率提升</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: "92%" }} />
            </div>
            <p className="mt-3 text-sm text-blue-500 group-hover:text-blue-400">进入 →</p>
          </Link>
          <Link href="/catalyst" className="group rounded-xl border border-slate-700 bg-slate-800 p-6 transition hover:border-slate-600">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-700 text-2xl">🧪</div>
            <h3 className="font-semibold text-slate-200">催化剂研发助手</h3>
            <p className="mt-2 text-blue-400">3 分析任务完成</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
              <div className="h-full rounded-full bg-blue-500" style={{ width: "85%" }} />
            </div>
            <p className="mt-3 text-sm text-blue-500 group-hover:text-blue-400">进入 →</p>
          </Link>
          <Link href="/corrosion" className="group rounded-xl border border-slate-700 bg-slate-800 p-6 transition hover:border-slate-600">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-700 text-2xl">🛡️</div>
            <h3 className="font-semibold text-slate-200">智能防腐蚀</h3>
            <p className="mt-2 text-emerald-400">6 对象监测中</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: "78%" }} />
            </div>
            <p className="mt-3 text-sm text-blue-500 group-hover:text-blue-400">进入 →</p>
          </Link>
        </div>

        <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-200">Agent 动态</h2>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {activities.map((a, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-700/50 bg-slate-900/50 px-4 py-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColor(a.type)}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-200">{a.msg}</p>
                  <p className="mt-0.5 text-xs text-slate-500">({a.time})</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
