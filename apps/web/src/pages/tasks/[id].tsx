// ─────────────────────────────────────────────────────────
// 数智企业 · 任务结果详情页 /tasks/[id]
// ─────────────────────────────────────────────────────────

import { useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { AppShell } from "~/components/layout/AppShell";
import { useAppStore } from "~/stores/appStore";
import { api } from "~/utils/api";
import { LoadingSkeleton } from "~/components/common/LoadingSkeleton";
import { ErrorState } from "~/components/common/EmptyState";
import { TakeoverPanel } from "~/components/common/TakeoverPanel";
import { resumeAfterTakeover } from "~/server/engine/takeoverResume";
import { CheckCircle, XCircle, Clock, FileText } from "lucide-react";

export default function TaskDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id: string };
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);
  const { data: task, isLoading, error } = api.task.getById.useQuery({ id: id ?? "" }, { enabled: !!id });
  const { data: timeline } = api.task.getTimeline.useQuery({ taskId: id ?? "" }, { enabled: !!id });

  useEffect(() => { if (task) setBreadcrumbs([{ label: "任务" }, { label: task.title }]); }, [task, setBreadcrumbs]);

  if (isLoading) return <AppShell><LoadingSkeleton rows={8} /></AppShell>;
  if (error || !task) return <AppShell><ErrorState message="任务不存在或加载失败" onRetry={() => router.reload()} /></AppShell>;

  const statusIcon = task.status === "DONE" ? <CheckCircle className="h-5 w-5 text-green-500" /> : task.status === "REJECTED" ? <XCircle className="h-5 w-5 text-red-500" /> : <Clock className="h-5 w-5 text-yellow-500" />;

  let resultData: Record<string, unknown> = {};
  try { if (task.result) resultData = JSON.parse(task.result) as Record<string, unknown>; } catch {}

  return (
    <AppShell>
      <Head><title>{task.title} · 数智企业</title></Head>
      <div className="p-6">
        <div className="mb-6 flex items-center gap-3">
          {statusIcon}
          <div><h1 className="text-2xl font-bold">{task.title}</h1><p className="text-sm text-gray-500">{task.status} · {task.riskLevel} · L{task.permissionLevel}</p></div>
        </div>

        {task.status === "BLOCKED" && (
          <div className="mb-6">
            <TakeoverPanel
              taskId={task.id}
              taskTitle={task.title}
              error="任务执行遇到障碍，需要人工介入决策"
              onResume={(tid) => { void resumeAfterTakeover({ taskId: tid, action: "resume", humanId: "admin-boss", reason: "人工接管恢复" }); }}
              onSkip={(tid) => { void resumeAfterTakeover({ taskId: tid, action: "skip", humanId: "admin-boss", reason: "人工跳过" }); }}
              onAbort={(tid) => { void resumeAfterTakeover({ taskId: tid, action: "abort", humanId: "admin-boss", reason: "人工终止" }); }}
            />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-5">
            <h2 className="mb-3 font-semibold">任务信息</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">描述</dt><dd>{task.description ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">负责人</dt><dd>{task.assignee?.name ?? "未分配"}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">审批人</dt><dd>{task.approvedBy?.name ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">项目</dt><dd>{task.project?.name ?? "—"}</dd></div>
            </dl>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <h2 className="mb-3 font-semibold">执行结果</h2>
            {resultData.summary ? (
              <div className="space-y-2 text-sm">
                <p className="text-gray-700">{String(resultData.summary)}</p>
                {resultData.executionTimeMs ? <p className="text-xs text-gray-400">耗时: {String(resultData.executionTimeMs)}ms</p> : null}
              </div>
            ) : <p className="text-sm text-gray-400">暂无结果</p>}
          </div>

          <div className="rounded-xl border bg-white p-5 lg:col-span-2">
            <h2 className="mb-3 flex items-center gap-2 font-semibold"><FileText className="h-4 w-4" /> 时间线</h2>
            {timeline && timeline.length > 0 ? (
              <div className="space-y-3">
                {timeline.map((event, i) => (
                  <div key={i} className="flex items-start gap-3 border-l-2 border-blue-200 pb-3 pl-4 text-sm">
                    <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-400" />
                    <div><p className="font-medium">{event.type}</p><p className="text-gray-500">{event.message}</p><p className="text-xs text-gray-400">{event.actorName} · {new Date(event.timestamp).toLocaleString()}</p></div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">暂无时间线</p>}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
