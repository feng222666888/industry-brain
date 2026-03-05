"use client";

import { useEffect, useRef } from "react";

interface Device3DViewerProps {
  deviceId: string;
  deviceType: string;
  healthScore: number;
}

export default function Device3DViewer({
  deviceId,
  deviceType,
  healthScore,
}: Device3DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 绘制渐变背景
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "rgba(59, 130, 246, 0.1)");
    gradient.addColorStop(1, "rgba(16, 185, 129, 0.1)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 根据设备类型绘制简化的3D效果
    const centerX = width / 2;
    const centerY = height / 2;
    const size = Math.min(width, height) * 0.3;

    // 根据健康值选择颜色
    let color = "#10b981";
    if (healthScore < 0.6) {
      color = "#ef4444";
    } else if (healthScore < 0.8) {
      color = "#f59e0b";
    }

    // 绘制设备图标（简化版，实际可以使用Three.js）
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;

    // 绘制一个简化的设备形状（圆形代表泵/压缩机）
    if (deviceType.includes("pump") || deviceType.includes("compressor")) {
      // 主体圆形
      ctx.beginPath();
      ctx.arc(centerX, centerY, size * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 内部圆环
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size * 0.4, 0, Math.PI * 2);
      ctx.stroke();

      // 连接管道
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(centerX - size * 0.8, centerY);
      ctx.lineTo(centerX - size * 0.6, centerY);
      ctx.moveTo(centerX + size * 0.6, centerY);
      ctx.lineTo(centerX + size * 0.8, centerY);
      ctx.stroke();
    } else if (deviceType.includes("heat_exchanger") || deviceType.includes("reactor")) {
      // 矩形代表换热器/反应器
      const rectWidth = size * 1.2;
      const rectHeight = size * 0.8;
      ctx.fillRect(centerX - rectWidth / 2, centerY - rectHeight / 2, rectWidth, rectHeight);
      ctx.strokeRect(centerX - rectWidth / 2, centerY - rectHeight / 2, rectWidth, rectHeight);
    }

    // 绘制健康值指示器
    ctx.fillStyle = "#f1f5f9";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${Math.round(healthScore * 100)}%`, centerX, centerY + size * 0.9);

    // 绘制光晕效果
    const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size);
    glowGradient.addColorStop(0, color + "40");
    glowGradient.addColorStop(1, color + "00");
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, size * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }, [deviceType, healthScore]);

  return (
    <div className="rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-900/50 to-slate-800/30 p-6 backdrop-blur-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-300">设备3D视图</h3>
      <div className="relative flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={400}
          height={300}
          className="rounded-lg"
        />
        {/* 设备信息覆盖层 */}
        <div className="absolute bottom-4 left-4 right-4 rounded bg-slate-900/80 p-3 backdrop-blur-sm">
          <p className="text-xs text-slate-400">设备ID</p>
          <p className="text-sm font-semibold text-slate-200">{deviceId}</p>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-slate-500">
        注：这是简化版可视化，实际可使用Three.js实现完整3D模型
      </p>
    </div>
  );
}
