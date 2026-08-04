import type { AuditLogDTO } from "@lobster/types";

interface AuditTimelineProps {
  logs: AuditLogDTO[];
  maxItems?: number;
}

/** 操作类型对应颜色 */
const ACTION_COLORS: Record<string, string> = {
  TASK_CREATED: "bg-blue-500",
  TASK_STARTED: "bg-indigo-500",
  TASK_COMPLETED: "bg-green-500",
  TASK_APPROVED: "bg-emerald-500",
  TASK_REJECTED: "bg-red-500",
  TASK_CANCELLED: "bg-gray-500",
  TASK_RETRIED: "bg-cyan-500",
  PERMISSION_GRANTED: "bg-orange-500",
  PERMISSION_REQUESTED: "bg-yellow-500",
  DATA_EXPORTED: "bg-purple-500",
  AI_EXECUTED: "bg-violet-500",
  AI_EXECUTION_FAILED: "bg-fuchsia-500",
  TOOL_EXECUTED: "bg-sky-500",
  TOOL_FAILED: "bg-rose-500",
  KNOWLEDGE_ACCESSED: "bg-teal-500",
  APPROVAL_APPROVED: "bg-emerald-500",
  APPROVAL_REJECTED: "bg-red-500",
};

/** 操作类型的中文名 */
const ACTION_LABELS: Record<string, string> = {
  TASK_CREATED: "创建任务",
  TASK_STARTED: "开始执行",
  TASK_COMPLETED: "任务完成",
  TASK_APPROVED: "审批通过",
  TASK_REJECTED: "审批驳回",
  TASK_CANCELLED: "取消任务",
  TASK_RETRIED: "重试任务",
  PERMISSION_GRANTED: "授权",
  PERMISSION_REQUESTED: "申请权限",
  DATA_EXPORTED: "数据导出",
  AI_EXECUTED: "AI 执行",
  AI_EXECUTION_FAILED: "AI 执行失败",
  TOOL_EXECUTED: "工具执行",
  TOOL_FAILED: "工具失败",
  KNOWLEDGE_ACCESSED: "访问知识库",
  APPROVAL_APPROVED: "审批通过",
  APPROVAL_REJECTED: "审批驳回",
};

/** 格式化时间 */
function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  if (mins < 1440) return `${Math.floor(mins / 60)} 小时前`;
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

/** 按天分组 */
function groupByDay(logs: AuditLogDTO[]): Map<string, AuditLogDTO[]> {
  const groups = new Map<string, AuditLogDTO[]>();
  const today = new Date().toLocaleDateString("zh-CN");
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("zh-CN");

  logs.forEach((log) => {
    const date = new Date(log.createdAt).toLocaleDateString("zh-CN");
    const key = date === today ? "今天" : date === yesterday ? "昨天" : date;
    const existing = groups.get(key) ?? [];
    existing.push(log);
    groups.set(key, existing);
  });
  return groups;
}

function stringifyDetail(detail: Record<string, unknown> | null): string {
  if (!detail) return "";
  const toolName = typeof detail.toolName === "string" ? detail.toolName : null;
  const taskId = typeof detail.taskId === "string" ? detail.taskId : null;
  const action = typeof detail.action === "string" ? detail.action : null;
  const projectName = typeof detail.projectName === "string" ? detail.projectName : null;
  const parts = [toolName, taskId ? `任务:${taskId}` : null, action, projectName ? `项目:${projectName}` : null].filter(Boolean);
  if (parts.length > 0) return parts.join(" · ");
  return JSON.stringify(detail).slice(0, 180);
}

function getAuditDetailCounts(detail: Record<string, unknown> | null): { screenshots: number; artifacts: number } {
  if (!detail) return { screenshots: 0, artifacts: 0 };
  const screenshots = Array.isArray(detail.screenshots) ? detail.screenshots.length : 0;
  const result = detail.result;
  if (!result || typeof result !== "object") return { screenshots, artifacts: 0 };
  const resultRecord = result as Record<string, unknown>;
  const artifacts = Array.isArray(resultRecord.artifacts) ? resultRecord.artifacts.length : 0;
  return { screenshots, artifacts };
}

export const AuditTimeline = ({ logs, maxItems = 50 }: AuditTimelineProps) => {
  const limited = logs.slice(0, maxItems);
  const groups = groupByDay(limited);

  return (
    <div className="space-y-6">
      {Array.from(groups.entries()).map(([dayLabel, dayLogs]) => (
        <div key={dayLabel}>
          <h4 className="mb-3 text-xs font-semibold text-gray-400">{dayLabel}</h4>
          <div className="space-y-0">
            {dayLogs.map((log, i) => {
              const color = ACTION_COLORS[log.action] ?? "bg-gray-400";
              const label = ACTION_LABELS[log.action] ?? log.action;
              const detailText = stringifyDetail(log.detail);
              const counts = getAuditDetailCounts(log.detail);

              return (
                <div key={log.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full ${color} ring-2 ring-white`}>
                      <span className="text-[10px] text-white">{i + 1}</span>
                    </div>
                    {i < dayLogs.length - 1 && <div className="h-full w-0.5 bg-gray-100" />}
                  </div>

                  <div className="mb-4 flex-1 rounded-lg border border-gray-100 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{label}</span>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                          L{log.permissionLevel}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {new Date(log.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      {log.agentId && <span>🤖 {log.agentId}</span>}
                      {log.employeeId && <span>👤 {log.employeeId}</span>}
                    </div>
                    {detailText && <p className="mt-1 text-[11px] text-gray-400">{detailText}</p>}
                    {(counts.screenshots > 0 || counts.artifacts > 0) && (
                      <p className="mt-1 text-[10px] text-gray-300">
                        截图 {counts.screenshots} 张 · 产物 {counts.artifacts} 项
                      </p>
                    )}
                    <p className="mt-0.5 text-[10px] text-gray-300">{formatTime(log.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {logs.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-400">暂无活动记录</p>
      )}
    </div>
  );
};
