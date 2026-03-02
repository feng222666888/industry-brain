"use client";

/* ------------------------------------------------------------------ */
/*  Agent 运营看板 - Operational monitoring dashboard                  */
/* ------------------------------------------------------------------ */

const AGENTS = [
  { name: "monitor_agent", industry: "石化", scenario: "设备维护", status: "online" as const, calls: 12, avgLatency: "0.8s" },
  { name: "diagnosis_agent", industry: "石化", scenario: "设备维护", status: "online" as const, calls: 8, avgLatency: "1.5s" },
  { name: "repair_agent", industry: "石化", scenario: "设备维护", status: "online" as const, calls: 5, avgLatency: "0.6s" },
  { name: "optimization_agent", industry: "石化", scenario: "工艺优化", status: "offline" as const, calls: 3, avgLatency: "2.1s" },
  { name: "research_agent", industry: "石化", scenario: "催化剂研发", status: "online" as const, calls: 2, avgLatency: "3.2s" },
];

const TRACES = [
  { ts: "14:32:08", sessionId: "sess-a3f2b1", chain: "monitor → diagnosis → repair", latency: "2.1s", status: "success" as const },
  { ts: "14:28:45", sessionId: "sess-9e7d4c", chain: "monitor → diagnosis", latency: "1.8s", status: "success" as const },
  { ts: "14:25:12", sessionId: "sess-2c8b6a", chain: "optimization_agent", latency: "2.5s", status: "error" as const },
  { ts: "14:20:33", sessionId: "sess-f1e9d3", chain: "monitor → diagnosis → repair", latency: "2.9s", status: "success" as const },
  { ts: "14:15:01", sessionId: "sess-4a5b7c", chain: "research_agent", latency: "3.4s", status: "success" as const },
  { ts: "14:10:22", sessionId: "sess-8d2e1f", chain: "monitor → diagnosis", latency: "1.6s", status: "success" as const },
];

const LATENCY_DATA = [
  { agent: "monitor", value: 0.8 },
  { agent: "diagnosis", value: 1.5 },
  { agent: "repair", value: 0.6 },
  { agent: "optimization", value: 2.1 },
  { agent: "research", value: 3.2 },
];

const MAX_LATENCY = 3.2;

export default function AgentOpsPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800 px-6 py-4">
        <h1 className="text-xl font-semibold text-white">Agent 运营看板</h1>
      </header>

      <main className="space-y-6 p-6">
        {/* Stats Row */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "已注册Agent", value: "5", unit: "" },
            { label: "活跃会话", value: "3", unit: "" },
            { label: "今日调用次数", value: "47", unit: "" },
            { label: "平均延迟", value: "1.2", unit: "s" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-slate-700 bg-slate-800 p-4 shadow-sm"
            >
              <p className="text-sm text-slate-400">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {s.value}
                {s.unit}
              </p>
            </div>
          ))}
        </section>

        {/* Agent Registry Table */}
        <section className="rounded-lg border border-slate-700 bg-slate-800 shadow-sm">
          <h2 className="border-b border-slate-700 px-4 py-3 text-sm font-medium text-slate-300">
            Agent 注册表
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-slate-400">
                  <th className="px-4 py-3 font-medium">Agent名称</th>
                  <th className="px-4 py-3 font-medium">行业</th>
                  <th className="px-4 py-3 font-medium">场景</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">调用次数</th>
                  <th className="px-4 py-3 font-medium">平均延迟</th>
                </tr>
              </thead>
              <tbody>
                {AGENTS.map((a) => (
                  <tr key={a.name} className="border-b border-slate-700/50 last:border-0">
                    <td className="px-4 py-3 font-mono text-blue-400">{a.name}</td>
                    <td className="px-4 py-3">{a.industry}</td>
                    <td className="px-4 py-3">{a.scenario}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            a.status === "online" ? "bg-emerald-500" : "bg-slate-500"
                          }`}
                        />
                        {a.status === "online" ? "在线" : "离线"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{a.calls}</td>
                    <td className="px-4 py-3">{a.avgLatency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Traces */}
          <section className="rounded-lg border border-slate-700 bg-slate-800 shadow-sm">
            <h2 className="border-b border-slate-700 px-4 py-3 text-sm font-medium text-slate-300">
              最近调用轨迹
            </h2>
            <ul className="divide-y divide-slate-700/50">
              {TRACES.map((t) => (
                <li key={`${t.ts}-${t.sessionId}`} className="flex items-center gap-4 px-4 py-3">
                  <span
                    className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                      t.status === "success" ? "bg-emerald-500" : "bg-red-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-slate-400">
                      {t.ts} · {t.sessionId}
                    </p>
                    <p className="truncate text-sm text-slate-200">{t.chain}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm text-slate-300">{t.latency}</p>
                    <p className="text-xs text-slate-500">
                      {t.status === "success" ? "成功" : "失败"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Performance Chart */}
          <section className="rounded-lg border border-slate-700 bg-slate-800 shadow-sm">
            <h2 className="border-b border-slate-700 px-4 py-3 text-sm font-medium text-slate-300">
              各Agent平均延迟
            </h2>
            <div className="space-y-3 p-4">
              {LATENCY_DATA.map((d) => (
                <div key={d.agent} className="flex items-center gap-3">
                  <span className="w-24 flex-shrink-0 text-sm text-slate-400">{d.agent}</span>
                  <div className="flex-1">
                    <div className="h-6 overflow-hidden rounded bg-slate-700">
                      <div
                        className="h-full rounded bg-blue-500 transition-all"
                        style={{ width: `${(d.value / MAX_LATENCY) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-12 flex-shrink-0 text-right text-sm text-slate-300">
                    {d.value}s
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
