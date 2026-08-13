import { useState, useEffect } from "react";
import { api } from "~/utils/api";
import { EmptyState } from "~/components/common/EmptyState";

const TYPE_COLORS: Record<string, string> = {
  employee: "#3b82f6",
  customer: "#10b981",
  contract: "#f59e0b",
  project: "#8b5cf6",
  task: "#ef4444",
  department: "#6b7280",
  knowledge_doc: "#06b6d4",
};

const TYPE_LABELS: Record<string, string> = {
  employee: "员工",
  customer: "客户",
  contract: "合同",
  project: "项目",
  task: "任务",
  department: "部门",
  knowledge_doc: "文档",
};

interface GraphNode {
  id: string;
  label: string;
  type: string;
  size: number;
  x?: number;
  y?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

const WIDTH = 600;
const HEIGHT = 400;

export const KnowledgeGraph = () => {
  const [filterType, setFilterType] = useState("");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const { data: graphData } = api.graph.getGraph.useQuery({
    entityType: filterType || undefined,
  });

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);

  useEffect(() => {
    if (!graphData) return;
    const w = WIDTH - 60;
    const h = HEIGHT - 60;
    setNodes(
      graphData.nodes.map((n: GraphNode) => ({
        ...n,
        x: 30 + Math.random() * w,
        y: 30 + Math.random() * h,
      })),
    );
    setEdges(graphData.edges);
  }, [graphData]);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800">🧠 知识图谱</h3>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
        >
          <option value="">全部类型</option>
          {Object.keys(TYPE_LABELS).map((k) => (
            <option key={k} value={k}>{TYPE_LABELS[k]}</option>
          ))}
        </select>
      </div>

      {nodes.length === 0 ? (
        <EmptyState
          title="图谱数据为空"
          description="执行任务后，AI 会自动提取实体和关系构建知识图谱"
          icon="inbox"
        />
      ) : (
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full rounded-lg border border-gray-100 bg-gray-50/50">
        {/* 连线 */}
        {edges.map((edge, i) => {
          const src = nodes.find((n) => n.id === edge.source);
          const tgt = nodes.find((n) => n.id === edge.target);
          if (!src?.x || !src?.y || !tgt?.x || !tgt?.y) return null;
          const highlight = selectedNode && (edge.source === selectedNode || edge.target === selectedNode);
          return (
            <g key={`e-${i}`}>
              <line x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                stroke={highlight ? "#3b82f6" : "#d1d5db"} strokeWidth={highlight ? 2 : 1} />
              <text x={(src.x + tgt.x) / 2} y={(src.y + tgt.y) / 2 - 5}
                textAnchor="middle" fontSize="7" fill="#9ca3af" className="pointer-events-none">
                {edge.label}
              </text>
            </g>
          );
        })}

        {/* 节点 */}
        {nodes.map((node) => (
          <g key={node.id} onClick={() => setSelectedNode(node.id === selectedNode ? null : node.id)}
            className="cursor-pointer">
            <circle cx={node.x ?? 0} cy={node.y ?? 0} r={node.size}
              fill={TYPE_COLORS[node.type] ?? "#6b7280"}
              opacity={selectedNode && node.id !== selectedNode ? 0.3 : 1}
              stroke={selectedNode === node.id ? "#1e40af" : "white"}
              strokeWidth={selectedNode === node.id ? 3 : 2} />
            <text x={node.x ?? 0} y={node.y ?? 0} textAnchor="middle" dominantBaseline="central"
              fontSize="8" fill="white" fontWeight="bold">
              {node.label[0]}
            </text>
            <text x={node.x ?? 0} y={(node.y ?? 0) + node.size + 12}
              textAnchor="middle" fontSize="7" fill="#6b7280">{node.label}</text>
          </g>
        ))}

        {nodes.length === 0 && (
          <text x={WIDTH / 2} y={HEIGHT / 2} textAnchor="middle" fontSize="12" fill="#9ca3af">
            暂无图谱数据
          </text>
        )}
      </svg>
      )}

      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            {TYPE_LABELS[type] ?? type}
          </span>
        ))}
        <span className="text-gray-300">|</span>
        <span className="text-gray-400">{nodes.length} 节点 · {edges.length} 关系</span>
      </div>
    </div>
  );
};
