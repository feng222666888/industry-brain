"use client";

import { useState } from "react";

interface SOPData {
  sop_id?: string;
  title: string;
  steps: string[] | Array<{ step: number; description: string }>;
  estimated_duration_hours?: number;
  estimatedDuration?: string;
  safety_precautions?: string[];
  tools_required?: string[];
  spare_parts?: string[];
}

interface SOPCardProps {
  sop: SOPData | null;
}

export default function SOPCard({ sop }: SOPCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!sop) return null;

  const steps = Array.isArray(sop.steps)
    ? sop.steps.map((s, i) => ({
        step: i + 1,
        description: typeof s === "string" ? s : s.description || "",
      }))
    : [];

  const duration =
    sop.estimatedDuration ||
    (sop.estimated_duration_hours ? `约${sop.estimated_duration_hours}小时` : "待评估");

  return (
    <div className="rounded-lg border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-6 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-blue-400">维修SOP</h3>
          <p className="mt-1 text-sm font-medium text-slate-200">{sop.title}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-300">
            {steps.length} 步骤 · {duration}
          </span>
          {steps.length > 5 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="rounded bg-slate-700/50 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700"
            >
              {isExpanded ? "收起" : "展开"}
            </button>
          )}
        </div>
      </div>

      {/* 安全措施 */}
      {sop.safety_precautions && sop.safety_precautions.length > 0 && (
        <div className="mb-4 rounded border border-amber-500/30 bg-amber-500/10 p-3">
          <h4 className="mb-2 text-xs font-semibold text-amber-400">安全措施</h4>
          <ul className="space-y-1">
            {sop.safety_precautions.map((precaution, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-amber-300">
                <span className="mt-0.5">⚠️</span>
                <span>{precaution}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 工具和备件 */}
      {(sop.tools_required || sop.spare_parts) && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          {sop.tools_required && sop.tools_required.length > 0 && (
            <div className="rounded border border-slate-700/50 bg-slate-800/30 p-3">
              <h4 className="mb-2 text-xs font-semibold text-slate-400">所需工具</h4>
              <ul className="space-y-1">
                {sop.tools_required.map((tool, i) => (
                  <li key={i} className="text-xs text-slate-300">
                    • {tool}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {sop.spare_parts && sop.spare_parts.length > 0 && (
            <div className="rounded border border-slate-700/50 bg-slate-800/30 p-3">
              <h4 className="mb-2 text-xs font-semibold text-slate-400">所需备件</h4>
              <ul className="space-y-1">
                {sop.spare_parts.map((part, i) => (
                  <li key={i} className="text-xs text-slate-300">
                    • {part}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 步骤列表 */}
      <div className="space-y-2">
        {(isExpanded ? steps : steps.slice(0, 5)).map((step) => (
          <div
            key={step.step}
            className="flex gap-3 rounded border border-slate-700/50 bg-slate-800/30 p-3"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-400">
              {step.step}
            </div>
            <p className="flex-1 text-sm text-slate-300">{step.description}</p>
          </div>
        ))}
        {!isExpanded && steps.length > 5 && (
          <p className="text-center text-xs text-slate-500">
            还有 {steps.length - 5} 个步骤，点击展开查看
          </p>
        )}
      </div>

      {sop.sop_id && (
        <div className="mt-4 text-xs text-slate-500">SOP ID: {sop.sop_id}</div>
      )}
    </div>
  );
}
