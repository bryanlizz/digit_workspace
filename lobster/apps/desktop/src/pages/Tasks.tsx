import { useEffect, useState } from "react";
import { CheckSquare } from "lucide-react";
import { trpc } from "../trpc";

type Task = Awaited<ReturnType<typeof trpc.task.list.query>>[number];
type Approval = Awaited<ReturnType<typeof trpc.task.getPendingApprovals.query>>[number];

function statusClass(status: string) {
  if (status === "DONE") return "bg-green-50 text-green-700";
  if (status === "AWAITING_APPROVAL" || status === "BLOCKED") return "bg-orange-50 text-orange-700";
  if (status === "REJECTED") return "bg-red-50 text-red-700";
  return "bg-gray-100 text-gray-600";
}

function parseResult(result: string | null | undefined) {
  if (!result) return null;
  try {
    return JSON.parse(result) as {
      summary?: string;
      toolCalls?: unknown[];
      externalRecords?: unknown[];
      nextActions?: string[];
    };
  } catch {
    return { summary: result };
  }
}

function approvalContextLabel(approval: Approval) {
  const taskTitle = approval.details.context?.taskTitle;
  return typeof taskTitle === "string" ? taskTitle : approval.taskId;
}

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const [taskList, approvalList] = await Promise.all([
          trpc.task.list.query(),
          trpc.task.getPendingApprovals.query(),
        ]);
        if (!mounted) return;
        setTasks(taskList);
        setApprovals(approvalList);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "任务加载失败");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <CheckSquare className="h-6 w-6 text-rose-600" />
        <h1 className="text-xl font-bold text-gray-800">我的任务</h1>
      </div>
      <p className="text-sm text-gray-500">个人任务工作台，聚合待审批、最近任务、执行结果和后续动作。</p>

      {loading && <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-400">正在加载任务...</div>}
      {error && <div className="mt-6 rounded-lg border border-red-100 bg-red-50 p-6 text-sm text-red-600">{error}</div>}

      {!loading && !error && (
        <div className="mt-6 space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">待审批任务</h2>
              <span className="rounded-full bg-orange-50 px-2 py-1 text-xs text-orange-700">{approvals.length} 项</span>
            </div>
            {approvals.length === 0 ? (
              <p className="text-sm text-gray-400">暂无待审批任务</p>
            ) : (
              <div className="space-y-3">
                {approvals.map((approval) => (
                  <div key={approval.id} className="rounded-lg border border-gray-100 p-4 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-gray-800">{approval.details.action}</p>
                        <p className="mt-1 text-xs text-gray-500">风险 {approval.details.risk} · {approvalContextLabel(approval)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button disabled className="rounded bg-gray-100 px-3 py-1 text-xs text-gray-400">通过待接入</button>
                        <button disabled className="rounded bg-gray-100 px-3 py-1 text-xs text-gray-400">驳回待接入</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">最近任务</h2>
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">{tasks.length} 项</span>
            </div>
            {tasks.length === 0 ? (
              <p className="text-sm text-gray-400">暂无任务</p>
            ) : (
              <div className="space-y-4">
                {tasks.slice(0, 8).map((task) => {
                  const result = parseResult(task.result);
                  return (
                    <div key={task.id} className="rounded-lg border border-gray-100 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-gray-800">{task.title}</p>
                          <p className="mt-1 text-sm text-gray-500">{task.description || "无任务描述"}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs ${statusClass(task.status)}`}>{task.status}</span>
                      </div>

                      <div className="mt-4 grid gap-3 text-xs md:grid-cols-4">
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-gray-400">结果摘要</p>
                          <p className="mt-1 line-clamp-2 text-gray-700">{result?.summary ?? "等待执行结果"}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-gray-400">工具调用</p>
                          <p className="mt-1 text-gray-700">{result?.toolCalls?.length ?? 0} 条</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-gray-400">外部记录</p>
                          <p className="mt-1 text-gray-700">{result?.externalRecords?.length ?? 0} 条</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-gray-400">后续动作</p>
                          <p className="mt-1 text-gray-700">{result?.nextActions?.length ?? 0} 项</p>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button disabled className="rounded bg-gray-100 px-3 py-1.5 text-xs text-gray-400">取消待接入</button>
                        <button disabled className="rounded bg-gray-100 px-3 py-1.5 text-xs text-gray-400">重试待接入</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
