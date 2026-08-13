import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ResponsibilityChainNode } from "@lobster/types";

interface ResponsibilityChainProps {
  nodes: ResponsibilityChainNode[];
}

const NODE_ICONS: Record<string, string> = {
  human: "👤",
  digital_twin: "🤖",
  pure_agent: "⚙️",
  tool: "🔧",
};

const NODE_COLORS: Record<string, string> = {
  human: "bg-blue-100 text-blue-700 border-blue-200",
  digital_twin: "bg-purple-100 text-purple-700 border-purple-200",
  pure_agent: "bg-orange-100 text-orange-700 border-orange-200",
  tool: "bg-gray-100 text-gray-600 border-gray-200",
};

export const ResponsibilityChain = ({ nodes }: ResponsibilityChainProps) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <span className="text-3xl">🔗</span>
          <p className="mt-2 text-sm text-gray-400">输入任务 ID 查看责任链</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {nodes.map((node, index) => (
        <div key={index} className="flex gap-4">
          {/* 左侧时间轴 */}
          <div className="flex flex-col items-center">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm shadow-sm ring-2 ring-white ${NODE_COLORS[node.type] ?? "bg-gray-100 text-gray-600"}`}>
              {NODE_ICONS[node.type] ?? "●"}
            </div>
            {index < nodes.length - 1 && <div className="h-full w-0.5 bg-gradient-to-b from-gray-200 to-gray-100" />}
          </div>

          {/* 右侧内容 */}
          <div className={`mb-5 flex-1 rounded-lg border p-3.5 transition-all ${
            NODE_COLORS[node.type]?.replace("bg-", "border-") ?? "border-gray-200"
          } bg-white`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">{node.name}</span>
                  <span className="rounded border border-current bg-white px-1.5 py-0.5 text-[10px] font-medium">
                    {node.type === "human" ? "人类" : node.type === "digital_twin" ? "数字分身" : node.type === "pure_agent" ? "纯 Agent" : "工具"}
                  </span>
                  {index === 0 && (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">源头</span>
                  )}
                  {index === nodes.length - 1 && (
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">终点</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-600">{node.action}</p>
              </div>

              {/* 展开按钮 */}
              {node.detail && (
                <button
                  onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                  className="shrink-0 text-gray-400 hover:text-gray-600"
                >
                  {expandedIndex === index ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              )}
            </div>

            {/* 时间戳 */}
            <p className="mt-1.5 text-[10px] text-gray-400">
              {new Date(node.timestamp).toLocaleString("zh-CN", {
                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </p>

            {/* 展开详情 */}
            {expandedIndex === index && node.detail && (
              <div className="mt-2 rounded-md bg-gray-50 p-2.5 text-xs text-gray-600">
                📌 {node.detail}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* 步骤统计 */}
      <div className="ml-13 mt-2 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500">
        共 {nodes.length} 步 ·
        始于 {new Date(nodes[0]?.timestamp ?? "").toLocaleString("zh-CN")} ·
        终于 {new Date(nodes[nodes.length - 1]?.timestamp ?? "").toLocaleString("zh-CN")}
      </div>
    </div>
  );
};
