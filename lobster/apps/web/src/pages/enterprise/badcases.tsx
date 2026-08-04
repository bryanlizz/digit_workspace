// 数智企业 · Enterprise — Bad Case 管理
import { useEffect } from "react"; import Head from "next/head"; import { AppShell } from "~/components/layout/AppShell"; import { useAppStore } from "~/stores/appStore"; import { api } from "~/utils/api"; import { LoadingSkeleton } from "~/components/common/LoadingSkeleton"; import { EmptyState } from "~/components/common/EmptyState"; import { AlertCircle } from "lucide-react";
export default function BadCasesPage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);
  useEffect(() => { setBreadcrumbs([{ label: "Bad Case" }]); }, [setBreadcrumbs]);
  const { data: tasks, isLoading } = api.task.list.useQuery({ status: "REJECTED" } as any);
  const failedTasks = tasks?.filter((t: any) => t.status === "REJECTED") ?? [];
  return (<AppShell><Head><title>Bad Case · 数智企业</title></Head><div className="p-6"><h1 className="mb-6 text-2xl font-bold">Bad Case 管理</h1>
    {isLoading ? <LoadingSkeleton rows={5} /> : failedTasks.length === 0 ? <EmptyState title="暂无失败案例" description="所有任务执行正常" /> : (
      <div className="rounded-xl border bg-white"><div className="border-b px-6 py-3 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-500"/><h2 className="font-semibold">失败任务 ({failedTasks.length})</h2></div>
        <table className="w-full text-sm"><thead className="bg-gray-50 text-left text-gray-500"><tr><th className="px-6 py-2">任务</th><th className="px-6 py-2">状态</th><th className="px-6 py-2">风险</th><th className="px-6 py-2">时间</th></tr></thead>
          <tbody>{failedTasks.map((t: any) => (<tr key={t.id} className="border-t"><td className="px-6 py-3 font-medium">{t.title}</td><td className="px-6 py-3"><span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">失败</span></td><td className="px-6 py-3">{t.riskLevel}</td><td className="px-6 py-3 text-xs text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</td></tr>))}</tbody>
        </table></div>)}
  </div></AppShell>);
}
