// ─────────────────────────────────────────────────────────
// 数智企业 · 总部列表视图
// 按部门分组，类型用标识区分
// ─────────────────────────────────────────────────────────

import { api } from "~/utils/api";
import { useAppStore } from "~/stores/appStore";
import { User, Bot, UserCheck, MapPin } from "lucide-react";

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
  const { data: agents } = api.agent.list.useQuery();
  const { data: employees } = api.employee.list.useQuery();

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
                      className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
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
      </div>
    </div>
  );
}
