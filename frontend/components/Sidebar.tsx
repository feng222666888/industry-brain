"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: string;
  children: NavItem[];
}

const NAV: NavGroup[] = [
  {
    id: "cockpit",
    label: "企业驾驶舱",
    icon: "🏠",
    children: [
      { href: "/cockpit", label: "总驾驶舱", icon: "📊" },
      { href: "/device", label: "设备预测维护", icon: "⚙️" },
      { href: "/optimize", label: "工艺参数寻优", icon: "📈" },
      { href: "/catalyst", label: "催化剂研发", icon: "🧪" },
    ],
  },
  {
    id: "foundation",
    label: "底座支撑",
    icon: "🏗️",
    children: [
      { href: "/knowledge", label: "知识中心", icon: "📚" },
      { href: "/governance", label: "数据治理", icon: "🛡️" },
      { href: "/tools", label: "工具库", icon: "🔧" },
      { href: "/model-gateway", label: "模型网关", icon: "🤖" },
    ],
  },
  {
    id: "runtime",
    label: "核心运行",
    icon: "⚡",
    children: [
      { href: "/memory", label: "记忆系统", icon: "🧠" },
      { href: "/agent-factory", label: "Agent 生产系统", icon: "🏭" },
      { href: "/multi-agent", label: "Multi-Agent 引擎", icon: "🔗" },
      { href: "/observability", label: "可观测系统", icon: "📡" },
    ],
  },
  {
    id: "evolution",
    label: "自我进化",
    icon: "🧬",
    children: [
      { href: "/evolution/online", label: "在线演进", icon: "⚡" },
      { href: "/evolution/offline", label: "离线进化", icon: "🔄" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const calcActive = useCallback(() => {
    const result: Record<string, boolean> = {};
    NAV.forEach((g) => {
      if (g.children.some((c) => pathname === c.href || pathname?.startsWith(c.href + "/"))) {
        result[g.id] = true;
      }
    });
    return result;
  }, [pathname]);

  const [open, setOpen] = useState<Record<string, boolean>>(calcActive);

  useEffect(() => {
    setOpen((prev) => ({ ...prev, ...calcActive() }));
  }, [calcActive]);

  const toggle = (id: string) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <aside className="flex h-full w-60 flex-shrink-0 flex-col border-r border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 px-5 py-5">
        <h1 className="text-lg font-bold tracking-tight text-white">石化行业大脑</h1>
        <p className="mt-1 text-xs text-slate-500">Industry Brain Platform</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map((group) => {
          const groupActive = group.children.some(
            (c) => pathname === c.href || pathname?.startsWith(c.href + "/"),
          );
          const isOpen = open[group.id] ?? false;

          return (
            <div key={group.id} className="mb-1">
              <button
                onClick={() => toggle(group.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  groupActive
                    ? "text-blue-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <span className="text-base">{group.icon}</span>
                <span className="flex-1 text-left">{group.label}</span>
                <span
                  className={`text-[10px] text-slate-500 transition-transform ${isOpen ? "rotate-90" : ""}`}
                >
                  ▶
                </span>
              </button>

              {isOpen && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-800 pl-3">
                  {group.children.map((child) => {
                    const isActive =
                      pathname === child.href || pathname?.startsWith(child.href + "/");
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                          isActive
                            ? "bg-blue-500/10 font-medium text-blue-400"
                            : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                        }`}
                      >
                        <span className="text-sm">{child.icon}</span>
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-5 py-4">
        <p className="text-xs text-slate-600">v0.2.0 · POC</p>
      </div>
    </aside>
  );
}
