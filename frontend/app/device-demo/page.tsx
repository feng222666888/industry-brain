"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import HealthDashboard from "../../components/device-demo/HealthDashboard";
import RealtimeDataStream from "../../components/device-demo/RealtimeDataStream";
import AgentFlowVisualization from "../../components/device-demo/AgentFlowVisualization";
import SOPCard from "../../components/device-demo/SOPCard";
import Device3DViewer from "../../components/device-demo/Device3DViewer";

// API工具函数（简化版，实际应从主应用导入）
const BASE = "";

async function fetchAPI<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || "API error");
  return json.data;
}

function sseStream(
  path: string,
  body: Record<string, unknown>,
  onEvent: (event: string, data: unknown) => void,
  onDone: () => void,
): AbortController {
  const ctrl = new AbortController();
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: ctrl.signal,
  })
    .then(async (res) => {
      if (!res.body) return onDone();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        let eventType = "message";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            try {
              onEvent(eventType, JSON.parse(line.slice(6)));
            } catch {
              onEvent(eventType, line.slice(6));
            }
          }
        }
      }
      onDone();
    })
    .catch(() => onDone());
  return ctrl;
}

interface Device {
  device_id: string;
  device_name: string;
  device_type: string;
  parent_unit: string;
}

interface DeviceHealth {
  device_id: string;
  device_name: string;
  device_type: string;
  current_health_score: number;
  health_trend: Array<{ timestamp: string; score: number }>;
  active_alerts: Array<{ type: string; message: string; since: string }>;
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

interface DiagnosisStep {
  agent: string;
  action: string;
  result?: string;
  summary?: string;
}

interface SOPData {
  sop_id?: string;
  title: string;
  steps: string[];
  estimated_duration_hours?: number;
  estimatedDuration?: string;
  safety_precautions?: string[];
  tools_required?: string[];
  spare_parts?: string[];
}

export default function DeviceDemoPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [deviceHealth, setDeviceHealth] = useState<DeviceHealth | null>(null);
  const [sensorData, setSensorData] = useState<SensorDataPoint[]>([]);
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagSteps, setDiagSteps] = useState<DiagnosisStep[]>([]);
  const [sopResult, setSopResult] = useState<SOPData | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 加载设备列表
  useEffect(() => {
    fetchAPI<Device[]>("/api/device-demo/devices")
      .then((data) => {
        setDevices(data);
        if (data.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(data[0].device_id);
        }
      })
      .catch((err) => {
        console.error("Failed to load devices:", err);
      });
  }, []);

  // 加载选中设备的健康状态
  useEffect(() => {
    if (!selectedDeviceId) return;

    fetchAPI<DeviceHealth>(`/api/device-demo/devices/${selectedDeviceId}/health`)
      .then((data) => {
        setDeviceHealth(data);
      })
      .catch((err) => {
        console.error("Failed to load device health:", err);
      });

    // 加载传感器数据
    fetchAPI<SensorDataPoint[]>(
      `/api/device-demo/devices/${selectedDeviceId}/sensor-data?hours=24&limit=100`,
    )
      .then((data) => {
        setSensorData(data);
      })
      .catch((err) => {
        console.error("Failed to load sensor data:", err);
      });
  }, [selectedDeviceId]);

  const handleSelectDevice = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setDiagRunning(false);
    setDiagSteps([]);
    setSopResult(null);
    abortRef.current?.abort();
  }, []);

  const runDiagnosis = useCallback(() => {
    if (!selectedDeviceId) return;

    abortRef.current?.abort();
    setDiagRunning(true);
    setDiagSteps([]);
    setSopResult(null);

    const ctrl = sseStream(
      `/api/device-demo/devices/${selectedDeviceId}/diagnose`,
      {
        device_id: selectedDeviceId,
        anomaly_type: "vibration_bearing",
        context: "routine_check",
      },
      (event, data) => {
        if (event === "agent_step") {
          const step = data as DiagnosisStep;
          setDiagSteps((prev) => [...prev, step]);
        } else if (event === "complete") {
          const result = data as {
            results?: Record<string, { sop_title?: string; sop_steps?: string[]; estimated_duration?: string }>;
          };
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
  }, [selectedDeviceId]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const selectedDevice = devices.find((d) => d.device_id === selectedDeviceId);

  return (
    <div className="particles-bg flex h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* 侧边栏 - 设备列表 */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="border-b border-slate-700/50 px-4 py-4">
          <h2 className="text-sm font-semibold tracking-wide text-slate-300">设备列表</h2>
          <p className="mt-1 text-xs text-slate-500">{devices.length} 台设备</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {devices.map((device) => (
            <button
              key={device.device_id}
              onClick={() => handleSelectDevice(device.device_id)}
              className={`mb-2 w-full rounded-lg border p-3 text-left transition-all ${
                selectedDeviceId === device.device_id
                  ? "border-blue-500/50 bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/20"
                  : "border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-slate-600 hover:bg-slate-800/50"
              }`}
            >
              <p className="text-sm font-medium">{device.device_name}</p>
              <p className="mt-1 text-xs text-slate-500">{device.device_type}</p>
              <p className="mt-1 text-xs text-slate-600">{device.parent_unit}</p>
            </button>
          ))}
        </nav>
      </aside>

      {/* 主内容区 */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        {/* 顶部导航栏 */}
        <header className="border-b border-slate-700/50 bg-slate-900/30 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-200">
                {selectedDevice?.device_name || "设备预测性维护演示"}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {selectedDevice?.device_id || ""} · {selectedDevice?.device_type || ""}
              </p>
            </div>
            <button
              onClick={runDiagnosis}
              disabled={diagRunning || !selectedDeviceId}
              className="button-glow rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {diagRunning ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  诊断中...
                </span>
              ) : (
                "一键智能诊断"
              )}
            </button>
          </div>
        </header>

        {/* 内容区域 */}
        <div className="flex-1 space-y-6 p-6">
          {deviceHealth && selectedDevice ? (
            <>
              {/* 第一行：健康仪表盘和3D视图 */}
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="fade-in card-hover">
                  <HealthDashboard
                  healthScore={deviceHealth.current_health_score}
                  deviceName={deviceHealth.device_name}
                  deviceType={deviceHealth.device_type}
                  trendData={deviceHealth.health_trend}
                  />
                </div>
                <div className="fade-in card-hover">
                  <Device3DViewer
                  deviceId={selectedDevice.device_id}
                  deviceType={selectedDevice.device_type}
                  healthScore={deviceHealth.current_health_score}
                  />
                </div>
              </div>

              {/* 第二行：实时数据流 */}
              {sensorData.length > 0 && (
                <div className="slide-in data-stream">
                  <RealtimeDataStream deviceId={selectedDevice.device_id} data={sensorData} />
                </div>
              )}

              {/* 第三行：Agent流程可视化 */}
              {(diagSteps.length > 0 || diagRunning) && (
                <div className="slide-in">
                  <AgentFlowVisualization steps={diagSteps} isRunning={diagRunning} />
                </div>
              )}

              {/* 第四行：SOP卡片 */}
              {sopResult && (
                <div className="slide-in">
                  <SOPCard sop={sopResult} />
                </div>
              )}
            </>
          ) : (
            <div className="flex h-64 items-center justify-center">
              <p className="text-slate-500">加载中...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
