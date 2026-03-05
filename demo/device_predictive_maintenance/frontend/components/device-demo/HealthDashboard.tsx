"use client";

import { useEffect, useRef } from "react";

interface HealthDashboardProps {
  healthScore: number;
  deviceName: string;
  deviceType: string;
  trendData: Array<{ timestamp: string; score: number }>;
}

export default function HealthDashboard({
  healthScore,
  deviceName,
  deviceType,
  trendData,
}: HealthDashboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 绘制背景圆环
    ctx.strokeStyle = "rgba(51, 65, 85, 0.5)";
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 绘制健康值圆环
    const healthPercent = healthScore;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * healthPercent;

    // 根据健康值选择颜色
    let color = "#10b981"; // 绿色
    if (healthScore < 0.6) {
      color = "#ef4444"; // 红色
    } else if (healthScore < 0.8) {
      color = "#f59e0b"; // 黄色
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 20;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.stroke();

    // 绘制中心文字
    ctx.fillStyle = "#f1f5f9";
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${Math.round(healthScore * 100)}`, centerX, centerY - 10);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px sans-serif";
    ctx.fillText("健康评分", centerX, centerY + 20);
  }, [healthScore]);

  // 获取健康状态文本
  const getHealthStatus = () => {
    if (healthScore >= 0.8) return "设备运行正常";
    if (healthScore >= 0.6) return "性能退化，建议关注";
    return "存在故障风险";
  };

  const healthColor =
    healthScore >= 0.8
      ? "text-emerald-400"
      : healthScore >= 0.6
        ? "text-amber-400"
        : "text-red-400";

  return (
    <div className="rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-900/50 to-slate-800/30 p-6 backdrop-blur-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-400">设备健康状态</h3>
        <p className="mt-1 text-lg font-bold text-slate-200">{deviceName}</p>
        <p className="text-xs text-slate-500">{deviceType}</p>
      </div>

      <div className="flex items-center justify-center">
        <div className="relative">
          <canvas ref={canvasRef} width={200} height={200} className="drop-shadow-lg" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className={`text-4xl font-extrabold ${healthColor}`}>
                {Math.round(healthScore * 100)}
                <span className="text-lg font-normal text-slate-500">/100</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className={`text-sm font-medium ${healthColor}`}>{getHealthStatus()}</p>
      </div>

      {/* 趋势图 */}
      {trendData.length > 0 && (
        <div className="mt-6">
          <h4 className="mb-2 text-xs font-semibold text-slate-400">健康趋势</h4>
          <div className="flex h-16 items-end gap-1">
            {trendData.slice(-10).map((point, i) => {
              const height = (point.score / 1.0) * 100;
              const bgColor =
                point.score >= 0.8
                  ? "bg-emerald-500"
                  : point.score >= 0.6
                    ? "bg-amber-500"
                    : "bg-red-500";
              return (
                <div key={i} className="flex-1">
                  <div
                    className={`w-full rounded-t transition-all ${bgColor}`}
                    style={{ height: `${height}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
