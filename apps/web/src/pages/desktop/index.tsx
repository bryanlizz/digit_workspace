// ─────────────────────────────────────────────────────────
// 数智企业 · Desktop 个人工作台
// ─────────────────────────────────────────────────────────

import { useEffect } from "react";
import Head from "next/head";
import { AppShell } from "~/components/layout/AppShell";
import { useAppStore } from "~/stores/appStore";
import { api } from "~/utils/api";
import { LoadingSkeleton } from "~/components/common/LoadingSkeleton";
import { Monitor, CheckCircle, Clock, MessageSquare } from "lucide-react";

export default function DesktopPage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);
  useEffect(() => { setBreadcrumbs([{ label: "个人工作台" }]); }, [setBreadcrumbs]);

  const { data: tasks, isLoading } = api.task.list.useQuery();

  const myTasks = tasks?.filter((t: any) => t.status === "IN_PROGRESS" || t.status === "PENDING")?.slice(0, 5) ?? [];
  const doneTasks = tasks?.filter((t: any) => t.status === "DONE")?.slice(0, 5) ?? [];

  return (
    <AppShell>
      <Head><title>个人工作台 · 数智企业</title></Head>
      <div className="p-6">
        <div className="mb-6 flex items-center gap-3">
          <Monitor className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">个人工作台</h1>
        </div>

        {isLoading ? <LoadingSkeleton rows={6} /> : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 进行中的任务 */}
            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 flex items-center gap-2 font-semibold"><Clock className="h-4 w-4 text-yellow-500" /> 进行中</h2>
              {myTasks.length === 0 ? <p className="text-sm text-gray-400">暂无进行中的任务</p> : (
                <div className="space-y-3">{myTasks.map((t: any) => (
                  <div key={t.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                    <p className="font-medium">{t.title}</p>
                    <p className="mt-1 text-xs text-gray-500">{t.status} · {t.riskLevel}</p>
                  </div>
                ))}</div>
              )}
            </div>

            {/* 已完成的任务 */}
            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 flex items-center gap-2 font-semibold"><CheckCircle className="h-4 w-4 text-green-500" /> 最近完成</h2>
              {doneTasks.length === 0 ? <p className="text-sm text-gray-400">暂无已完成的任务</p> : (
                <div className="space-y-3">{doneTasks.map((t: any) => (
                  <div key={t.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                    <p className="font-medium">{t.title}</p>
                    <p className="mt-1 text-xs text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}</div>
              )}
            </div>

            {/* 快捷入口 */}
            <div className="rounded-xl border bg-white p-5 lg:col-span-2">
              <h2 className="mb-4 flex items-center gap-2 font-semibold"><MessageSquare className="h-4 w-4 text-purple-500" /> 快捷入口</h2>
              <div className="grid gap-3 md:grid-cols-3">
                <a href="/collaboration" className="rounded-lg border p-3 text-sm hover:bg-gray-50">💬 协作中心</a>
                <a href="/knowledge" className="rounded-lg border p-3 text-sm hover:bg-gray-50">📚 知识库</a>
                <a href="/skills" className="rounded-lg border p-3 text-sm hover:bg-gray-50">🤖 Agent 技能</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
