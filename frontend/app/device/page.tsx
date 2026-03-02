"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { fetchAPI, sseStream } from "../../lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Alert {
  id: string;
  message: string;
  level: "warning" | "critical";
  time: string;
}

interface Device {
  id: string;
  name: string;
  health: number;
  status: "normal" | "degrading" | "fault";
  parentId: string;
  alerts: Alert[];
  metrics: { label: string; value: string }[];
  trendData: number[];
}

interface ParentDevice {
  id: string;
  name: string;
}

interface DiagnosisStep {
  label: string;
  result: string;
}

interface SOPData {
  title: string;
  steps: string[];
  estimatedDuration: string;
}

/* ------------------------------------------------------------------ */
/*  Fallback Data (used when API unavailable)                         */
/* ------------------------------------------------------------------ */

const PARENTS: ParentDevice[] = [
  { id: "DEV-FCC-001", name: "FCC-催化裂化装置" },
  { id: "DEV-CDU-001", name: "常减压蒸馏装置" },
];

const INITIAL_DEVICES: Device[] = [
  {
    id: "DEV-PUMP-001",
    name: "循环水泵-001",
    health: 0.72,
    status: "degrading",
    parentId: "DEV-FCC-001",
    alerts: [
      { id: "ALT-001", message: "振动值超标 — 外圈故障风险", level: "warning", time: "2025-06-15 08:23" },
      { id: "ALT-002", message: "轴承温度偏高 (72°C)", level: "warning", time: "2025-06-15 07:55" },
    ],
    metrics: [
      { label: "振动 (mm/s)", value: "4.2" },
      { label: "温度 (°C)", value: "72" },
      { label: "转速 (RPM)", value: "2980" },
      { label: "流量 (m³/h)", value: "185" },
    ],
    trendData: [0.95, 0.93, 0.91, 0.88, 0.85, 0.82, 0.79, 0.76, 0.74, 0.72],
  },
  {
    id: "DEV-PUMP-002",
    name: "进料泵-002",
    health: 0.88,
    status: "normal",
    parentId: "DEV-FCC-001",
    alerts: [],
    metrics: [
      { label: "振动 (mm/s)", value: "2.1" },
      { label: "温度 (°C)", value: "58" },
      { label: "转速 (RPM)", value: "3000" },
      { label: "流量 (m³/h)", value: "220" },
    ],
    trendData: [0.87, 0.88, 0.89, 0.88, 0.87, 0.88, 0.89, 0.88, 0.88, 0.88],
  },
  {
    id: "DEV-COMP-001",
    name: "富气压缩机-001",
    health: 0.91,
    status: "normal",
    parentId: "DEV-FCC-001",
    alerts: [],
    metrics: [
      { label: "振动 (mm/s)", value: "1.8" },
      { label: "温度 (°C)", value: "65" },
      { label: "压力 (MPa)", value: "1.2" },
      { label: "功率 (kW)", value: "450" },
    ],
    trendData: [0.9, 0.91, 0.91, 0.92, 0.91, 0.9, 0.91, 0.91, 0.92, 0.91],
  },
  {
    id: "DEV-HX-001",
    name: "原料预热器-001",
    health: 0.95,
    status: "normal",
    parentId: "DEV-CDU-001",
    alerts: [],
    metrics: [
      { label: "入口温度 (°C)", value: "120" },
      { label: "出口温度 (°C)", value: "280" },
      { label: "压降 (kPa)", value: "35" },
      { label: "效率 (%)", value: "94.5" },
    ],
    trendData: [0.94, 0.95, 0.95, 0.94, 0.95, 0.96, 0.95, 0.95, 0.95, 0.95],
  },
  {
    id: "DEV-PUMP-003",
    name: "常压塔底泵-003",
    health: 0.85,
    status: "normal",
    parentId: "DEV-CDU-001",
    alerts: [],
    metrics: [
      { label: "振动 (mm/s)", value: "2.8" },
      { label: "温度 (°C)", value: "62" },
      { label: "转速 (RPM)", value: "2960" },
      { label: "流量 (m³/h)", value: "310" },
    ],
    trendData: [0.86, 0.85, 0.86, 0.85, 0.84, 0.85, 0.86, 0.85, 0.85, 0.85],
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusColor(status: Device["status"]): string {
  if (status === "normal") return "bg-emerald-400";
  if (status === "degrading") return "bg-amber-400";
  return "bg-red-500";
}

function healthColor(h: number): string {
  if (h >= 0.8) return "text-emerald-400";
  if (h >= 0.6) return "text-amber-400";
  return "text-red-400";
}

function healthBarColor(h: number): string {
  if (h >= 0.8) return "bg-emerald-500";
  if (h >= 0.6) return "bg-amber-500";
  return "bg-red-500";
}

function healthBgColor(h: number): string {
  if (h >= 0.8) return "bg-emerald-500/20";
  if (h >= 0.6) return "bg-amber-500/20";
  return "bg-red-500/20";
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

function DeviceTree({
  devices,
  selectedId,
  onSelect,
}: {
  devices: Device[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (parentId: string) =>
    setCollapsed((p) => ({ ...p, [parentId]: !p[parentId] }));

  return (
    <aside className="flex w-[250px] shrink-0 flex-col border-r border-slate-700 bg-[#0c1322]">
      <div className="border-b border-slate-700 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-wide text-slate-300">设备列表</h2>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {PARENTS.map((parent) => {
          const children = devices.filter((d) => d.parentId === parent.id);
          const isCollapsed = collapsed[parent.id];
          return (
            <div key={parent.id} className="mb-1">
              <button
                onClick={() => toggle(parent.id)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-slate-300 hover:bg-slate-700/50"
              >
                <span className={`inline-block text-[10px] transition-transform ${isCollapsed ? "" : "rotate-90"}`}>▶</span>
                <span className="font-medium">{parent.name}</span>
                <span className="ml-auto text-xs text-slate-500">{children.length}</span>
              </button>
              {!isCollapsed && (
                <div className="ml-3 border-l border-slate-700/60 pl-2">
                  {children.map((dev) => (
                    <button
                      key={dev.id}
                      onClick={() => onSelect(dev.id)}
                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                        selectedId === dev.id
                          ? "bg-blue-600/20 text-blue-400"
                          : "text-slate-400 hover:bg-slate-700/40 hover:text-slate-200"
                      }`}
                    >
                      <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${statusColor(dev.status)}`} />
                      <span className="truncate">{dev.name}</span>
                      <span className={`ml-auto text-xs font-mono ${healthColor(dev.health)}`}>
                        {(dev.health * 100).toFixed(0)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function HealthGauge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#334155" strokeWidth="10" />
          <circle
            cx="60" cy="60" r="52" fill="none"
            stroke={value >= 0.8 ? "#10b981" : value >= 0.6 ? "#f59e0b" : "#ef4444"}
            strokeWidth="10" strokeDasharray={`${value * 326.7} 326.7`} strokeLinecap="round"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-2xl font-bold ${healthColor(value)}`}>{pct}</span>
      </div>
      <div>
        <p className="text-xs text-slate-500">健康评分</p>
        <p className={`text-4xl font-extrabold tracking-tight ${healthColor(value)}`}>
          {pct}<span className="text-lg font-normal text-slate-500">/100</span>
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {value >= 0.8 ? "设备运行正常" : value >= 0.6 ? "性能退化，建议关注" : "存在故障风险"}
        </p>
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: number[] }) {
  const labels = ["D-9", "D-8", "D-7", "D-6", "D-5", "D-4", "D-3", "D-2", "D-1", "今日"];
  const min = 0.5;
  const max = 1.0;
  return (
    <div className="rounded-lg border border-slate-700 bg-[#0c1322] p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-300">健康趋势</h3>
      <div className="flex h-36 items-end gap-1">
        {data.map((v, i) => {
          const height = ((v - min) / (max - min)) * 100;
          return (
            <div key={i} className="group relative flex flex-1 flex-col items-center">
              <div className="absolute -top-6 hidden rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-200 group-hover:block">
                {(v * 100).toFixed(0)}%
              </div>
              <div className="w-full flex items-end h-full">
                <div className={`w-full rounded-t ${healthBarColor(v)} transition-all`} style={{ height: `${height}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1">
        {labels.map((l) => (
          <div key={l} className="flex-1 text-center text-[9px] text-slate-500">{l}</div>
        ))}
      </div>
    </div>
  );
}

function AlertList({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-[#0c1322] p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-300">告警信息</h3>
        <p className="text-sm text-slate-500">暂无活跃告警</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-slate-700 bg-[#0c1322] p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-300">
        告警信息
        <span className="ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">{alerts.length}</span>
      </h3>
      <div className="space-y-2">
        {alerts.map((a) => (
          <div
            key={a.id}
            className={`flex items-start gap-3 rounded-md p-2.5 text-sm ${
              a.level === "critical" ? "bg-red-500/10 text-red-300" : "bg-amber-500/10 text-amber-300"
            }`}
          >
            <span className="mt-0.5 shrink-0">{a.level === "critical" ? "🔴" : "🟡"}</span>
            <div className="min-w-0 flex-1">
              <p>{a.message}</p>
              <p className="mt-0.5 text-xs opacity-60">{a.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricsGrid({ metrics }: { metrics: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {metrics.map((m) => (
        <div key={m.label} className="rounded-lg border border-slate-700 bg-[#0c1322] px-3 py-2.5">
          <p className="text-[11px] text-slate-500">{m.label}</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-200">{m.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Diagnosis Panel (SSE-driven)                                       */
/* ------------------------------------------------------------------ */

function DiagnosisPanel({
  steps,
  running,
  sop,
}: {
  steps: DiagnosisStep[];
  running: boolean;
  sop: SOPData | null;
}) {
  if (steps.length === 0 && !running) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-700 bg-[#0c1322] p-4">
        <h3 className="mb-4 text-sm font-semibold text-slate-300">智能诊断流程</h3>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={i}>
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs">✓</span>
                <span className="text-sm font-medium text-emerald-400">步骤 {i + 1}: {step.label}</span>
              </div>
              <div className="ml-9 mt-1.5 whitespace-pre-wrap rounded bg-slate-800/60 px-3 py-2 text-xs leading-relaxed text-slate-300">
                {step.result}
              </div>
            </div>
          ))}
          {running && (
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center"><Spinner /></span>
              <span className="text-sm font-medium text-blue-400">Agent 处理中...</span>
            </div>
          )}
        </div>
      </div>

      {sop && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-blue-400">生成维修SOP</h3>
            <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
              {sop.steps.length} 步骤 · {sop.estimatedDuration}
            </span>
          </div>
          <p className="mb-3 text-sm font-medium text-slate-200">{sop.title}</p>
          <ol className="space-y-1.5">
            {sop.steps.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300">
                <span className="shrink-0 font-mono text-xs text-blue-500/60">{String(i + 1).padStart(2, "0")}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function DevicePage() {
  const [devices, setDevices] = useState<Device[]>(INITIAL_DEVICES);
  const [selectedId, setSelectedId] = useState(INITIAL_DEVICES[0].id);
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagSteps, setDiagSteps] = useState<DiagnosisStep[]>([]);
  const [sopResult, setSopResult] = useState<SOPData | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const device = devices.find((d) => d.id === selectedId)!;

  // Fetch health from backend on device select
  useEffect(() => {
    let cancelled = false;
    fetchAPI<{
      device_id: string;
      current_health_score?: number;
      health_trend?: { timestamp: string; score: number }[];
      active_alerts?: { type: string; message: string; since: string }[];
    }>(`/api/device/${selectedId}/health`)
      .then((data) => {
        if (cancelled) return;
        setDevices((prev) =>
          prev.map((d) => {
            if (d.id !== selectedId) return d;
            const health = data.current_health_score ?? d.health;
            const trendFromApi = data.health_trend?.map((t) => t.score);
            const alertsFromApi = data.active_alerts?.map((a, i) => ({
              id: `API-${i}`,
              message: a.message,
              level: "warning" as const,
              time: a.since?.slice(0, 16).replace("T", " ") || "",
            }));
            return {
              ...d,
              health,
              status: health >= 0.8 ? "normal" : health >= 0.6 ? "degrading" : "fault",
              ...(trendFromApi && trendFromApi.length > 0 ? { trendData: trendFromApi } : {}),
              ...(alertsFromApi && alertsFromApi.length > 0 ? { alerts: alertsFromApi } : {}),
            };
          }),
        );
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedId]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setDiagRunning(false);
    setDiagSteps([]);
    setSopResult(null);
    abortRef.current?.abort();
  }, []);

  const runDiagnosis = useCallback(() => {
    abortRef.current?.abort();
    setDiagRunning(true);
    setDiagSteps([]);
    setSopResult(null);

    const ctrl = sseStream(
      `/api/device/${selectedId}/diagnose`,
      { anomaly_type: "vibration_bearing", context: "routine_check" },
      (event, data) => {
        if (event === "agent_step") {
          const step = data as { agent: string; action: string; result?: string; summary?: string };
          setDiagSteps((prev) => [
            ...prev,
            { label: `${step.agent} — ${step.action}`, result: step.result || step.summary || JSON.stringify(step) },
          ]);
        } else if (event === "complete") {
          const result = data as { results?: Record<string, { sop_title?: string; sop_steps?: string[]; estimated_duration?: string }> };
          const repair = result?.results?.repair;
          if (repair?.sop_steps) {
            setSopResult({
              title: repair.sop_title || "维修SOP",
              steps: repair.sop_steps,
              estimatedDuration: repair.estimated_duration || "约4小时",
            });
          }
          setDiagRunning(false);
        }
      },
      () => setDiagRunning(false),
    );
    abortRef.current = ctrl;
  }, [selectedId]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0f172a] text-slate-100">
      <DeviceTree devices={devices} selectedId={selectedId} onSelect={handleSelect} />
      <main className="flex flex-1 flex-col overflow-y-auto">
        <header className="flex items-center justify-between border-b border-slate-700 bg-[#1e293b] px-6 py-3">
          <div className="flex items-center gap-3">
            <span className={`inline-block h-3 w-3 rounded-full ${statusColor(device.status)}`} />
            <h1 className="text-lg font-semibold">{device.name}</h1>
            <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-400">{device.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">健康评分</span>
            <span className={`text-2xl font-bold ${healthColor(device.health)}`}>{(device.health * 100).toFixed(0)}</span>
          </div>
        </header>
        <div className="flex-1 space-y-5 p-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className={`flex items-center rounded-lg border border-slate-700 p-5 ${healthBgColor(device.health)}`}>
              <HealthGauge value={device.health} />
            </div>
            <div className="flex flex-col gap-3">
              <MetricsGrid metrics={device.metrics} />
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <TrendChart data={device.trendData} />
            <AlertList alerts={device.alerts} />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={runDiagnosis}
              disabled={diagRunning}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {diagRunning ? (
                <span className="flex items-center gap-2"><Spinner /> 诊断中...</span>
              ) : (
                "一键诊断"
              )}
            </button>
            {diagSteps.length > 0 && !diagRunning && (
              <span className="text-xs text-emerald-400">✓ 诊断完成 — 已生成维修方案</span>
            )}
          </div>
          <DiagnosisPanel steps={diagSteps} running={diagRunning} sop={sopResult} />
        </div>
      </main>
    </div>
  );
}
