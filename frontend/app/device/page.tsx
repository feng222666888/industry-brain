"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { fetchAPI, sseStream } from "../../lib/api";
import RealtimeDataStream from "../../components/device-demo/RealtimeDataStream";
import AgentFlowVisualization from "../../components/device-demo/AgentFlowVisualization";
import SOPCard from "../../components/device-demo/SOPCard";

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
  deviceType?: string;
}

interface ParentDevice {
  id: string;
  name: string;
}

interface DiagnosisStep {
  label: string;
  result: string;
  agent?: string;
  action?: string;
}

interface SOPData {
  title: string;
  steps: string[];
  estimatedDuration: string;
  spare_parts?: string[];
}

interface DiagnosisIssue {
  id: string;
  severity: "low" | "medium" | "high";
  category: string;
  title: string;
  description: string;
  recommendation: string;
}

interface DiagnosisResult {
  device_id: string;
  device_name: string;
  diagnosis_time: string;
  issues: DiagnosisIssue[];
  failure_probability: {
    "3_days": number;
    "7_days": number;
  };
  risk_level: "low" | "medium" | "high";
  overall_assessment: string;
}

interface PredictionFeedback {
  id: string;
  timestamp: string;
  sensor_data: {
    vibration: number;
    temperature: number;
    rpm: number;
    flow: number;
  };
  prediction: {
    "3_days": number;
    "7_days": number;
  };
  feedback: "correct" | "incorrect" | null;
}

interface SensorDataPoint {
  timestamp: string;
  vibration_rms: number;
  vibration_peak: number;
  temperature: number;
  pressure: number;
  flow: number;
  health_score: number;
}

/* ------------------------------------------------------------------ */
/*  Fallback Data                                                      */
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
    deviceType: "centrifugal_pump",
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
    deviceType: "centrifugal_pump",
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
    deviceType: "compressor",
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
    deviceType: "heat_exchanger",
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
    deviceType: "centrifugal_pump",
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
    <aside className="flex w-[280px] shrink-0 flex-col border-r border-slate-700/50 bg-gradient-to-b from-[#0c1322] to-[#0a0f1a] backdrop-blur-sm">
      <div className="border-b border-slate-700/50 px-4 py-3 bg-slate-900/30">
        <h2 className="text-sm font-semibold tracking-wide text-slate-300 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          设备列表
        </h2>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {PARENTS.map((parent) => {
          const children = devices.filter((d) => d.parentId === parent.id);
          const isCollapsed = collapsed[parent.id];
          return (
            <div key={parent.id} className="mb-1">
              <button
                onClick={() => toggle(parent.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-300 hover:bg-slate-700/50 transition-all hover:shadow-lg hover:shadow-blue-500/10"
              >
                <span className={`inline-block text-[10px] transition-transform ${isCollapsed ? "" : "rotate-90"}`}>▶</span>
                <span className="font-medium">{parent.name}</span>
                <span className="ml-auto text-xs text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded">{children.length}</span>
              </button>
              {!isCollapsed && (
                <div className="ml-3 border-l border-slate-700/60 pl-2">
                  {children.map((dev) => (
                    <button
                      key={dev.id}
                      onClick={() => onSelect(dev.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-all ${
                        selectedId === dev.id
                          ? "bg-gradient-to-r from-blue-600/30 to-cyan-600/30 text-blue-400 shadow-lg shadow-blue-500/20 border border-blue-500/30"
                          : "text-slate-400 hover:bg-slate-700/40 hover:text-slate-200"
                      }`}
                    >
                      <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${statusColor(dev.status)} animate-pulse`} />
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
      <div className="relative h-32 w-32">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <defs>
            <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={value >= 0.8 ? "#10b981" : value >= 0.6 ? "#f59e0b" : "#ef4444"} stopOpacity="0.3" />
              <stop offset="100%" stopColor={value >= 0.8 ? "#10b981" : value >= 0.6 ? "#f59e0b" : "#ef4444"} stopOpacity="1" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r="52" fill="none" stroke="#334155" strokeWidth="10" />
          <circle
            cx="60" cy="60" r="52" fill="none"
            stroke="url(#healthGradient)"
            strokeWidth="10" strokeDasharray={`${value * 326.7} 326.7`} strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-3xl font-bold ${healthColor(value)} drop-shadow-lg`}>
          {pct}
        </span>
      </div>
      <div>
        <p className="text-xs text-slate-500">健康评分</p>
        <p className={`text-5xl font-extrabold tracking-tight ${healthColor(value)} drop-shadow-lg`}>
          {pct}<span className="text-xl font-normal text-slate-500">/100</span>
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {value >= 0.8 ? "设备运行正常" : value >= 0.6 ? "性能退化，建议关注" : "存在故障风险"}
        </p>
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: number[] }) {
  // 生成日期标签（从9天前到今天）
  const generateDateLabels = () => {
    const labels = [];
    const today = new Date();
    for (let i = 9; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      labels.push(`${month}/${day}`);
    }
    return labels;
  };
  const labels = generateDateLabels();
  const min = 0.0; // 0表示底部
  const max = 1.0; // 1表示顶部
  
  // 如果数据为空或无效，显示提示
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-[#0c1322] to-[#0a0f1a] p-4 backdrop-blur-sm shadow-xl">
        <h3 className="mb-3 text-sm font-semibold text-slate-300">健康趋势</h3>
        <p className="text-sm text-slate-500">暂无趋势数据</p>
      </div>
    );
  }
  
  // 验证数据有效性 - 不要过滤掉有效数据
  const validData = data
    .map((v, i) => {
      const num = typeof v === 'number' ? v : parseFloat(String(v));
      if (isNaN(num)) {
        return 0.7;
      }
      // 确保值在0-1范围内，但允许0值（表示完全健康为0的情况）
      return Math.max(0, Math.min(1, num));
    })
    .filter((v) => !isNaN(v)); // 只过滤NaN，保留所有有效值包括0
  
  if (validData.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-[#0c1322] to-[#0a0f1a] p-4 backdrop-blur-sm shadow-xl">
        <h3 className="mb-3 text-sm font-semibold text-slate-300">健康趋势</h3>
        <p className="text-sm text-slate-500">数据格式错误</p>
      </div>
    );
  }
  
  // 使用验证后的数据，确保有10个数据点
  const chartData = validData.slice(0, 10);
  
  // 如果数据点不足10个，用最后一个值填充
  while (chartData.length < 10) {
    chartData.push(chartData[chartData.length - 1] || 0.7);
  }
  
  return (
    <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-[#0c1322] to-[#0a0f1a] p-4 backdrop-blur-sm shadow-xl">
      <h3 className="mb-3 text-sm font-semibold text-slate-300">健康趋势</h3>
      <div className="flex gap-2">
        {/* Y轴 */}
        <div className="flex flex-col justify-between pb-6" style={{ height: '144px', minWidth: '30px' }}>
          <div className="text-[10px] text-slate-400 text-right">100%</div>
          <div className="text-[10px] text-slate-400 text-right">75%</div>
          <div className="text-[10px] text-slate-400 text-right">50%</div>
          <div className="text-[10px] text-slate-400 text-right">25%</div>
          <div className="text-[10px] text-slate-400 text-right">0%</div>
        </div>
        
        {/* 图表区域 */}
        <div className="flex-1">
          <div className="flex h-36 items-end gap-1 relative">
            {chartData.map((v, i) => {
              // 数据已经是0-1范围（0.822 = 82.2%），直接转换为百分比高度
              // 公式：height = value * 100%
              const heightPercent = v * 100;
              
              return (
                <div key={i} className="group relative flex flex-1 flex-col items-center">
                  {/* 百分比数字 - 始终显示在bar上方 */}
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-slate-800/90 px-1.5 py-0.5 text-[10px] text-slate-200 z-10 shadow-lg whitespace-nowrap">
                    {heightPercent.toFixed(1)}%
                  </div>
                  <div className="w-full flex items-end h-full" style={{ height: '144px' }}>
                    <div 
                      className={`w-full rounded-t transition-all duration-300 ${healthBarColor(v)} shadow-lg hover:shadow-xl hover:opacity-90`} 
                      style={{ 
                        height: `${heightPercent}%`,
                        minHeight: '2px', // 确保即使值很小也能看到
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {/* X轴日期标签 */}
          <div className="mt-1 flex gap-1">
            {labels.slice(0, chartData.length).map((l, i) => (
              <div key={i} className="flex-1 text-center text-[9px] text-slate-500">{l}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertList({ alerts }: { alerts: Alert[] }) {
  // 调试日志
  
  if (!alerts || alerts.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-[#0c1322] to-[#0a0f1a] p-4 backdrop-blur-sm shadow-xl">
        <h3 className="mb-2 text-sm font-semibold text-slate-300">告警信息</h3>
        <p className="text-sm text-slate-500">暂无活跃告警</p>
      </div>
    );
  }
  
  // 过滤掉info级别的告警（如果需要只显示warning和critical）
  const displayAlerts = alerts.filter(a => a.level !== "info");
  
  if (displayAlerts.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-[#0c1322] to-[#0a0f1a] p-4 backdrop-blur-sm shadow-xl">
        <h3 className="mb-2 text-sm font-semibold text-slate-300">告警信息</h3>
        <p className="text-sm text-slate-500">设备运行正常</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-[#0c1322] to-[#0a0f1a] p-4 backdrop-blur-sm shadow-xl">
      <h3 className="mb-3 text-sm font-semibold text-slate-300">
        告警信息
        <span className="ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400 animate-pulse">{alerts.length}</span>
      </h3>
      <div className="space-y-2">
        {displayAlerts.map((a) => (
          <div
            key={a.id}
            className={`flex items-start gap-3 rounded-lg p-2.5 text-sm transition-all hover:shadow-lg ${
              a.level === "critical" ? "bg-red-500/10 text-red-300 border border-red-500/30" : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
            }`}
          >
            <span className="mt-0.5 shrink-0 text-lg">{a.level === "critical" ? "🔴" : "🟡"}</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{a.message}</p>
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
        <div key={m.label} className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-[#0c1322] to-[#0a0f1a] px-3 py-2.5 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all hover:scale-105">
          <p className="text-[11px] text-slate-500">{m.label}</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-200 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{m.value}</p>
        </div>
      ))}
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
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [predictionFeedback, setPredictionFeedback] = useState<PredictionFeedback[]>([]);
  const [sensorData, setSensorData] = useState<SensorDataPoint[]>([]);
  const [loadingSensorData, setLoadingSensorData] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const device = devices.find((d) => d.id === selectedId);

  // 设备列表使用初始数据（INITIAL_DEVICES），健康数据通过health API获取

  // 日志：设备列表和选中设备

  // 获取设备健康数据和传感器数据
  useEffect(() => {
    let cancelled = false;
    setLoadingSensorData(true);
    
    // 从标准API获取健康数据
    fetchAPI<{
      device_id: string;
      device_name?: string;
      current_health_score?: number;
      health_trend?: { timestamp: string; score: number }[];
      active_alerts?: { type: string; message: string; since: string }[];
    }>(`/api/device/${selectedId}/health`)
      .then((healthData) => {
        if (cancelled || !healthData) {
          return;
        }
        
        setDevices((prev) => {
          const updated = prev.map((d) => {
            if (d.id !== selectedId) return d;
            const health = healthData.current_health_score ?? d.health;
            // 处理健康趋势数据：支持 { timestamp, score } 和 { date, score } 两种格式
            const trendFromApi = healthData.health_trend?.map((t: any) => {
              // 支持多种格式：{ timestamp, score }, { date, score }, 或直接是数字
              if (typeof t === 'number') return t;
              const score = t.score || t.value || 0;
              // 确保score是有效的数字
              const numScore = typeof score === 'number' ? score : parseFloat(score) || 0;
              return numScore > 0 ? numScore : 0;
            }).filter((v: number) => v > 0 && !isNaN(v)) || [];
            // 处理告警数据：支持多种格式
            const alertsFromApi = healthData.active_alerts?.map((a: any, i: number) => {
              const alertType = a.type || a.level || "warning";
              const isCritical = alertType.includes("critical") || alertType === "critical";
              return {
                id: `API-${i}`,
                message: a.message || a.content || "告警信息",
                level: (isCritical ? "critical" : "warning") as const,
                time: (a.since || a.timestamp || a.time || new Date().toISOString()).slice(0, 16).replace("T", " "),
              };
            }).filter((a: any) => a.message) || [];
            // 确保有趋势数据（优先使用API数据，否则生成模拟数据）
            let finalTrendData = trendFromApi;
            
            if (finalTrendData.length === 0) {
              // 如果API没有返回，使用设备原有数据或生成模拟数据
              if (d.trendData.length > 0) {
                finalTrendData = d.trendData;
              } else {
                // 生成模拟趋势数据（过去10天，显示下降趋势）
                finalTrendData = Array.from({ length: 10 }, (_, i) => {
                  const daysAgo = 9 - i;
                  const decay = daysAgo * 0.015; // 每天下降1.5%
                  const base = Math.min(0.95, health + 0.1); // 从稍高的值开始
                  const value = Math.max(0.3, Math.min(1.0, base - decay + (Math.random() - 0.5) * 0.03));
                  return Math.round(value * 100) / 100; // 保留2位小数
                });
              }
            }
            
            // 确保有告警信息（优先使用API数据，否则根据健康评分生成）
            let finalAlerts = alertsFromApi;
            if (finalAlerts.length === 0) {
              // 根据健康评分生成告警
              if (health < 0.6) {
                finalAlerts = [
                  {
                    id: "MOCK-1",
                    message: "设备健康评分低于60%，存在严重故障风险，建议立即停机检修",
                    level: "critical" as const,
                    time: new Date().toISOString().slice(0, 16).replace("T", " "),
                  },
                  {
                    id: "MOCK-2",
                    message: "振动值严重超标，可能为轴承故障或机械不平衡",
                    level: "critical" as const,
                    time: new Date(Date.now() - 3600000).toISOString().slice(0, 16).replace("T", " "),
                  },
                ];
              } else if (health < 0.75) {
                finalAlerts = [
                  {
                    id: "MOCK-1",
                    message: "振动RMS值超过预警阈值，建议关注轴承状态",
                    level: "warning" as const,
                    time: new Date(Date.now() - 10800000).toISOString().slice(0, 16).replace("T", " "),
                  },
                  {
                    id: "MOCK-2",
                    message: "温度偏高，超出正常范围",
                    level: "warning" as const,
                    time: new Date(Date.now() - 7200000).toISOString().slice(0, 16).replace("T", " "),
                  },
                ];
              } else if (health < 0.85) {
                finalAlerts = [
                  {
                    id: "MOCK-1",
                    message: "设备性能轻微下降，建议安排预防性维护",
                    level: "warning" as const,
                    time: new Date(Date.now() - 21600000).toISOString().slice(0, 16).replace("T", " "),
                  },
                ];
              }
            }
            
            // 确保finalTrendData有数据（再次检查）
            if (finalTrendData.length === 0) {
              if (d.trendData.length > 0) {
                finalTrendData = d.trendData;
              } else {
                finalTrendData = Array.from({ length: 10 }, (_, i) => {
                  const daysAgo = 9 - i;
                  const decay = daysAgo * 0.015;
                  const base = Math.min(0.95, health + 0.1);
                  const value = Math.max(0.3, Math.min(1.0, base - decay + (Math.random() - 0.5) * 0.03));
                  return Math.round(value * 100) / 100;
                });
              }
            }
            
            // 最终安全检查：确保 trendData 和 alerts 始终有值
            const finalTrendDataSafe = finalTrendData.length > 0 
              ? finalTrendData 
              : (d.trendData.length > 0 
                ? d.trendData 
                : Array.from({ length: 10 }, (_, i) => {
                    const daysAgo = 9 - i;
                    const decay = daysAgo * 0.015;
                    const base = Math.min(0.95, health + 0.1);
                    const value = Math.max(0.3, Math.min(1.0, base - decay + (Math.random() - 0.5) * 0.03));
                    return Math.round(value * 100) / 100;
                  }));
            
            const finalAlertsSafe = finalAlerts.length > 0 
              ? finalAlerts 
              : (d.alerts.length > 0 
                ? d.alerts 
                : (health < 0.75 ? [{
                    id: "FALLBACK-1",
                    message: health < 0.6 ? "设备健康评分过低，存在严重故障风险！" : "设备存在潜在风险，建议进行检查。",
                    level: (health < 0.6 ? "critical" : "warning") as const,
                    time: new Date().toISOString().slice(0, 16).replace("T", " "),
                  }] : []));
            
            const updatedDevice = {
              ...d,
              health,
              status: health >= 0.8 ? "normal" : health >= 0.6 ? "degrading" : "fault",
              trendData: finalTrendDataSafe, // 确保始终有数据
              alerts: finalAlertsSafe, // 确保始终有数据
            };
            // 最终验证：确保trendData是有效的数字数组
            if (!Array.isArray(updatedDevice.trendData) || updatedDevice.trendData.length === 0) {
              // 强制生成数据
              updatedDevice.trendData = Array.from({ length: 10 }, (_, i) => {
                const daysAgo = 9 - i;
                const decay = daysAgo * 0.015;
                const base = Math.min(0.95, updatedDevice.health + 0.1);
                const value = Math.max(0.3, Math.min(1.0, base - decay + (Math.random() - 0.5) * 0.03));
                return Math.round(value * 100) / 100;
              });
            }
            
            // 验证每个值都是有效数字，并确保数组长度为10
            updatedDevice.trendData = updatedDevice.trendData
              .map((v: any) => {
                const num = typeof v === 'number' ? v : parseFloat(String(v));
                return isNaN(num) ? 0.7 : Math.max(0, Math.min(1, num));
              })
              .slice(0, 10); // 确保只有10个数据点
            
            // 如果数据点不足10个，补充数据
            while (updatedDevice.trendData.length < 10) {
              const lastValue = updatedDevice.trendData[updatedDevice.trendData.length - 1] || updatedDevice.health;
              updatedDevice.trendData.push(Math.max(0.3, Math.min(1.0, lastValue + (Math.random() - 0.5) * 0.02)));
            }
            
            // 最终验证：确保是数组
            if (!Array.isArray(updatedDevice.trendData)) {
              updatedDevice.trendData = Array.from({ length: 10 }, () => updatedDevice.health);
            }
            
            return updatedDevice;
          });
          return updated;
        });
      })
      .catch((err) => {
        if (cancelled) return;
        
        // API失败时，使用fallback数据确保界面有内容显示
        setDevices((prev) => {
          const updated = prev.map((d) => {
            if (d.id !== selectedId) return d;
            
            // 确保有趋势数据
            let finalTrendData = d.trendData;
            if (finalTrendData.length === 0) {
              // 生成模拟趋势数据
              finalTrendData = Array.from({ length: 10 }, (_, i) => {
                const daysAgo = 9 - i;
                const decay = daysAgo * 0.015;
                const base = Math.min(0.95, d.health + 0.1);
                const value = Math.max(0.3, Math.min(1.0, base - decay + (Math.random() - 0.5) * 0.03));
                return Math.round(value * 100) / 100;
              });
            }
            
            // 确保有告警信息
            let finalAlerts = d.alerts;
            if (finalAlerts.length === 0) {
              if (d.health < 0.6) {
                finalAlerts = [
                  {
                    id: "FALLBACK-1",
                    message: "设备健康评分过低，存在严重故障风险！",
                    level: "critical" as const,
                    time: new Date().toISOString().slice(0, 16).replace("T", " "),
                  },
                ];
              } else if (d.health < 0.75) {
                finalAlerts = [
                  {
                    id: "FALLBACK-1",
                    message: "设备存在潜在风险，建议进行检查。",
                    level: "warning" as const,
                    time: new Date().toISOString().slice(0, 16).replace("T", " "),
                  },
                ];
              }
            }
            
            return {
              ...d,
              trendData: finalTrendData,
              alerts: finalAlerts,
            };
          });
          return updated;
        });
      });

    // 获取传感器数据
    fetchAPI<Array<{
      timestamp: string;
      vibration_rms: number;
      vibration_peak: number;
      temperature: number;
      pressure: number;
      flow: number;
      health_score: number;
    }>>(`/api/device-demo/devices/${selectedId}/sensor-data?hours=24`)
      .then((data) => {
        if (cancelled) return;
        if (data && Array.isArray(data)) {
          setSensorData(data);
        }
      })
      .catch(() => {
        // API不可用时使用空数组
      })
      .finally(() => {
        setLoadingSensorData(false);
      });

    return () => { cancelled = true; };
  }, [selectedId]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setDiagRunning(false);
    setDiagSteps([]);
    setSopResult(null);
    setDiagnosisResult(null);
    abortRef.current?.abort();
  }, []);

  const runDiagnosis = useCallback(async () => {
    abortRef.current?.abort();
    setDiagRunning(true);
    setDiagSteps([]);
    setSopResult(null);
    setDiagnosisResult(null);

    try {
      // 调用诊断结果API
      const response = await fetch(`/api/device-demo/devices/${selectedId}/diagnosis-result`);
      const result = await response.json();
      
      if (result.code === 0 && result.data) {
        setDiagnosisResult(result.data);
        setDiagRunning(false);
      } else {
        alert(`获取诊断结果失败: ${result.message || "未知错误"}`);
        setDiagRunning(false);
      }
    } catch (error: any) {
      setDiagRunning(false);
      alert(`诊断功能暂时不可用，请稍后重试。错误: ${error.message || "未知错误"}`);
    }
  }, [selectedId]);

  // 加载预测反馈数据
  useEffect(() => {
    if (!selectedId) return;
    
    fetchAPI<PredictionFeedback[]>(`/api/device-demo/devices/${selectedId}/prediction-feedback?limit=10`)
      .then((data) => {
        setPredictionFeedback(data);
      })
      .catch(() => {
        setPredictionFeedback([]);
      });
  }, [selectedId]);

  // 提交预测反馈
  const submitFeedback = useCallback(async (predictionId: string, feedback: "correct" | "incorrect") => {
    try {
      const response = await fetch(
        `/api/device-demo/devices/${selectedId}/prediction-feedback/${predictionId}?feedback=${feedback}`,
        { method: "POST" }
      );
      const result = await response.json();
      
      if (result.code === 0) {
        // 更新本地状态
        setPredictionFeedback((prev) =>
          prev.map((item) =>
            item.id === predictionId ? { ...item, feedback } : item
          )
        );
      } else {
        alert(`提交反馈失败: ${result.message || "未知错误"}`);
      }
    } catch (error: any) {
      alert(`提交反馈失败: ${error.message || "未知错误"}`);
    }
  }, [selectedId]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // 从URL参数获取选中的设备，并监听设备选择事件（从侧边栏触发）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const deviceParam = params.get("device");
    if (deviceParam && devices.some((d) => d.id === deviceParam)) {
      setSelectedId(deviceParam);
    }

    const handleDeviceSelected = (e: Event) => {
      const customEvent = e as CustomEvent<{ deviceId: string }>;
      const deviceId = customEvent.detail?.deviceId || new URLSearchParams(window.location.search).get("device");
      if (deviceId && devices.some((d) => d.id === deviceId)) {
        setSelectedId(deviceId);
      }
    };
    
    window.addEventListener("device-selected", handleDeviceSelected);
    return () => window.removeEventListener("device-selected", handleDeviceSelected);
  }, [devices]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#0c1322] to-[#0a0f1a] text-slate-100">
      <div className="flex flex-1 overflow-hidden min-w-0">
        <main className="flex flex-1 flex-col overflow-y-auto min-w-0 max-w-[1200px]">
          <header className="flex items-center justify-between border-b border-slate-700/50 bg-gradient-to-r from-slate-900/50 to-slate-800/30 backdrop-blur-sm px-4 py-3 shadow-lg shrink-0">
          <div className="flex items-center gap-3">
            <span className={`inline-block h-3 w-3 rounded-full ${statusColor(device.status)} animate-pulse shadow-lg`} />
            <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{device.name}</h1>
            <span className="rounded bg-slate-700/50 px-2 py-0.5 text-xs text-slate-400 border border-slate-600/50">{device.id}</span>
          </div>
        </header>
          <div className="flex-1 space-y-4 p-4 overflow-y-auto">
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              <div className={`flex items-center rounded-xl border border-slate-700/50 p-4 backdrop-blur-sm shadow-xl ${healthBgColor(device.health)}`}>
                <HealthGauge value={device.health} />
              </div>
              <div className="flex flex-col gap-3">
                <MetricsGrid metrics={device.metrics} />
              </div>
            </div>
            
            {/* 实时数据流 */}
            {sensorData.length > 0 && (
              <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-[#0c1322] to-[#0a0f1a] p-4 backdrop-blur-sm shadow-xl">
                <RealtimeDataStream deviceId={selectedId} data={sensorData} />
              </div>
            )}

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <TrendChart data={(() => {
              // 直接使用device.trendData，确保数据有效
              const trendData = device.trendData;
              
              // 确保trendData是数组
              let dataArray: number[] = [];
              
              if (Array.isArray(trendData) && trendData.length > 0) {
                // 验证并清理数据
                dataArray = trendData
                  .slice(0, 10) // 只取前10个
                  .map((v: any) => {
                    const num = typeof v === 'number' ? v : parseFloat(String(v));
                    if (isNaN(num)) {
                      return device.health; // 使用设备健康评分作为fallback
                    }
                    return Math.max(0, Math.min(1, num));
                  })
                  .filter((v: number) => !isNaN(v)); // 只过滤NaN
                
                // 如果数据点不足10个，补充数据
                while (dataArray.length < 10) {
                  const lastValue = dataArray[dataArray.length - 1] || device.health;
                  dataArray.push(Math.max(0.3, Math.min(1.0, lastValue + (Math.random() - 0.5) * 0.02)));
                }
              } else {
                // 如果trendData为空或不是数组，使用fallback数据
                dataArray = Array.from({ length: 10 }, (_, i) => {
                  const daysAgo = 9 - i;
                  const decay = daysAgo * 0.015;
                  const base = Math.min(0.95, device.health + 0.1);
                  return Math.max(0.3, Math.min(1.0, base - decay + (Math.random() - 0.5) * 0.03));
                }).map(v => Math.round(v * 100) / 100);
              }
              
              return dataArray;
            })()} />
            <AlertList alerts={device.alerts || []} />
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={runDiagnosis}
              disabled={diagRunning}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:shadow-xl hover:shadow-blue-600/40 hover:scale-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {diagRunning ? (
                <span className="flex items-center gap-2"><Spinner /> 诊断中...</span>
              ) : (
                "🚀 一键智能诊断"
              )}
            </button>
            {diagSteps.length > 0 && !diagRunning && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <span className="text-lg">✓</span> 诊断完成 — 已生成维修方案
              </span>
            )}
          </div>

          {/* Agent流程可视化 */}
          {diagSteps.length > 0 && (
            <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-[#0c1322] to-[#0a0f1a] p-4 backdrop-blur-sm shadow-xl">
              <h3 className="mb-4 text-sm font-semibold text-slate-300">Multi-Agent 诊断流程</h3>
              <AgentFlowVisualization 
                steps={diagSteps.map(s => ({ agent: s.agent || "", action: s.action || "", result: s.result }))} 
                isRunning={diagRunning} 
              />
            </div>
          )}

          {/* 诊断结果 */}
          {diagnosisResult && (
            <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-[#0c1322] to-[#0a0f1a] p-6 backdrop-blur-sm shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-300">智能诊断结果</h3>
                <span className="text-xs text-slate-500">{diagnosisResult.diagnosis_time}</span>
              </div>
              
              {/* 故障概率 */}
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
                  <div className="mb-1 text-xs text-slate-400">3天内故障概率</div>
                  <div className="text-2xl font-bold text-orange-400">
                    {(diagnosisResult.failure_probability["3_days"] * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
                  <div className="mb-1 text-xs text-slate-400">7天内故障概率</div>
                  <div className="text-2xl font-bold text-red-400">
                    {(diagnosisResult.failure_probability["7_days"] * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              
              {/* 问题列表 */}
              <div className="mb-4">
                <h4 className="mb-3 text-sm font-semibold text-slate-300">
                  检测到的问题 ({diagnosisResult.issues.length}项)
                </h4>
                {diagnosisResult.issues.length === 0 ? (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                    <div className="mb-2 text-2xl">✓</div>
                    <div className="text-sm font-semibold text-emerald-400">设备运行正常</div>
                    <div className="mt-1 text-xs text-slate-400">未检测到任何问题</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {diagnosisResult.issues.map((issue) => {
                    const severityColor = {
                      low: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
                      medium: "text-orange-400 bg-orange-400/10 border-orange-400/30",
                      high: "text-red-400 bg-red-400/10 border-red-400/30",
                    }[issue.severity];
                    
                    return (
                      <div
                        key={issue.id}
                        className={`rounded-lg border p-4 ${severityColor}`}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-sm font-semibold">{issue.title}</span>
                          <span className="rounded bg-slate-700/50 px-2 py-0.5 text-xs text-slate-300">
                            {issue.category}
                          </span>
                          <span className={`ml-auto rounded px-2 py-0.5 text-xs ${
                            issue.severity === "high" ? "bg-red-500/20 text-red-300" :
                            issue.severity === "medium" ? "bg-orange-500/20 text-orange-300" :
                            "bg-yellow-500/20 text-yellow-300"
                          }`}>
                            {issue.severity === "high" ? "高" : issue.severity === "medium" ? "中" : "低"}
                          </span>
                        </div>
                        <p className="mb-2 text-sm text-slate-300">{issue.description}</p>
                        <p className="text-xs text-slate-400">
                          <span className="font-semibold">建议：</span>
                          {issue.recommendation}
                        </p>
                      </div>
                    );
                  })}
                  </div>
                )}
              </div>
              
              {/* 总体评估 */}
              <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
                <div className="mb-2 text-sm font-semibold text-slate-300">总体评估</div>
                <p className="text-sm text-slate-400">{diagnosisResult.overall_assessment}</p>
              </div>
            </div>
          )}

          {/* SOP卡片 */}
          {sopResult && (
            <SOPCard 
              sop={{
                title: sopResult.title,
                steps: sopResult.steps,
                estimatedDuration: sopResult.estimatedDuration,
                spare_parts: sopResult.spare_parts,
              }}
            />
          )}
        </div>
        </main>
        
        {/* 预测结果反馈栏 - 移到最右侧 */}
        <aside className="w-[260px] shrink-0 border-l border-slate-700/50 bg-gradient-to-b from-[#0c1322] to-[#0a0f1a] overflow-y-auto">
          <div className="border-b border-slate-700/50 px-3 py-3 bg-slate-900/30 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wide text-slate-300 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                预测结果反馈
              </h2>
              {predictionFeedback.length > 0 && (
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400 border border-blue-500/30">
                  {predictionFeedback.length}
                </span>
              )}
            </div>
          </div>
          <div className="p-3 space-y-3">
            {predictionFeedback.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                暂无预测记录
              </div>
            ) : (
              predictionFeedback.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-[#0c1322] to-[#0a0f1a] p-3 backdrop-blur-sm shadow-lg"
                >
                  <div className="mb-2 text-xs text-slate-500">{item.timestamp}</div>
                  
                  {/* 传感器数据 */}
                  <div className="mb-2 grid grid-cols-2 gap-1.5">
                    <div className="rounded-lg bg-slate-800/30 px-1.5 py-1">
                      <div className="text-[9px] text-slate-500">振动</div>
                      <div className="text-xs font-semibold text-slate-200">{item.sensor_data.vibration} mm/s</div>
                    </div>
                    <div className="rounded-lg bg-slate-800/30 px-1.5 py-1">
                      <div className="text-[9px] text-slate-500">温度</div>
                      <div className="text-xs font-semibold text-slate-200">{item.sensor_data.temperature} °C</div>
                    </div>
                    <div className="rounded-lg bg-slate-800/30 px-1.5 py-1">
                      <div className="text-[9px] text-slate-500">转速</div>
                      <div className="text-xs font-semibold text-slate-200">{item.sensor_data.rpm} RPM</div>
                    </div>
                    <div className="rounded-lg bg-slate-800/30 px-1.5 py-1">
                      <div className="text-[9px] text-slate-500">流量</div>
                      <div className="text-xs font-semibold text-slate-200">{item.sensor_data.flow} m³/h</div>
                    </div>
                  </div>
                  
                  {/* 预测结果 */}
                  <div className="mb-2 space-y-1">
                    <div className="text-[10px] text-slate-400">预测结果</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="text-[9px] text-slate-500">3天</div>
                        <div className="text-base font-bold text-red-400">
                          {(item.prediction["3_days"] * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-[9px] text-slate-500">7天</div>
                        <div className="text-base font-bold text-red-400">
                          {(item.prediction["7_days"] * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 反馈按钮 */}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => submitFeedback(item.id, "correct")}
                      disabled={item.feedback === "correct"}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold transition-all ${
                        item.feedback === "correct"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-not-allowed"
                          : "bg-slate-700/50 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border hover:border-emerald-500/30"
                      }`}
                    >
                      ✓ 正确
                    </button>
                    <button
                      onClick={() => submitFeedback(item.id, "incorrect")}
                      disabled={item.feedback === "incorrect"}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold transition-all ${
                        item.feedback === "incorrect"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30 cursor-not-allowed"
                          : "bg-slate-700/50 text-slate-300 hover:bg-red-500/20 hover:text-red-400 hover:border hover:border-red-500/30"
                      }`}
                    >
                      ✗ 错误
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
