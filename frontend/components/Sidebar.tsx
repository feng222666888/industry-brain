"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/cockpit", label: "企业总驾驶舱", icon: "🏠" },
  { href: "/device", label: "设备预测维护", icon: "⚙️" },
  { href: "/optimize", label: "工艺参数寻优", icon: "📈" },
  { href: "/catalyst", label: "催化剂研发", icon: "🧪" },
  { href: "/evolution", label: "进化引擎", icon: "🧬" },
  { href: "/agent-ops", label: "Agent 运营", icon: "🤖" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-shrink-0 flex-col border-r border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 px-5 py-5">
        <h1 className="text-lg font-bold tracking-tight text-white">
          石化行业大脑
        </h1>
        <p className="mt-1 text-xs text-slate-500">Industry Brain Platform</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-500/10 text-blue-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-5 py-4">
        <p className="text-xs text-slate-600">v0.1.0 · POC</p>
      </div>
    </aside>
  );
}
