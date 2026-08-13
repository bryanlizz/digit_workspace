// ─────────────────────────────────────────────────────────
// 数智企业 · 总部列表视图
// 按部门分组，类型用标识区分
// ─────────────────────────────────────────────────────────

import { useState } from "react";
import { api } from "~/utils/api";
import { useAppStore } from "~/stores/appStore";
import { User, Bot, UserCheck, MapPin, Copy } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  IDLE: { label: "空闲", color: "bg-gray-100 text-gray-600" },
  WORKING: { label: "工作中", color: "bg-green-100 text-green-700" },
  BLOCKED: { label: "阻塞", color: "bg-red-100 text-red-700" },
  AWAITING_APPROVAL: { label: "待审批", color: "bg-orange-100 text-orange-700" },
  DONE: { label: "完成", color: "bg-blue-100 text-blue-700" },
};

const typeBadge = {
  human: { label: "真人", color: "bg-amber-50 text-amber-700", icon: User },
  digital_twin: { label: "分身", color: "bg-indigo-50 text-indigo-700", icon: UserCheck },
  pure_agent: { label: "Agent", color: "bg-cyan-50 text-cyan-700", icon: Bot },
};

interface ListMember {
  id: string; name: string; type: "human" | "digital_twin" | "pure_agent";
  status: string; department: string; title: string;
}

const DEPT_ORDER = ["总裁办", "战略与顶层设计", "行业与研究洞察", "产品与研发管理", "销售增长与商业化", "市场品牌与传播", "财务法务与风控", "客户成功与服务", "增长运营与投放", "人才组织与文化", "行政后勤与支持"];

export function EmployeeListView() {
  const openDetailPanel = useAppStore((s) => s.openDetailPanel);
  const { data: agents, refetch: refetchAgents } = api.agent.list.useQuery();
  const { data: employees } = api.employee.list.useQuery();
  const utils = api.useContext();

  // 克隆对话框状态
  const [cloneTarget, setCloneTarget] = useState<{ id: string; name: string } | null>(null);
  const [cloneName, setCloneName] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);

  const handleClone = async () => {
    if (!cloneTarget) return;
    setIsCloning(true);
    setCloneError(null);
    try {
      const res = await fetch("/api/agent/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceAgentId: cloneTarget.id, name: cloneName || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error((json as any).error ?? "克隆失败");
      await utils.agent.list.invalidate();
      setCloneTarget(null);
    } catch (err) {
      setCloneError(err instanceof Error ? err.message : "克隆失败");
    } finally {
      setIsCloning(false);
    }
  };

  const openCloneDialog = (id: string, name: string) => {
    setCloneTarget({ id, name });
    setCloneName(`${name} 的副本`);
    setCloneError(null);
  };

  const members: ListMember[] = [];

  if (employees) {
    for (const emp of employees) {
      if (!emp.isActive) continue;
      members.push({ id: emp.id, name: emp.name, type: "human", status: "IDLE", department: emp.department ?? "未分配", title: emp.title ?? "员工" });
    }
  }

  if (agents) {
    for (const a of agents) {
      if (!a.isActive) continue;
      members.push({
        id: a.id, name: a.name,
        type: a.type === "DIGITAL_TWIN" ? "digital_twin" : "pure_agent",
        status: a.status,
        department: a.type === "DIGITAL_TWIN" ? "员工分身" : "独立 Agent",
        title: a.type === "DIGITAL_TWIN" ? `分身 · ${a.ownerName || "—"}` : "独立 Agent",
      });
    }
  }

  // Group by department, sorted
  const grouped = new Map<string, ListMember[]>();
  for (const m of members) {
    const list = grouped.get(m.department) ?? [];
    list.push(m);
    grouped.set(m.department, list);
  }

  const sortedDepts = [...grouped.keys()].sort((a, b) => {
    const ai = DEPT_ORDER.indexOf(a); const bi = DEPT_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">数智企业 · 总部</h1>
          <p className="mt-1 text-sm text-gray-500">{members.length} 位成员 · {grouped.size} 个部门</p>
        </div>

        {sortedDepts.map((dept) => {
          const deptMembers = grouped.get(dept)!;
          return (
            <div key={dept} className="mb-6">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-gray-400">
                <MapPin className="h-3.5 w-3.5" />
                {dept}
                <span className="ml-2 font-normal normal-case text-gray-300">{deptMembers.length} 人</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {deptMembers.map((m) => {
                  const s = STATUS_MAP[m.status]!;
                  const tb = typeBadge[m.type]!;
                  const TIcon = tb.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => openDetailPanel(m.type === "human" ? "employee" : "agent", { id: m.id })}
                      className="group flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-400">
                        <TIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-800 truncate">{m.name}</p>
                          <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${tb.color}`}>
                            {tb.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">{m.title}</p>
                        <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${s.color}`}>
                          {s.label}
                        </span>
                      </div>
                      {m.type !== "human" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openCloneDialog(m.id, m.name); }}
                          className="flex-shrink-0 rounded-lg p-1.5 text-gray-300 opacity-0 transition-all hover:bg-blue-50 hover:text-blue-500 group-hover:opacity-100"
                          title="克隆此 Agent"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {members.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="text-lg">暂无成员</p>
            <p className="mt-1 text-sm">前往「员工广场」招募数字员工</p>
          </div>
        )}

        {/* 克隆对话框 */}
        {cloneTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setCloneTarget(null)}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-800">克隆 Agent</h3>
              <p className="mt-1 text-sm text-gray-500">将「{cloneTarget.name}」克隆为新 Agent</p>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">新 Agent 名称</label>
                <input
                  type="text"
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                  placeholder="输入新名称"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") handleClone(); }}
                />
              </div>
              {cloneError && <p className="mt-2 text-xs text-red-500">{cloneError}</p>}
              <div className="mt-5 flex gap-3 justify-end">
                <button
                  onClick={() => setCloneTarget(null)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  取消
                </button>
                <button
                  onClick={handleClone}
                  disabled={isCloning || !cloneName.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCloning ? "克隆中..." : "确认克隆"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
