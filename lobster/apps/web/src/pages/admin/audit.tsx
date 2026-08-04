// 数智企业 · Admin — 平台审计
import { useEffect } from "react"; import Head from "next/head"; import { AppShell } from "~/components/layout/AppShell"; import { useAppStore } from "~/stores/appStore"; import { api } from "~/utils/api"; import { LoadingSkeleton } from "~/components/common/LoadingSkeleton"; import { Download } from "lucide-react";
export default function AuditPage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);
  useEffect(() => { setBreadcrumbs([{ label: "平台审计" }]); }, [setBreadcrumbs]);
  const { data: logs, isLoading } = api.audit.list.useQuery({ limit: 50 });
  const exportCsv = api.audit.exportCsv.useQuery({ limit: 1000 }, { enabled: false });
  const handleExport = async () => {
    const result = await exportCsv.refetch();
    if (result.data) {
      const blob = new Blob([result.data as string], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `audit-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    }
  };
  return (<AppShell><Head><title>审计 · 数智企业</title></Head><div className="p-6"><div className="mb-4 flex items-center justify-between"><h1 className="text-2xl font-bold">平台审计</h1><button onClick={handleExport} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Download className="h-4 w-4"/>导出 CSV</button></div>
    {isLoading ? <LoadingSkeleton rows={8} /> : <div className="rounded-xl border bg-white"><div className="border-b px-6 py-3 flex justify-between items-center"><h2 className="font-semibold">审计日志</h2><span className="text-xs text-gray-500">{logs?.length ?? 0} 条</span></div>
      <table className="w-full text-sm"><thead className="bg-gray-50 text-left text-gray-500"><tr><th className="px-6 py-2">时间</th><th className="px-6 py-2">操作</th><th className="px-6 py-2">Agent</th><th className="px-6 py-2">Hash</th></tr></thead>
        <tbody>{logs?.map((l) => (<tr key={l.id} className="border-t"><td className="px-6 py-3 font-mono text-xs">{new Date(l.createdAt).toLocaleString()}</td><td className="px-6 py-3 font-medium">{l.action}</td><td className="px-6 py-3 text-gray-500">{l.agentId ?? "—"}</td><td className="px-6 py-3 font-mono text-xs text-gray-400">{l.currentHash?.slice(0, 12) ?? "—"}</td></tr>))}</tbody>
      </table></div>}
  </div></AppShell>);
}
