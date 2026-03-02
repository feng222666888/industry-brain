"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "../../lib/api";

interface ModelInfo {
  alias: string;
  engine: string;
  model: string;
  purpose: string;
  params: string;
  status: "connected" | "disconnected" | "unknown";
}

interface EngineStatus {
  connected: boolean;
  models_loaded: string[];
  gpu_memory?: string;
}

interface ModelMetrics {
  alias: string;
  calls: number;
  avgLatency: string;
  tokens: number;
}

interface RouteBinding {
  agent: string;
  model_alias: string;
}

export default function ModelGatewayPage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [engine, setEngine] = useState<EngineStatus>({ connected: false, models_loaded: [] });
  const [metrics, setMetrics] = useState<ModelMetrics[]>([]);
  const [routes, setRoutes] = useState<RouteBinding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      fetchAPI<{ models: ModelInfo[]; routes: RouteBinding[] }>("/api/model-gateway/models"),
      fetchAPI<EngineStatus>("/api/model-gateway/status"),
      fetchAPI<{ metrics: ModelMetrics[] }>("/api/model-gateway/metrics"),
    ]).then(([mRes, eRes, meRes]) => {
      if (cancelled) return;
      if (mRes.status === "fulfilled") {
        setModels(mRes.value.models || []);
        setRoutes(mRes.value.routes || []);
      }
      if (eRes.status === "fulfilled") setEngine(eRes.value);
      if (meRes.status === "fulfilled") setMetrics(meRes.value.metrics || []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800 px-6 py-4">
        <h1 className="text-xl font-bold">模型网关</h1>
        <p className="mt-1 text-sm text-slate-400">LiteLLM 统一接入 · Ollama 本地推理</p>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-5 py-4">
          <span className={`h-3 w-3 rounded-full ${engine.connected ? "bg-emerald-500" : "bg-red-500"}`} />
          <span className="text-sm font-medium text-slate-200">
            Ollama 推理引擎：{engine.connected ? "已连接" : "未连接"}
          </span>
          {engine.gpu_memory && (
            <span className="ml-auto text-xs text-slate-500">GPU 内存 {engine.gpu_memory}</span>
          )}
        </div>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {models.map((m) => (
            <div key={m.alias} className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-blue-400">{m.alias}</h3>
                <span className={`h-2.5 w-2.5 rounded-full ${
                  m.status === "connected" ? "bg-emerald-500" : m.status === "disconnected" ? "bg-red-500" : "bg-slate-500"
                }`} />
              </div>
              <p className="mt-2 text-sm text-slate-400">{m.purpose}</p>
              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <p>引擎: <span className="text-slate-300">{m.engine}</span></p>
                <p>模型: <span className="font-mono text-slate-300">{m.model}</span></p>
                <p>参数量: <span className="text-slate-300">{m.params}</span></p>
              </div>
            </div>
          ))}
          {models.length === 0 && (
            <p className="col-span-4 py-12 text-center text-sm text-slate-500">{loading ? "加载中…" : "暂无模型配置"}</p>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-700 bg-slate-800">
            <h2 className="border-b border-slate-700 px-4 py-3 text-sm font-medium text-slate-300">Agent → 模型路由</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-slate-400">
                  <th className="px-4 py-2 font-medium">Agent</th>
                  <th className="px-4 py-2 font-medium">模型</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((r, i) => (
                  <tr key={i} className="border-b border-slate-700/50">
                    <td className="px-4 py-2 font-mono text-blue-400">{r.agent}</td>
                    <td className="px-4 py-2 text-slate-300">{r.model_alias}</td>
                  </tr>
                ))}
                {routes.length === 0 && (
                  <tr><td colSpan={2} className="px-4 py-6 text-center text-slate-500">暂无路由</td></tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-800">
            <h2 className="border-b border-slate-700 px-4 py-3 text-sm font-medium text-slate-300">调用统计</h2>
            <div className="space-y-3 p-4">
              {metrics.map((m) => {
                const maxCalls = Math.max(...metrics.map((x) => x.calls), 1);
                return (
                  <div key={m.alias} className="flex items-center gap-3">
                    <span className="w-32 truncate text-sm text-slate-400">{m.alias}</span>
                    <div className="flex-1">
                      <div className="h-5 overflow-hidden rounded bg-slate-700">
                        <div className="h-full rounded bg-purple-500" style={{ width: `${(m.calls / maxCalls) * 100}%` }} />
                      </div>
                    </div>
                    <span className="w-20 text-right text-xs text-slate-300">{m.calls} 次 · {m.avgLatency}</span>
                  </div>
                );
              })}
              {metrics.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-500">{loading ? "加载中…" : "暂无统计"}</p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
