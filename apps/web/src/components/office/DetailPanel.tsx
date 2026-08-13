import { useMemo, useState } from "react";
import { X, Star, Send, Loader2, Info } from "lucide-react";
import { useAppStore } from "~/stores/appStore";
import { useOfficeStore } from "./officeStore";
import { PRESET_EMPLOYEES } from "~/lib/data/preset-employees";
import { SKILL_LIBRARY } from "~/lib/data/skills";
import { api } from "~/utils/api";
import toast from "~/utils/toast";

/** 右侧详情面板 */
export const DetailPanel = () => {
  const { detailPanel, closeDetailPanel } = useAppStore();
  const selectEmployee = useOfficeStore((s) => s.selectEmployee);

  const handleClose = () => {
    selectEmployee(null);
    closeDetailPanel();
  };

  if (!detailPanel.type) return null;

  return (
    <div className="absolute right-0 top-0 z-50 h-full w-[380px] animate-slide-in border-l border-gray-200 bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-700">
          {detailPanel.type === "employee" ? "员工详情" : detailPanel.type === "task" ? "任务详情" : "概览"}
        </h3>
        <button
          onClick={handleClose}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto p-5" style={{ height: "calc(100% - 60px)" }}>
        {detailPanel.type === "employee" && <EmployeeDetail data={detailPanel.data} />}
        {detailPanel.type === "task" && <TaskDetail data={detailPanel.data} />}
        {detailPanel.type === "agent" && <AgentDetail data={detailPanel.data} />}
      </div>
    </div>
  );
};

/** 员工详情 */
function EmployeeDetail({ data }: { data: Record<string, unknown> | null }) {
  const utils = api.useUtils();
  const employeeId = data?.id as string;
  const employee = PRESET_EMPLOYEES.find((e) => e.id === employeeId);
  const { data: agent } = api.agent.getById.useQuery({ id: employeeId }, { enabled: !!employeeId });

  const { data: memories, isLoading: isLoadingMemories } = api.memory.list.useQuery(
    { agentId: employeeId, limit: 3 },
    { enabled: !!employeeId }
  );

  const createTask = api.task.create.useMutation({
    onSuccess: async () => {
      await utils.task.list.invalidate();
      await utils.agent.getById.invalidate({ id: employeeId });
      toast(`已向 ${employee?.name ?? "员工"} 派发任务`);
    },
    onError: () => {
      toast("派任务失败，请稍后再试");
    },
  });

  const riskColors = {
    LOW: "bg-green-100 text-green-700",
    MEDIUM: "bg-orange-100 text-orange-700",
    HIGH: "bg-red-100 text-gray-700",
  };

  const coreMemory = useMemo(() => {
    return agent?.coreMemory?.experienceSummary ?? employee?.description ?? "暂无核心记忆";
  }, [agent?.coreMemory?.experienceSummary, employee?.description]);

  const taskStats = useMemo(() => {
    const total = agent?.coreMemory?.totalTasksCompleted ?? 0;
    const successRate = Math.round((agent?.coreMemory?.successRate ?? 0) * 100);
    return { total, successRate };
  }, [agent?.coreMemory?.successRate, agent?.coreMemory?.totalTasksCompleted]);

  if (!employee) {
    return <p className="py-8 text-center text-sm text-gray-400">未找到员工信息</p>;
  }

  return (
    <div className="space-y-5">
      {/* 头像 + 基础信息 */}
      <div className="flex items-center gap-4">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-md"
          style={{ backgroundColor: employee.color }}
        >
          {employee.name[0]}
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">{employee.name}</h2>
          <p className="text-sm text-gray-500">{employee.title}</p>
          <p className="text-xs text-gray-400">{employee.department}</p>
        </div>
      </div>

      {/* 风险等级 */}
      <div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${riskColors[employee.riskLevel]}`}>
          {employee.riskLevel === "LOW" ? "低风险" : employee.riskLevel === "MEDIUM" ? "中风险" : "高风险"}
        </span>
      </div>

      {/* 技能 */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">技能</p>
        <div className="flex flex-wrap gap-1.5">
          {employee.skills.map((skill) => (
            <span key={skill} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-600">
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* 核心记忆 */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">核心记忆</p>
        <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-sm">
          <p><span className="font-medium text-gray-600">角色：</span>{agent?.coreMemory?.roleDefinition?.title ?? employee.title}</p>
          <p><span className="font-medium text-gray-600">描述：</span>{coreMemory}</p>
        </div>
      </div>

      {/* 任务统计 */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">任务统计</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-blue-50 p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{taskStats.total}</p>
            <p className="text-xs text-gray-500">已完成任务</p>
          </div>
          <div className="rounded-lg bg-green-50 p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{taskStats.successRate}%</p>
            <p className="text-xs text-gray-500">采纳率</p>
          </div>
        </div>
      </div>

      {/* 长期记忆 */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">长期记忆</p>
        {isLoadingMemories ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : memories && memories.data.length > 0 ? (
          <div className="space-y-2">
            {memories.data.map((mem) => (
              <div key={mem.id} className="rounded-lg border border-gray-100 p-3 text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    mem.type === "success" ? "bg-green-100 text-green-600" :
                    mem.type === "failure" ? "bg-red-100 text-red-600" :
                    mem.type === "preference" ? "bg-blue-100 text-blue-600" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {mem.type === "success" ? "成功" : mem.type === "failure" ? "失败" : mem.type === "preference" ? "偏好" : "洞察"}
                  </span>
                  <span className="flex">
                    {Array.from({ length: mem.importance }, (_, j) => (
                      <Star key={j} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </span>
                </div>
                <p className="text-gray-600">{mem.summary}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-100 p-4 text-center text-sm text-gray-400">
            暂无记忆记录
          </div>
        )}
      </div>

      {/* 派任务按钮 */}
      <button
        onClick={() => {
          const title = window.prompt(`给 ${employee.name} 派发什么任务？`);
          if (!title?.trim()) return;

          createTask.mutate({
            title: title.trim(),
            description: `派发给 ${employee.name}（${employee.department}）`,
            riskLevel: employee.riskLevel,
            permissionLevel: employee.defaultPermission,
            assigneeId: employeeId,
          });
        }}
        disabled={createTask.isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        {createTask.isPending ? "派发中..." : `派任务给 ${employee.name}`}
      </button>
    </div>
  );
}

/** 任务详情 */
function TaskDetail({ data }: { data: Record<string, unknown> | null }) {
  const taskId = data?.id as string;
  const title = (data?.title as string) ?? "任务详情";

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-blue-50 p-3">
        <p className="text-xs text-blue-600 font-medium">任务 ID</p>
        <p className="text-sm text-gray-800 font-mono">{taskId}</p>
      </div>
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      <div className="rounded-lg border border-gray-100 p-3 text-sm text-gray-600">
        <p>创建后自动进入执行队列，可在「协作」页面查看进度。</p>
        <p className="mt-2 text-xs text-gray-400">高风险任务将自动进入审批流程。</p>
      </div>
    </div>
  );
}

/** Agent 详情（数字分身 / 独立 Agent） */
function AgentDetail({ data }: { data: Record<string, unknown> | null }) {
  const agentId = data?.id as string;
  const { data: agent, isLoading } = api.agent.getById.useQuery({ id: agentId }, { enabled: !!agentId });
  const { data: memories } = api.memory.list.useQuery({ agentId, limit: 5 }, { enabled: !!agentId });
  const { data: coreMemory } = api.agent.getCoreMemory.useQuery({ agentId }, { enabled: !!agentId });
  const utils = api.useUtils();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const updateAgent = api.agent.update.useMutation({
    onSuccess: () => { utils.agent.getById.invalidate({ id: agentId }); setEditing(false); },
  });

  // Split name into prefix and personal part for locked editing
  const nameParts = (agent?.name ?? "").match(/^(.+?)\s(.+)$/);
  const namePrefix = nameParts?.[1] ?? "";
  const namePersonal = nameParts?.[2] ?? (agent?.name ?? "");

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
  if (!agent) return <p className="py-8 text-center text-sm text-gray-400">未找到 Agent 信息</p>;

  const statusLabels: Record<string, string> = {
    IDLE: "空闲", WORKING: "工作中", BLOCKED: "阻塞", AWAITING_APPROVAL: "待审批", DONE: "完成",
  };
  const statusColors: Record<string, string> = {
    IDLE: "bg-gray-100 text-gray-600", WORKING: "bg-green-100 text-green-700", BLOCKED: "bg-red-100 text-red-700", AWAITING_APPROVAL: "bg-orange-100 text-orange-700", DONE: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="space-y-5">
      {/* 头像 + 基础 */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-2xl font-bold text-indigo-600 shadow-sm">
          {agent.name[0]}
        </div>
        <div>
          <div className="flex items-center gap-2">
            {editing ? (
              <div className="flex items-center gap-0">
                <span className="rounded-l border border-blue-300 bg-gray-100 px-2 py-0.5 text-lg font-bold text-gray-500">{namePrefix} </span>
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => { if (editName.trim()) updateAgent.mutate({ id: agentId, name: `${namePrefix} ${editName.trim()}` }); else setEditing(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && editName.trim()) updateAgent.mutate({ id: agentId, name: `${namePrefix} ${editName.trim()}` }); if (e.key === "Escape") setEditing(false); }}
                  className="w-28 rounded-r border border-blue-300 px-2 py-0.5 text-lg font-bold text-gray-800"
                />
              </div>
            ) : (
              <h2
                className="text-lg font-bold text-gray-800 cursor-pointer hover:text-blue-600"
                onClick={() => { setEditName(namePersonal); setEditing(true); }}
                title="点击修改名字"
              >
                {agent.name}
              </h2>
            )}
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${agent.type === "DIGITAL_TWIN" ? "bg-indigo-50 text-indigo-700" : "bg-cyan-50 text-cyan-700"}`}>
              {agent.type === "DIGITAL_TWIN" ? "员工分身" : "独立 Agent"}
            </span>
          </div>
          <p className="text-sm text-gray-500">{coreMemory?.roleDefinition?.title ?? "Agent"}</p>
          <p className="text-xs text-gray-400">归属: {agent.ownerName || "—"}</p>
        </div>
      </div>

      {/* 状态 */}
      <div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[agent.status] ?? statusColors.IDLE}`}>
          {statusLabels[agent.status] ?? agent.status}
        </span>
      </div>

      {/* 技能 */}
      {agent.skillTags.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">技能</p>
          <div className="flex flex-wrap gap-1.5">
            {agent.skillTags.map((s) => {
              const def = SKILL_LIBRARY.find((sk) => sk.name === s);
              return (
                <span key={s} className="relative">
                  <button
                    onClick={() => setSelectedSkill(selectedSkill === s ? null : s)}
                    className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-100 hover:shadow-sm transition-all cursor-pointer border border-transparent hover:border-blue-200"
                  >
                    {s}
                  </button>
                  {selectedSkill === s && (
                    <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-blue-200 bg-white p-3 shadow-lg text-xs space-y-1.5" onClick={(e) => e.stopPropagation()}>
                      {def ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-800">{def.name}</span>
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${def.risk === "低" ? "bg-green-100 text-green-700" : def.risk === "中" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}>{def.risk}风险</span>
                          </div>
                          <p className="text-gray-500">{def.description}</p>
                          <div className="text-gray-400">📥 {def.requires.join("、")}</div>
                          <div className="text-gray-400">📤 {def.outputs.join("、")}</div>
                          <div className="text-gray-400 text-[11px] italic">💡 {def.useCase}</div>
                          <div className="font-medium text-blue-600">¥{def.price}/月</div>
                        </>
                      ) : (
                        <div>
                          <span className="font-medium text-gray-800">{s}</span>
                          <p className="text-gray-400 mt-1">基础技能（未收录详情）</p>
                        </div>
                      )}
                    </div>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* 角色定义 */}
      {coreMemory?.roleDefinition && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">角色设定</p>
          <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-sm">
            <p><span className="font-medium text-gray-600">性格：</span>{coreMemory.roleDefinition.personality}</p>
            <p><span className="font-medium text-gray-600">边界：</span>{coreMemory.roleDefinition.boundaries}</p>
          </div>
        </div>
      )}

      {/* 核心记忆 */}
      {coreMemory?.experienceSummary && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">核心记忆</p>
          <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{coreMemory.experienceSummary}</p>
        </div>
      )}

      {/* 任务统计 */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">统计</p>
        <div className="grid grid-cols-3 gap-3">
          <StatBox label="任务数" value={agent.taskCount} color="blue" />
          <StatBox label="记忆数" value={agent.memoryCount} color="green" />
          <StatBox label="采纳率" value={`${Math.round((coreMemory?.successRate ?? 0) * 100)}%`} color="purple" />
        </div>
      </div>

      {/* 长期记忆 */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">长期记忆</p>
        {memories && memories.data.length > 0 ? (
          <div className="space-y-2">
            {memories.data.map((mem) => (
              <div key={mem.id} className="rounded-lg border border-gray-100 p-3 text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    mem.type === "success" ? "bg-green-100 text-green-600" : mem.type === "failure" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                  }`}>
                    {mem.type === "success" ? "成功" : mem.type === "failure" ? "失败" : "洞察"}
                  </span>
                  <span className="flex">
                    {Array.from({ length: mem.importance }, (_, j) => <Star key={j} className="h-3 w-3 fill-yellow-400 text-yellow-400" />)}
                  </span>
                </div>
                <p className="text-gray-600">{mem.summary}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-100 p-4 text-center text-sm text-gray-400">暂无记忆</div>
        )}
      </div>

      {/* 操作级别 */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">操作级别</p>
        <div className="flex items-center gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`h-2 w-6 rounded ${i < agent.permissionBm ? "bg-indigo-500" : "bg-gray-200"}`} />
          ))}
          <span className="ml-2 text-xs text-gray-500">L{agent.permissionBm}</span>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number | string; color: string }) {
  const colors: Record<string, string> = { blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600", purple: "bg-purple-50 text-purple-600" };
  return (
    <div className={`rounded-lg p-3 text-center ${colors[color] ?? colors.blue}`}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[10px]">{label}</p>
    </div>
  );
}
