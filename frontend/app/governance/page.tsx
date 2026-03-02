"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "../../lib/api";

interface SourceHealth {
  source_id: string;
  scenario_id: string;
  enabled: boolean;
  mode: string;
  state_count: number;
  last_seen_at: string | null;
}
interface AuditEvent {
  timestamp: string;
  event_type: string;
  trigger?: string;
  selected_sources?: string[];
  input_records?: number;
  kept_records?: number;
  new_records?: number;
}
interface QualityRow { source: string; score: number; completeness: number; timeliness: number; }
interface SemanticStats { coverage: number; mappedTerms: number; totalTerms: number; }
interface ComplianceStats { whitelistSources: number; passRate: number; blockedSources: number; }
interface AssetStats { knowledgeRecords: number; featureRecords: number; strategyRecords: number; }

type Tab = "quality" | "semantic" | "compliance" | "asset";

export default function GovernancePage() {
  const [sources, setSources] = useState<SourceHealth[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [quality, setQuality] = useState<QualityRow[]>([]);
  const [semantic, setSemantic] = useState<SemanticStats>({ coverage: 0, mappedTerms: 0, totalTerms: 0 });
  const [compliance, setCompliance] = useState<ComplianceStats>({ whitelistSources: 0, passRate: 0, blockedSources: 0 });
  const [asset, setAsset] = useState<AssetStats>({ knowledgeRecords: 0, featureRecords: 0, strategyRecords: 0 });
  const [tab, setTab] = useState<Tab>("quality");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      fetchAPI<{ sources: SourceHealth[] }>("/api/governance/source-health"),
      fetchAPI<{ events: AuditEvent[] }>("/api/governance/audit-events?limit=20"),
      fetchAPI<{ rows: QualityRow[] }>("/api/governance/quality-report?limit=50"),
      fetchAPI<SemanticStats>("/api/governance/semantic-stats"),
      fetchAPI<ComplianceStats>("/api/governance/compliance-stats"),
      fetchAPI<AssetStats>("/api/governance/asset-stats"),
    ]).then(([sRes, eRes, qRes, smRes, cpRes, asRes]) => {
      if (cancelled) return;
      if (sRes.status === "fulfilled") setSources(sRes.value.sources || []);
      if (eRes.status === "fulfilled") setEvents(eRes.value.events || []);
      if (qRes.status === "fulfilled") setQuality(qRes.value.rows || []);
      if (smRes.status === "fulfilled") setSemantic(smRes.value);
      if (cpRes.status === "fulfilled") setCompliance(cpRes.value);
      if (asRes.status === "fulfilled") setAsset(asRes.value);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const avgQuality = quality.length > 0 ? quality.reduce((s, r) => s + r.score, 0) / quality.length : 0;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800 px-6 py-4">
        <h1 className="text-xl font-bold">数据治理</h1>
        <p className="mt-1 text-sm text-slate-400">质量治理 · 语义治理 · 合规治理 · 资产沉淀</p>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "数据来源", value: sources.length, color: "text-blue-400" },
            { label: "治理事件", value: events.length, color: "text-emerald-400" },
            { label: "平均质量分", value: avgQuality.toFixed(2), color: "text-purple-400" },
            { label: "合规通过率", value: compliance.passRate ? `${(compliance.passRate * 100).toFixed(0)}%` : "—", color: "text-amber-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <p className="text-sm text-slate-400">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${s.color}`}>{loading ? "—" : s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 border-b border-slate-700">
          {(["quality", "semantic", "compliance", "asset"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === t ? "bg-slate-800 text-blue-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {{ quality: "质量治理", semantic: "语义治理", compliance: "合规治理", asset: "资产沉淀" }[t]}
            </button>
          ))}
        </div>

        {tab === "quality" && (
          <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h3 className="mb-4 text-sm font-medium text-slate-300">质量分数分布</h3>
            {quality.length > 0 ? (
              <div className="space-y-3">
                {quality.map((r, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-28 truncate text-sm text-slate-400">{r.source}</span>
                    <div className="flex-1">
                      <div className="h-5 overflow-hidden rounded bg-slate-700">
                        <div
                          className={`h-full rounded transition-all ${r.score > 0.7 ? "bg-emerald-500" : r.score > 0.4 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${r.score * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-14 text-right text-sm font-mono text-slate-300">{r.score.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">{loading ? "加载中…" : "暂无质量数据"}</p>
            )}
          </section>
        )}

        {tab === "semantic" && (
          <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-lg bg-slate-900 p-4 text-center">
                <p className="text-sm text-slate-400">标准化覆盖率</p>
                <p className="mt-2 text-3xl font-bold text-blue-400">{semantic.totalTerms > 0 ? `${((semantic.mappedTerms / semantic.totalTerms) * 100).toFixed(0)}%` : "—"}</p>
              </div>
              <div className="rounded-lg bg-slate-900 p-4 text-center">
                <p className="text-sm text-slate-400">已映射术语</p>
                <p className="mt-2 text-3xl font-bold text-emerald-400">{semantic.mappedTerms}</p>
              </div>
              <div className="rounded-lg bg-slate-900 p-4 text-center">
                <p className="text-sm text-slate-400">术语总数</p>
                <p className="mt-2 text-3xl font-bold text-slate-300">{semantic.totalTerms}</p>
              </div>
            </div>
          </section>
        )}

        {tab === "compliance" && (
          <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-lg bg-slate-900 p-4 text-center">
                <p className="text-sm text-slate-400">白名单来源</p>
                <p className="mt-2 text-3xl font-bold text-emerald-400">{compliance.whitelistSources}</p>
              </div>
              <div className="rounded-lg bg-slate-900 p-4 text-center">
                <p className="text-sm text-slate-400">合规通过率</p>
                <p className="mt-2 text-3xl font-bold text-blue-400">{compliance.passRate ? `${(compliance.passRate * 100).toFixed(0)}%` : "—"}</p>
              </div>
              <div className="rounded-lg bg-slate-900 p-4 text-center">
                <p className="text-sm text-slate-400">被拦截来源</p>
                <p className="mt-2 text-3xl font-bold text-red-400">{compliance.blockedSources}</p>
              </div>
            </div>
          </section>
        )}

        {tab === "asset" && (
          <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-lg bg-slate-900 p-4 text-center">
                <p className="text-sm text-slate-400">知识库记录</p>
                <p className="mt-2 text-3xl font-bold text-purple-400">{asset.knowledgeRecords}</p>
              </div>
              <div className="rounded-lg bg-slate-900 p-4 text-center">
                <p className="text-sm text-slate-400">特征库记录</p>
                <p className="mt-2 text-3xl font-bold text-blue-400">{asset.featureRecords}</p>
              </div>
              <div className="rounded-lg bg-slate-900 p-4 text-center">
                <p className="text-sm text-slate-400">策略训练集</p>
                <p className="mt-2 text-3xl font-bold text-emerald-400">{asset.strategyRecords}</p>
              </div>
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-700 bg-slate-800">
            <h2 className="border-b border-slate-700 px-4 py-3 text-sm font-medium text-slate-300">数据来源健康度</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-slate-400">
                    <th className="px-4 py-2 font-medium">来源</th>
                    <th className="px-4 py-2 font-medium">场景</th>
                    <th className="px-4 py-2 font-medium">模式</th>
                    <th className="px-4 py-2 font-medium">状态数</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((s) => (
                    <tr key={s.source_id} className="border-b border-slate-700/50">
                      <td className="px-4 py-2 font-mono text-xs text-blue-400">{s.source_id}</td>
                      <td className="px-4 py-2 text-xs">{s.scenario_id}</td>
                      <td className="px-4 py-2 text-xs">{s.mode || "-"}</td>
                      <td className="px-4 py-2 text-xs">{s.state_count}</td>
                    </tr>
                  ))}
                  {sources.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">{loading ? "加载中…" : "无数据"}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-800">
            <h2 className="border-b border-slate-700 px-4 py-3 text-sm font-medium text-slate-300">审计日志</h2>
            <ul className="max-h-80 divide-y divide-slate-700/50 overflow-y-auto">
              {events.map((ev, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-3">
                  <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-slate-400">{ev.timestamp?.slice(0, 19)} · {ev.trigger || ev.event_type}</p>
                    <p className="truncate text-sm text-slate-300">
                      来源: {ev.selected_sources?.join(", ") || "-"} · 输入{ev.input_records ?? 0} → 保留{ev.kept_records ?? 0} · 新增{ev.new_records ?? 0}
                    </p>
                  </div>
                </li>
              ))}
              {events.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-slate-500">{loading ? "加载中…" : "暂无审计事件"}</li>
              )}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
