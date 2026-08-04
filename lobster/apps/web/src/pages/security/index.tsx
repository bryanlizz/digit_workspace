import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { CheckCircle, Download, RefreshCw, XCircle, Loader2 } from "lucide-react";
import { AppShell } from "~/components/layout/AppShell";
import { useAppStore } from "~/stores/appStore";
import { AuditTimeline } from "~/components/security/AuditTimeline";
import { ResponsibilityChain } from "~/components/security/ResponsibilityChain";
import { api } from "~/utils/api";


type Tab = "activity" | "approval" | "chain" | "replay" | "stats";

function buildAuditReport(logs: Array<{ createdAt: string; action: string; agentId: string | null; employeeId: string | null; permissionLevel: number; detail: Record<string, unknown> | null }>) {
  const rows = [["时间", "动作", "Agent", "员工", "权限", "详情"]];

  for (const log of logs) {
    const detail = log.detail ? JSON.stringify(log.detail).replaceAll("\"", '""') : "";
    rows.push([
      `"${new Date(log.createdAt).toLocaleString("zh-CN")}"`,
      `"${log.action}"`,
      `"${log.agentId ?? "-"}"`,
      `"${log.employeeId ?? "-"}"`,
      `"L${log.permissionLevel}"`,
      `"${detail}"`,
    ]);
  }

  return rows.map((row) => row.join(",")).join("\n");
}

function buildReplayReport(replay: { task: { id: string; title: string; status: string } | null; auditLogs: Array<{ createdAt: string; action: string; detail: Record<string, unknown> | null }>; responsibilityChain: Array<{ step: number; type: string; name: string; action: string; timestamp: string; detail: string | null }>; exportedAt: string; summary: { taskId: string; logCount: number; stepCount: number; actionCount: number } }) {
  const lines = [
    ["任务ID", replay.summary.taskId],
    ["导出时间", new Date(replay.exportedAt).toLocaleString("zh-CN")],
    ["日志数", String(replay.summary.logCount)],
    ["链路步数", String(replay.summary.stepCount)],
    ["动作类型数", String(replay.summary.actionCount)],
    ["任务标题", replay.task?.title ?? "-"],
    ["任务状态", replay.task?.status ?? "-"],
    [],
    ["=== 审计日志 ==="],
    ...replay.auditLogs.map((log) => [new Date(log.createdAt).toLocaleString("zh-CN"), log.action, JSON.stringify(log.detail ?? {})]),
    [],
    ["=== 责任链 ==="],
    ...replay.responsibilityChain.map((node) => [String(node.step), node.type, node.name, node.action, node.timestamp, node.detail ?? ""]),
  ];

  return lines.map((row) => row.join(",")).join("\n");
}

export default function SecurityPage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);
  const [activeTab, setActiveTab] = useState<Tab>("activity");
  const [chainTaskId, setChainTaskId] = useState("");
  const [chainInput, setChainInput] = useState("");
  const [replayTaskId, setReplayTaskId] = useState("");
  const [replayInput, setReplayInput] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filterAction, setFilterAction] = useState("");

  useEffect(() => {
    setBreadcrumbs([{ label: "安全", path: "/security" }, { label: "治理中心" }]);
  }, [setBreadcrumbs]);

  const { data: auditLogs, refetch: refetchLogs } = api.audit.list.useQuery();
  const { data: approvalQueue, refetch: refetchApproval } = api.task.getApprovalQueue.useQuery();
  const { data: chain } = api.audit.getResponsibilityChain.useQuery(
    { taskId: chainTaskId },
    { enabled: chainTaskId.length > 0 }
  );
  const { data: replay } = api.audit.getTaskReplay.useQuery(
    { taskId: replayTaskId },
    { enabled: replayTaskId.length > 0 }
  );
  const { data: stats } = api.audit.getStats.useQuery();
  const { data: tasks } = api.task.list.useQuery();

  const approve = api.task.approve.useMutation({ onSuccess: () => refetchApproval() });
  const reject = api.task.reject.useMutation({ onSuccess: () => refetchApproval() });

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refetchLogs();
      refetchApproval();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, refetchLogs, refetchApproval]);

  const filteredLogs = useMemo(
    () => auditLogs?.filter((l) => !filterAction || l.action === filterAction) ?? [],
    [auditLogs, filterAction]
  );

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "activity", label: "最近活动" },
    { key: "approval", label: "审批队列" },
    { key: "chain", label: "责任链" },
    { key: "replay", label: "任务回放" },
    { key: "stats", label: "统计" },
  ];

  const recentCompletedTasks = tasks
    ?.filter((t) => t.status === "DONE" || t.status === "REJECTED")
    .slice(0, 5) ?? [];

  const exportAuditReport = () => {
    if (filteredLogs.length === 0) return;
    const blob = new Blob([buildAuditReport(filteredLogs)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportReplayReport = () => {
    if (!replay) return;
    const blob = new Blob([buildReplayReport(replay)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `task-replay-${replay.summary.taskId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const showActivityEmpty = filteredLogs.length === 0;
  const showApprovalEmpty = !approvalQueue || approvalQueue.length === 0;

  return (
    <>
      <Head><title>数智企业 · 安全</title></Head>
      <AppShell>
        <div className="p-6">
          <h1 className="mb-6 text-2xl font-bold text-gray-800">🔒 安全 · 治理中心</h1>

          <div className="mb-6 flex items-center justify-between">
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
              {tabs.map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
                    activeTab === tab.key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}>{tab.label}</button>
              ))}
            </div>
            {activeTab === "activity" && (
              <div className="flex items-center gap-2">
                <button onClick={exportAuditReport} disabled={filteredLogs.length === 0}
                  className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40">
                  <Download className="h-3 w-3" /> 导出审计报告
                </button>
                <button onClick={() => { setAutoRefresh(!autoRefresh); }}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                    autoRefresh ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}>
                  <RefreshCw className={`h-3 w-3 ${autoRefresh ? "animate-spin" : ""}`} />
                  {autoRefresh ? "自动刷新中" : "自动刷新"}
                </button>
              </div>
            )}
          </div>

          {activeTab === "activity" && (
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs">
                  <option value="">全部操作</option>
                  <option value="TASK_CREATED">创建任务</option>
                  <option value="TASK_COMPLETED">任务完成</option>
                  <option value="TASK_APPROVED">审批通过</option>
                  <option value="TASK_REJECTED">审批驳回</option>
                  <option value="TASK_CANCELLED">取消任务</option>
                  <option value="TASK_RETRIED">重试任务</option>
                  <option value="AI_EXECUTED">AI 执行</option>
                  <option value="AI_EXECUTION_FAILED">AI 执行失败</option>
                  <option value="TOOL_EXECUTED">工具执行</option>
                  <option value="TOOL_FAILED">工具失败</option>
                  <option value="PERMISSION_GRANTED">授权</option>
                </select>
                <span className="text-xs text-gray-400">共 {auditLogs?.length ?? 0} 条记录</span>
              </div>
              {showActivityEmpty ? (
                <div className="flex flex-col items-center py-14 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
                  <p className="mt-3 text-sm text-gray-400">当前筛选下暂无审计记录</p>
                </div>
              ) : (
                <AuditTimeline logs={filteredLogs} />
              )}
            </div>
          )}

          {activeTab === "approval" && (
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">待审批任务</span>
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-600">
                    {approvalQueue?.length ?? 0}
                  </span>
                </div>
                <button onClick={() => refetchApproval()}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                  <RefreshCw className="h-3 w-3" /> 刷新
                </button>
              </div>

              {showApprovalEmpty ? (
                <div className="flex flex-col items-center py-12">
                  <span className="text-4xl text-gray-300">✅</span>
                  <p className="mt-3 text-sm text-gray-400">暂无待审批任务</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-3 font-medium text-gray-500">任务</th>
                      <th className="pb-3 font-medium text-gray-500">风险</th>
                      <th className="pb-3 font-medium text-gray-500">申请者</th>
                      <th className="pb-3 font-medium text-gray-500">执行Agent</th>
                      <th className="pb-3 font-medium text-gray-500">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvalQueue.map((item) => {
                      const riskLevel = item.details.risk.toUpperCase();
                      const taskTitle = item.details.action;
                      const agentName = item.details.context?.agentName ?? item.approverId;

                      return (
                      <tr key={item.id} className="border-b border-gray-50">
                        <td className="py-3 font-medium text-gray-800">{taskTitle}</td>
                        <td className="py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            riskLevel === "HIGH" ? "bg-red-100 text-red-600" :
                            riskLevel === "MEDIUM" ? "bg-orange-100 text-orange-600" :
                            "bg-green-100 text-green-600"
                          }`}>{riskLevel}</span>
                        </td>
                        <td className="py-3 text-gray-600">{item.requesterId}</td>
                        <td className="py-3 text-gray-600">{agentName}</td>
                        <td className="py-3">
                          <div className="flex gap-1.5">
                            <button onClick={() => {
                              if (confirm(`批准任务「${taskTitle}」？`)) {
                                approve.mutate({ approvalId: item.id });
                              }
                            }} className="rounded-lg bg-green-500 p-1.5 text-white hover:bg-green-600">
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button onClick={() => {
                              const comment = prompt("驳回原因（必填）：");
                              if (comment) reject.mutate({ approvalId: item.id, comment });
                            }} className="rounded-lg bg-red-500 p-1.5 text-white hover:bg-red-600">
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "chain" && (
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-800">责任链查询</h3>
                <p className="mt-1 text-xs text-gray-500">输入任务 ID 查看完整的执行链路</p>
              </div>

              <div className="mb-4 flex gap-3">
                <input
                  value={chainInput}
                  onChange={(e) => setChainInput(e.target.value)}
                  placeholder="输入任务 ID，如 task-001"
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm"
                />
                <button onClick={() => setChainTaskId(chainInput.trim())}
                  className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm text-white">
                  查询
                </button>
              </div>

              {recentCompletedTasks.length > 0 && !chainTaskId && (
                <div className="mb-4">
                  <p className="mb-2 text-xs text-gray-400">最近任务：</p>
                  <div className="flex flex-wrap gap-2">
                    {recentCompletedTasks.map((t) => (
                      <button key={t.id} onClick={() => { setChainInput(t.id); setChainTaskId(t.id); }}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:border-blue-300 hover:text-blue-600">
                        {t.id}: {t.title.slice(0, 20)}...
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <ResponsibilityChain nodes={chain ?? []} />
            </div>
          )}

          {activeTab === "replay" && (
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-800">任务回放导出</h3>
                <p className="mt-1 text-xs text-gray-500">输入任务 ID 查看审计日志、责任链与导出结果</p>
              </div>

              <div className="mb-4 flex gap-3">
                <input
                  value={replayInput}
                  onChange={(e) => setReplayInput(e.target.value)}
                  placeholder="输入任务 ID，如 task-001"
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm"
                />
                <button onClick={() => setReplayTaskId(replayInput.trim())}
                  className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm text-white">
                  查询
                </button>
                <button onClick={exportReplayReport} disabled={!replay}
                  className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2.5 text-xs text-gray-500 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40">
                  <Download className="h-3 w-3" /> 导出回放
                </button>
              </div>

              {replay ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-4 text-sm">
                    <div><span className="text-gray-400">任务：</span>{replay.task?.title ?? replay.summary.taskId}</div>
                    <div><span className="text-gray-400">状态：</span>{replay.task?.status ?? "-"}</div>
                    <div><span className="text-gray-400">日志数：</span>{replay.summary.logCount}</div>
                    <div><span className="text-gray-400">责任链步数：</span>{replay.summary.stepCount}</div>
                  </div>
                  <div className="rounded-lg border border-gray-100 p-4">
                    <h4 className="mb-3 text-sm font-medium text-gray-700">审计日志</h4>
                    <AuditTimeline logs={replay.auditLogs as never[]} maxItems={20} />
                  </div>
                  <div className="rounded-lg border border-gray-100 p-4">
                    <h4 className="mb-3 text-sm font-medium text-gray-700">责任链</h4>
                    <ResponsibilityChain nodes={replay.responsibilityChain} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-12">
                  <span className="text-4xl text-gray-300">📼</span>
                  <p className="mt-3 text-sm text-gray-400">暂无回放数据</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "stats" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <h3 className="mb-4 font-bold text-gray-800">操作类型分布</h3>
                {stats?.byAction && Object.entries(stats.byAction).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(stats.byAction).map(([action, count]) => {
                      const pct = stats.totalLogs > 0 ? (count / stats.totalLogs) * 100 : 0;
                      return (
                        <div key={action}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">{action}</span>
                            <span className="font-medium text-gray-800">{count} ({pct.toFixed(0)}%)</span>
                          </div>
                          <div className="mt-1 h-2.5 rounded-full bg-gray-100">
                            <div className="h-2.5 rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-gray-400">暂无数据</p>
                )}
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <h3 className="mb-4 font-bold text-gray-800">权限等级分布</h3>
                {stats?.byPermissionLevel && Object.entries(stats.byPermissionLevel).length > 0 ? (
                  <div className="flex items-end gap-4" style={{ height: 160 }}>
                    {Object.entries(stats.byPermissionLevel).map(([level, count]) => {
                      const max = Math.max(...Object.values(stats.byPermissionLevel));
                      const height = max > 0 ? (count / max) * 100 : 0;
                      const colors: Record<string, string> = {
                        L1: "bg-green-400", L2: "bg-blue-400", L3: "bg-orange-400",
                        L4: "bg-red-400", L5: "bg-purple-400",
                      };
                      return (
                        <div key={level} className="flex flex-1 flex-col items-center">
                          <span className="mb-1 text-xs font-medium text-gray-600">{count}</span>
                          <div className={`w-full rounded-t ${colors[level] ?? "bg-gray-400"}`} style={{ height: `${height}%` }} />
                          <span className="mt-1 text-[10px] text-gray-400">{level}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-gray-400">暂无数据</p>
                )}
              </div>

              <div className="col-span-full rounded-xl bg-white p-5 shadow-sm">
                <h3 className="mb-4 font-bold text-gray-800">近 3 日活跃度</h3>
                {stats?.recentDays && stats.recentDays.length > 0 ? (
                  <div className="flex items-end gap-6" style={{ height: 120 }}>
                    {stats.recentDays.map((d) => {
                      const max = Math.max(...stats.recentDays.map((x) => x.count));
                      const height = max > 0 ? (d.count / max) * 100 : 0;
                      return (
                        <div key={d.date} className="flex flex-1 flex-col items-center">
                          <span className="mb-1 text-xs font-medium text-gray-600">{d.count}</span>
                          <div className="w-full rounded-t bg-blue-400 transition-all" style={{ height: `${height}%` }} />
                          <span className="mt-1 text-[10px] text-gray-400">{d.date.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-gray-400">暂无数据</p>
                )}
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </>
  );
}
