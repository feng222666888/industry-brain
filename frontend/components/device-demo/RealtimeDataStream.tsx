"use client";

import { useEffect, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";

interface SensorDataPoint {
  timestamp: string;
  vibration_rms: number;
  vibration_peak: number;
  temperature: number;
  pressure: number;
  flow: number;
  health_score: number;
}

interface RealtimeDataStreamProps {
  deviceId: string;
  data: SensorDataPoint[];
}

export default function RealtimeDataStream({ deviceId, data }: RealtimeDataStreamProps) {
  const [selectedMetric, setSelectedMetric] = useState<"vibration" | "temperature" | "pressure" | "flow">("vibration");

  // 准备图表数据
  const chartData = data.slice(-50); // 最近50个数据点
  const timestamps = chartData.map((d) => {
    const date = new Date(d.timestamp);
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
  });

  const getMetricData = () => {
    switch (selectedMetric) {
      case "vibration":
        return {
          name: "振动RMS",
          unit: "mm/s",
          data: chartData.map((d) => d.vibration_rms),
          color: "#3b82f6",
        };
      case "temperature":
        return {
          name: "温度",
          unit: "°C",
          data: chartData.map((d) => d.temperature),
          color: "#ef4444",
        };
      case "pressure":
        return {
          name: "压力",
          unit: "MPa",
          data: chartData.map((d) => d.pressure),
          color: "#10b981",
        };
      case "flow":
        return {
          name: "流量",
          unit: "m³/h",
          data: chartData.map((d) => d.flow),
          color: "#f59e0b",
        };
    }
  };

  const metric = getMetricData();

  const chartOption = {
    backgroundColor: "transparent",
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: "10%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: timestamps,
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: "#475569",
        },
      },
      axisLabel: {
        color: "#94a3b8",
        fontSize: 10,
      },
    },
    yAxis: {
      type: "value",
      name: metric.unit,
      nameTextStyle: {
        color: "#94a3b8",
      },
      axisLine: {
        lineStyle: {
          color: "#475569",
        },
      },
      axisLabel: {
        color: "#94a3b8",
        fontSize: 10,
      },
      splitLine: {
        lineStyle: {
          color: "#1e293b",
        },
      },
    },
    series: [
      {
        name: metric.name,
        type: "line",
        data: metric.data,
        smooth: true,
        lineStyle: {
          color: metric.color,
          width: 2,
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: `${metric.color}40`,
              },
              {
                offset: 1,
                color: `${metric.color}00`,
              },
            ],
          },
        },
        symbol: "circle",
        symbolSize: 4,
        itemStyle: {
          color: metric.color,
        },
      },
    ],
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: "#475569",
      textStyle: {
        color: "#f1f5f9",
      },
      axisPointer: {
        type: "cross",
        lineStyle: {
          color: metric.color,
        },
      },
    },
  };

  const metrics = [
    { key: "vibration" as const, label: "振动", icon: "📊" },
    { key: "temperature" as const, label: "温度", icon: "🌡️" },
    { key: "pressure" as const, label: "压力", icon: "⚡" },
    { key: "flow" as const, label: "流量", icon: "💧" },
  ];

  const latest = data[data.length - 1];
  if (!latest) return null;

  return (
    <div className="rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-900/50 to-slate-800/30 p-6 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300">实时传感器数据流</h3>
        <div className="flex gap-2">
          {metrics.map((m) => (
            <button
              key={m.key}
              onClick={() => setSelectedMetric(m.key)}
              className={`rounded px-3 py-1 text-xs font-medium transition-all ${
                selectedMetric === m.key
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2">
        {metrics.map((m) => {
          const value =
            m.key === "vibration"
              ? latest.vibration_rms.toFixed(3)
              : m.key === "temperature"
                ? latest.temperature.toFixed(1)
                : m.key === "pressure"
                  ? latest.pressure.toFixed(2)
                  : latest.flow.toFixed(1);
          return (
            <div
              key={m.key}
              className={`rounded border p-2 ${
                selectedMetric === m.key
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-700 bg-slate-800/30"
              }`}
            >
              <p className="text-xs text-slate-500">{m.label}</p>
              <p className="text-lg font-bold text-slate-200">{value}</p>
            </div>
          );
        })}
      </div>

      <div className="h-64">
        <ReactECharts option={chartOption} style={{ height: "100%", width: "100%" }} />
      </div>
    </div>
  );
}
