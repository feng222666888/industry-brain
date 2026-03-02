"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "../../lib/api";

interface ToolInfo {
  id: string;
  name: string;
  description: string;
  tags: string[];
  status: "available" | "unavailable";
  calls: number;
  avgLatency: string;
}

interface Endpoint {
  method: string;
  path: string;
  tag: string;
}

export default function ToolsPage() {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      fetchAPI<{ tools: ToolInfo[] }>("/api/tools/registry"),
      fetchAPI<{ endpoints: Endpoint[] }>("/api/tools/endpoints"),
    ]).then(([tRes, eRes]) => {
      if (cancelled) return;
      if (tRes.status === "fulfilled") setTools(tRes.value.tools || []);
      if (eRes.status === "fulfilled") setEndpoints(eRes.value.endpoints || []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const tagColors: Record<string, string> = {
    retrieval: "bg-blue-500/20 text-blue-400",
    simulation: "bg-emerald-500/20 text-emerald-400",
    browser: "bg-amber-500/20 text-amber-400",
    api: "bg-purple-500/20 text-purple-400",
  };

  const groupedEndpoints = endpoints.reduce<Record<string, Endpoint[]>>((acc, ep) => {
    (acc[ep.tag] = acc[ep.tag] || []).push(ep);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800 px-6 py-4">
        <h1 className="text-xl font-bold">工具库</h1>
        <p className="mt-1 text-sm text-slate-400">知识检索 · 仿真沙盒 · Web 浏览器 · API 连接器</p>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {tools.map((t) => (
            <div key={t.id} className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-200">{t.name}</h3>
                <span className={`h-2.5 w-2.5 rounded-full ${t.status === "available" ? "bg-emerald-500" : "bg-slate-500"}`} />
              </div>
              <p className="mt-2 text-sm text-slate-400">{t.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.tags.map((tag) => (
                  <span key={tag} className={`rounded-full px-2 py-0.5 text-xs ${tagColors[tag] || "bg-slate-700 text-slate-400"}`}>
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex justify-between text-xs text-slate-500">
                <span>调用 {t.calls} 次</span>
                <span>延迟 {t.avgLatency}</span>
              </div>
            </div>
          ))}
          {tools.length === 0 && (
            <p className="col-span-4 py-12 text-center text-sm text-slate-500">{loading ? "加载中…" : "暂无工具数据"}</p>
          )}
        </section>

        {tools.length > 0 && (
          <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-200">工具调用统计</h2>
            <div className="space-y-3">
              {tools.map((t) => {
                const maxCalls = Math.max(...tools.map((x) => x.calls), 1);
                return (
                  <div key={t.id} className="flex items-center gap-3">
                    <span className="w-24 truncate text-sm text-slate-400">{t.name}</span>
                    <div className="flex-1">
                      <div className="h-6 overflow-hidden rounded bg-slate-700">
                        <div className="h-full rounded bg-blue-500" style={{ width: `${(t.calls / maxCalls) * 100}%` }} />
                      </div>
                    </div>
                    <span className="w-16 text-right text-sm text-slate-300">{t.calls} 次</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-slate-700 bg-slate-800">
          <h2 className="border-b border-slate-700 px-4 py-3 text-sm font-medium text-slate-300">API 端点目录</h2>
          {Object.entries(groupedEndpoints).length > 0 ? (
            <div className="divide-y divide-slate-700/50">
              {Object.entries(groupedEndpoints).map(([tag, eps]) => (
                <div key={tag} className="px-4 py-3">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{tag}</h3>
                  <div className="space-y-1">
                    {eps.map((ep, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className={`w-14 rounded px-1.5 py-0.5 text-center text-xs font-bold ${
                          ep.method === "GET" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                        }`}>
                          {ep.method}
                        </span>
                        <span className="font-mono text-slate-300">{ep.path}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-slate-500">{loading ? "加载中…" : "暂无端点数据"}</p>
          )}
        </section>
      </main>
    </div>
  );
}
