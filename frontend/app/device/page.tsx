"use client";

import { useState, useCallback, useEffect, useRef } from "react";

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
/*  Demo Data                                                          */
/* ------------------------------------------------------------------ */

const PARENTS: ParentDevice[] = [
  { id: "DEV-FCC-001", name: "FCC-催化裂化装置" },
  { id: "DEV-CDU-001", name: "常减压蒸馏装置" },
];

const DEVICES: Device[] = [
  {
    id: "DEV-PUMP-001",
    name: "循环水泵-001",
    health: 0.72,
    status: "degrading",
    parentId: "DEV-FCC-001",
    alerts: [
      {
        id: "ALT-001",
        message: "振动值超标 — 外圈故障风险",
        level: "warning",
        time: "2025-06-15 08:23",
      },
      {
        id: "ALT-002",
        message: "轴承温度偏高 (72°C)",
        level: "warning",
        time: "2025-06-15 07:55",
      },
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

const DIAGNOSIS_STEPS: DiagnosisStep[] = [
  {
    label: "监测Agent 分析传感数据...",
    result:
      "检测到外圈故障信号, 风险等级: 中等, 置信度: 0.61\n频谱分析发现BPFO特征频率异常突出, 振动能量集中在3.8–4.5 mm/s区间",
  },
  {
    label: "诊断Agent 查询知识库...",
    result:
      "轴承外圈故障 — 主要原因: 腐蚀 (概率40%), 疲劳剥落 (概率30%), 安装不当 (概率20%)\n需在48小时内安排检修, 建议降低负荷至80%运行",
  },
  {
    label: "维修Agent 生成SOP...",
    result: "已生成标准维修程序, 详见下方SOP",
  },
];

const SOP_RESULT: SOPData = {
  title: "SOP-BRG-2025-0042: 循环水泵轴承更换维修程序",
  steps: [
    "停机并挂牌上锁 (LOTO), 确认电气隔离",
    "排放泵体内残余液体, 拆卸联轴器防护罩",
    "拆卸泵端盖及轴承压盖, 使用专用拉拔器取出旧轴承",
    "检查轴颈表面, 测量配合尺寸 (允差 ±0.02mm)",
    "加热新轴承至80°C, 安装就位并检查游隙",
    "回装端盖, 补充润滑脂 (Shell Gadus S2 V220)",
    "盘车检查, 确认无异响和卡涩",
    "送电试运行, 监测振动/温度30分钟达标后交付",
  ],
  estimatedDuration: "约4小时 (含冷却等待时间)",
};

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

/* ------------------------------------------------------------------ */
/*  Spinner                                                            */
/* ------------------------------------------------------------------ */

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

function DeviceTree({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (parentId: string) =>
    setCollapsed((p) => ({ ...p, [parentId]: !p[parentId] }));

  return (
    <aside className="flex w-[250px] shrink-0 flex-col border-r border-slate-700 bg-[#0c1322]">
      <div className="border-b border-slate-700 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-wide text-slate-300">
          设备列表
        </h2>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {PARENTS.map((parent) => {
          const children = DEVICES.filter((d) => d.parentId === parent.id);
          const isCollapsed = collapsed[parent.id];
          return (
            <div key={parent.id} className="mb-1">
              <button
                onClick={() => toggle(parent.id)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-slate-300 hover:bg-slate-700/50"
              >
                <span
                  className={`inline-block text-[10px] transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                >
                  ▶
                </span>
                <span className="font-medium">{parent.name}</span>
                <span className="ml-auto text-xs text-slate-500">
                  {children.length}
                </span>
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
                      <span
                        className={`inline-block h-2 w-2 shrink-0 rounded-full ${statusColor(dev.status)}`}
                      />
                      <span className="truncate">{dev.name}</span>
                      <span
                        className={`ml-auto text-xs font-mono ${healthColor(dev.health)}`}
                      >
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
/*  Health Gauge                                                       */
/* ------------------------------------------------------------------ */

function HealthGauge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="#334155"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={value >= 0.8 ? "#10b981" : value >= 0.6 ? "#f59e0b" : "#ef4444"}
            strokeWidth="10"
            strokeDasharray={`${value * 326.7} 326.7`}
            strokeLinecap="round"
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center text-2xl font-bold ${healthColor(value)}`}
        >
          {pct}
        </span>
      </div>
      <div>
        <p className="text-xs text-slate-500">健康评分</p>
        <p className={`text-4xl font-extrabold tracking-tight ${healthColor(value)}`}>
          {pct}
          <span className="text-lg font-normal text-slate-500">/100</span>
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {value >= 0.8 ? "设备运行正常" : value >= 0.6 ? "性能退化，建议关注" : "存在故障风险"}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CSS Bar Chart for Health Trend                                     */
/* ------------------------------------------------------------------ */

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
            <div
              key={i}
              className="group relative flex flex-1 flex-col items-center"
            >
              <div
                className="absolute -top-6 hidden rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-200 group-hover:block"
              >
                {(v * 100).toFixed(0)}%
              </div>
              <div className="w-full flex items-end h-full">
                <div
                  className={`w-full rounded-t ${healthBarColor(v)} transition-all`}
                  style={{ height: `${height}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1">
        {labels.map((l) => (
          <div key={l} className="flex-1 text-center text-[9px] text-slate-500">
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Alert List                                                         */
/* ------------------------------------------------------------------ */

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
        <span className="ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
          {alerts.length}
        </span>
      </h3>
      <div className="space-y-2">
        {alerts.map((a) => (
          <div
            key={a.id}
            className={`flex items-start gap-3 rounded-md p-2.5 text-sm ${
              a.level === "critical"
                ? "bg-red-500/10 text-red-300"
                : "bg-amber-500/10 text-amber-300"
            }`}
          >
            <span className="mt-0.5 shrink-0">
              {a.level === "critical" ? "🔴" : "🟡"}
            </span>
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

/* ------------------------------------------------------------------ */
/*  Metrics Grid                                                       */
/* ------------------------------------------------------------------ */

function MetricsGrid({ metrics }: { metrics: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="rounded-lg border border-slate-700 bg-[#0c1322] px-3 py-2.5"
        >
          <p className="text-[11px] text-slate-500">{m.label}</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-200">{m.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Diagnosis Panel                                                    */
/* ------------------------------------------------------------------ */

function DiagnosisPanel({
  running,
  completedSteps,
  sop,
}: {
  running: boolean;
  completedSteps: number;
  sop: SOPData | null;
}) {
  if (!running && completedSteps === 0) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-700 bg-[#0c1322] p-4">
        <h3 className="mb-4 text-sm font-semibold text-slate-300">
          智能诊断流程
        </h3>

        <div className="space-y-4">
          {DIAGNOSIS_STEPS.map((step, i) => {
            const done = i < completedSteps;
            const active = running && i === completedSteps;
            const pending = i > completedSteps;

            return (
              <div key={i}>
                <div className="flex items-center gap-3">
                  {done && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                      ✓
                    </span>
                  )}
                  {active && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                      <Spinner />
                    </span>
                  )}
                  {pending && !active && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-600 text-xs text-slate-600">
                      {i + 1}
                    </span>
                  )}
                  <span
                    className={`text-sm font-medium ${
                      done
                        ? "text-emerald-400"
                        : active
                          ? "text-blue-400"
                          : "text-slate-500"
                    }`}
                  >
                    步骤 {i + 1}: {step.label}
                  </span>
                </div>

                {done && (
                  <div className="ml-9 mt-1.5 whitespace-pre-wrap rounded bg-slate-800/60 px-3 py-2 text-xs leading-relaxed text-slate-300">
                    {step.result}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SOP */}
      {sop && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-blue-400">
              生成维修SOP
            </h3>
            <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
              {sop.steps.length} 步骤 · {sop.estimatedDuration}
            </span>
          </div>
          <p className="mb-3 text-sm font-medium text-slate-200">{sop.title}</p>
          <ol className="space-y-1.5">
            {sop.steps.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300">
                <span className="shrink-0 font-mono text-xs text-blue-500/60">
                  {String(i + 1).padStart(2, "0")}
                </span>
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
  const [selectedId, setSelectedId] = useState(DEVICES[0].id);
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagCompleted, setDiagCompleted] = useState(0);
  const [sopResult, setSopResult] = useState<SOPData | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const device = DEVICES.find((d) => d.id === selectedId)!;

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setDiagRunning(false);
    setDiagCompleted(0);
    setSopResult(null);
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => {
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const runDiagnosis = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setDiagRunning(true);
    setDiagCompleted(0);
    setSopResult(null);

    const delays = [2200, 3000, 2500];
    let cumulative = 0;

    delays.forEach((d, i) => {
      cumulative += d;
      const t = setTimeout(() => {
        setDiagCompleted(i + 1);
        if (i === delays.length - 1) {
          setDiagRunning(false);
          setSopResult(SOP_RESULT);
        }
      }, cumulative);
      timers.current.push(t);
    });
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0f172a] text-slate-100">
      {/* Sidebar */}
      <DeviceTree selectedId={selectedId} onSelect={handleSelect} />

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        {/* Top Bar */}
        <header className="flex items-center justify-between border-b border-slate-700 bg-[#1e293b] px-6 py-3">
          <div className="flex items-center gap-3">
            <span
              className={`inline-block h-3 w-3 rounded-full ${statusColor(device.status)}`}
            />
            <h1 className="text-lg font-semibold">{device.name}</h1>
            <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-400">
              {device.id}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">健康评分</span>
            <span
              className={`text-2xl font-bold ${healthColor(device.health)}`}
            >
              {(device.health * 100).toFixed(0)}
            </span>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 space-y-5 p-6">
          {/* Row 1: Gauge + Metrics */}
          <div className="grid gap-5 lg:grid-cols-2">
            <div
              className={`flex items-center rounded-lg border border-slate-700 p-5 ${healthBgColor(device.health)}`}
            >
              <HealthGauge value={device.health} />
            </div>
            <div className="flex flex-col gap-3">
              <MetricsGrid metrics={device.metrics} />
            </div>
          </div>

          {/* Row 2: Trend + Alerts */}
          <div className="grid gap-5 lg:grid-cols-2">
            <TrendChart data={device.trendData} />
            <AlertList alerts={device.alerts} />
          </div>

          {/* Diagnosis Trigger */}
          <div className="flex items-center gap-4">
            <button
              onClick={runDiagnosis}
              disabled={diagRunning}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {diagRunning ? (
                <span className="flex items-center gap-2">
                  <Spinner /> 诊断中...
                </span>
              ) : (
                "一键诊断"
              )}
            </button>
            {diagCompleted > 0 && !diagRunning && (
              <span className="text-xs text-emerald-400">
                ✓ 诊断完成 — 已生成维修方案
              </span>
            )}
          </div>

          {/* Diagnosis Panel */}
          <DiagnosisPanel
            running={diagRunning}
            completedSteps={diagCompleted}
            sop={sopResult}
          />
        </div>
      </main>
    </div>
  );
}
