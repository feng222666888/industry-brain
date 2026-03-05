"use client";

import { useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Edge,
  Node,
  useNodesState,
  useEdgesState,
  MarkerType,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface AgentStep {
  agent: string;
  action: string;
  result?: string;
  summary?: string;
}

interface AgentFlowVisualizationProps {
  steps: AgentStep[];
  isRunning: boolean;
}

const agentColors: Record<string, string> = {
  monitor: "#3b82f6",
  diagnosis: "#10b981",
  repair: "#f59e0b",
};

const agentLabels: Record<string, string> = {
  monitor: "监控Agent",
  diagnosis: "诊断Agent",
  repair: "维修Agent",
};

export default function AgentFlowVisualization({
  steps,
  isRunning,
}: AgentFlowVisualizationProps) {
  const agentNodes = useMemo(() => {
    const nodes: Node[] = [
      {
        id: "start",
        type: "input",
        position: { x: 0, y: 100 },
        data: { label: "开始" },
        style: {
          background: "#475569",
          color: "#f1f5f9",
          border: "2px solid #64748b",
          borderRadius: "8px",
          padding: "12px 20px",
        },
      },
      {
        id: "monitor",
        position: { x: 200, y: 100 },
        data: { label: agentLabels.monitor },
        style: {
          background: agentColors.monitor,
          color: "#ffffff",
          border: "2px solid " + agentColors.monitor,
          borderRadius: "8px",
          padding: "12px 20px",
          fontWeight: "bold",
        },
      },
      {
        id: "diagnosis",
        position: { x: 400, y: 100 },
        data: { label: agentLabels.diagnosis },
        style: {
          background: agentColors.diagnosis,
          color: "#ffffff",
          border: "2px solid " + agentColors.diagnosis,
          borderRadius: "8px",
          padding: "12px 20px",
          fontWeight: "bold",
        },
      },
      {
        id: "repair",
        position: { x: 600, y: 100 },
        data: { label: agentLabels.repair },
        style: {
          background: agentColors.repair,
          color: "#ffffff",
          border: "2px solid " + agentColors.repair,
          borderRadius: "8px",
          padding: "12px 20px",
          fontWeight: "bold",
        },
      },
      {
        id: "end",
        type: "output",
        position: { x: 800, y: 100 },
        data: { label: "完成" },
        style: {
          background: "#475569",
          color: "#f1f5f9",
          border: "2px solid #64748b",
          borderRadius: "8px",
          padding: "12px 20px",
        },
      },
    ];

    // 根据步骤高亮当前执行的Agent
    if (steps.length > 0) {
      const lastStep = steps[steps.length - 1];
      const agentId = lastStep.agent.toLowerCase().replace("_agent", "");
      const node = nodes.find((n) => n.id === agentId);
      if (node) {
        node.style = {
          ...node.style,
          boxShadow: "0 0 20px " + agentColors[agentId] + "80",
          transform: "scale(1.05)",
        };
      }
    }

    // 如果正在运行，添加脉冲动画
    if (isRunning && steps.length > 0) {
      const lastStep = steps[steps.length - 1];
      const agentId = lastStep.agent.toLowerCase().replace("_agent", "");
      const node = nodes.find((n) => n.id === agentId);
      if (node) {
        node.style = {
          ...node.style,
          animation: "pulse 2s infinite",
        };
      }
    }

    return nodes;
  }, [steps, isRunning]);

  const agentEdges = useMemo<Edge[]>(() => {
    return [
      {
        id: "e1",
        source: "start",
        target: "monitor",
        animated: steps.length > 0,
        style: { stroke: "#64748b", strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#64748b",
        },
      },
      {
        id: "e2",
        source: "monitor",
        target: "diagnosis",
        animated: steps.length > 1,
        style: { stroke: "#64748b", strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#64748b",
        },
      },
      {
        id: "e3",
        source: "diagnosis",
        target: "repair",
        animated: steps.length > 2,
        style: { stroke: "#64748b", strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#64748b",
        },
      },
      {
        id: "e4",
        source: "repair",
        target: "end",
        animated: !isRunning && steps.length > 3,
        style: { stroke: "#64748b", strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#64748b",
        },
      },
    ];
  }, [steps, isRunning]);

  const [nodes, setNodes, onNodesChange] = useNodesState(agentNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(agentEdges);

  // 更新节点和边
  useMemo(() => {
    setNodes(agentNodes);
    setEdges(agentEdges);
  }, [agentNodes, agentEdges, setNodes, setEdges]);

  return (
    <div className="rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-900/50 to-slate-800/30 p-6 backdrop-blur-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-300">Multi-Agent诊断流程</h3>
      <div className="h-64 w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          minZoom={0.5}
          maxZoom={2}
        >
          <Background color="#1e293b" gap={16} />
          <Controls
            style={{
              button: {
                backgroundColor: "#334155",
                color: "#f1f5f9",
                border: "1px solid #475569",
              },
            }}
          />
        </ReactFlow>
      </div>

      {/* 步骤列表 */}
      {steps.length > 0 && (
        <div className="mt-4 space-y-2">
          {steps.map((step, i) => {
            const agentId = step.agent.toLowerCase().replace("_agent", "");
            const color = agentColors[agentId] || "#64748b";
            return (
              <div
                key={i}
                className="flex items-start gap-3 rounded border border-slate-700/50 bg-slate-800/30 p-3"
              >
                <div
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-200">
                    {step.agent} — {step.action}
                  </p>
                  {step.result && (
                    <p className="mt-1 text-xs text-slate-400">{step.result}</p>
                  )}
                  {step.summary && (
                    <p className="mt-1 text-xs text-slate-400">{step.summary}</p>
                  )}
                </div>
              </div>
            );
          })}
          {isRunning && (
            <div className="flex items-center gap-3 rounded border border-blue-500/50 bg-blue-500/10 p-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
              <p className="text-sm font-medium text-blue-400">Agent 处理中...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
