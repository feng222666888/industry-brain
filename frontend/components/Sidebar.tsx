"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// 设备列表相关类型和组件（仅在 /device 页面使用）
interface Device {
  id: string;
  name: string;
  health: number;
  status: "normal" | "degrading" | "fault";
  parentId: string;
}

interface ParentDevice {
  id: string;
  name: string;
}

const DEVICE_PARENTS: ParentDevice[] = [
  { id: "DEV-FCC-001", name: "FCC-催化裂化装置" },
  { id: "DEV-CDU-001", name: "常减压蒸馏装置" },
];

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
      { href: "/corrosion", label: "智能防腐蚀", icon: "🛡️" },
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
                    const isDevicePage = child.href === "/device" && isActive;
                    
                    return (
                      <div key={child.href}>
                        <Link
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
                        {/* 设备预测维护页面：显示设备列表 */}
                        {isDevicePage && (
                          <DeviceListInSidebar />
                        )}
                      </div>
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

// 设备列表组件（在侧边栏中显示）
function DeviceListInSidebar() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // 从API获取设备列表
    fetch("/api/device-demo/devices")
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 0 && Array.isArray(data.data)) {
          // 过滤掉不需要显示的设备
          const excludedDeviceIds = [
            "DEV-REACT-001", // 催化反应器-001
            "DEV-COMP-002",  // 循环气压缩机-002
            "DEV-HX-002",    // 产品冷却器-002
            "DEV-PUMP-005",  // 循环冷却水泵-005
            "DEV-PUMP-004",  // 回流泵-004
          ];
          
          // 先获取设备列表，并过滤掉不需要的设备
          const deviceList = data.data
            .filter((d: any) => !excludedDeviceIds.includes(d.device_id))
            .map((d: any) => ({
              id: d.device_id,
              name: d.device_name,
              parentId: d.parent_unit === "FCC-催化裂化装置" ? "DEV-FCC-001" : 
                       d.parent_unit === "常减压蒸馏装置" ? "DEV-CDU-001" : "DEV-FCC-001",
            }));
          
          // 为每个设备获取健康分数
          const healthPromises = deviceList.map((device: any) =>
            fetch(`/api/device-demo/devices/${device.id}/health`)
              .then((res) => res.json())
              .then((healthData) => {
                const health = healthData.code === 0 && healthData.data?.current_health_score 
                  ? healthData.data.current_health_score 
                  : 0.8; // 默认值
                const status = health >= 0.8 ? "normal" : health >= 0.6 ? "degrading" : "fault";
                return {
                  ...device,
                  health,
                  status: status as "normal" | "degrading" | "fault",
                };
              })
              .catch(() => ({
                ...device,
                health: 0.8,
                status: "normal" as const,
              }))
          );
          
          Promise.all(healthPromises).then((devicesWithHealth) => {
            setDevices(devicesWithHealth);
            if (devicesWithHealth.length > 0 && !selectedId) {
              setSelectedId(devicesWithHealth[0].id);
            }
          });
        }
      })
      .catch(() => {
        // 使用默认设备列表（只包含有健康数据的设备）
        const defaultDevices: Device[] = [
          { id: "DEV-PUMP-001", name: "循环水泵-001", health: 0.72, status: "degrading", parentId: "DEV-FCC-001" },
          { id: "DEV-PUMP-002", name: "进料泵-002", health: 0.88, status: "normal", parentId: "DEV-FCC-001" },
          { id: "DEV-COMP-001", name: "富气压缩机-001", health: 0.91, status: "normal", parentId: "DEV-FCC-001" },
          { id: "DEV-HX-001", name: "原料预热器-001", health: 0.95, status: "normal", parentId: "DEV-CDU-001" },
          { id: "DEV-PUMP-003", name: "常压塔底泵-003", health: 0.85, status: "normal", parentId: "DEV-CDU-001" },
        ];
        setDevices(defaultDevices);
        if (!selectedId) {
          setSelectedId(defaultDevices[0].id);
        }
      });
  }, []);

  const toggle = (parentId: string) =>
    setCollapsed((p) => ({ ...p, [parentId]: !p[parentId] }));

  const handleSelect = (id: string) => {
    setSelectedId(id);
    // 更新URL参数并触发设备切换事件
    const url = new URL(window.location.href);
    url.searchParams.set("device", id);
    window.history.pushState({}, "", url.toString());
    // 触发自定义事件，让device页面知道设备已切换
    window.dispatchEvent(new CustomEvent("device-selected", { detail: { deviceId: id } }));
  };

  useEffect(() => {
    // 监听URL参数变化
    const params = new URLSearchParams(window.location.search);
    const deviceParam = params.get("device");
    if (deviceParam && devices.some((d) => d.id === deviceParam)) {
      setSelectedId(deviceParam);
    }
  }, [devices]);

  if (devices.length === 0) return null;

  return (
    <div className="ml-2 mt-2 space-y-1 border-l border-slate-700/50 pl-3">
      {DEVICE_PARENTS.map((parent) => {
        const children = devices.filter((d) => d.parentId === parent.id);
        const isCollapsed = collapsed[parent.id] ?? false;
        if (children.length === 0) return null;

        return (
          <div key={parent.id} className="mb-1">
            <button
              onClick={() => toggle(parent.id)}
              className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-800/50 transition-colors"
            >
              <span className={`text-[9px] transition-transform ${isCollapsed ? "" : "rotate-90"}`}>▶</span>
              <span className="text-xs">{parent.name}</span>
            </button>
            {!isCollapsed && (
              <div className="ml-2 mt-0.5 space-y-0.5">
                {children.map((dev) => {
                  const isSelected = selectedId === dev.id;
                  return (
                    <button
                      key={dev.id}
                      onClick={() => handleSelect(dev.id)}
                      className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors ${
                        isSelected
                          ? "bg-blue-500/20 text-blue-400 font-medium"
                          : "text-slate-500 hover:bg-slate-800/50 hover:text-slate-300"
                      }`}
                    >
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                        dev.status === "normal" ? "bg-green-500" :
                        dev.status === "degrading" ? "bg-orange-500" : "bg-red-500"
                      }`} />
                      <span className="truncate flex-1 text-left">{dev.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {(dev.health * 100).toFixed(0)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
