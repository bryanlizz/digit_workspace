// ─────────────────────────────────────────────────────────
// 数智企业 · Admin — Tool Runtime 治理
// ─────────────────────────────────────────────────────────

import { useEffect } from "react";
import Head from "next/head";
import { AppShell } from "~/components/layout/AppShell";
import { useAppStore } from "~/stores/appStore";
import { api } from "~/utils/api";
import { LoadingSkeleton } from "~/components/common/LoadingSkeleton";
import { Wrench, CheckCircle, AlertTriangle } from "lucide-react";

export default function ToolsPage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);
  useEffect(() => { setBreadcrumbs([{ label: "Tool Runtime" }]); }, [setBreadcrumbs]);

  const { data: tools, isLoading } = api.tool.list.useQuery();
  const builtins = tools?.filter((t) => !t.systemType.startsWith("mcp-")) ?? [];
  const mcps = tools?.filter((t) => t.systemType.startsWith("mcp-")) ?? [];

  return (
    <AppShell>
      <Head><title>Tool Runtime · 数智企业</title></Head>
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold">Tool Runtime 治理</h1>
        {isLoading ? <LoadingSkeleton rows={4} /> : (
          <>
            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <Stat icon={Wrench} label="总工具数" value={tools?.length ?? 0} color="blue" />
              <Stat icon={CheckCircle} label="内置工具" value={builtins.length} color="green" />
              <Stat icon={AlertTriangle} label="MCP 外部工具" value={mcps.length} color="purple" />
            </div>
            <div className="rounded-xl border bg-white">
              <div className="border-b px-6 py-3"><h2 className="font-semibold">工具清单</h2></div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500"><tr><th className="px-6 py-2">ID</th><th className="px-6 py-2">名称</th><th className="px-6 py-2">系统</th><th className="px-6 py-2">权限</th><th className="px-6 py-2">审批</th></tr></thead>
                <tbody>{tools?.map((t) => (
                  <tr key={t.id} className="border-t"><td className="px-6 py-3 font-mono text-xs">{t.id}</td><td className="px-6 py-3 font-medium">{t.name}</td><td className="px-6 py-3 text-gray-500">{t.systemType}</td><td className="px-6 py-3">L{t.requiredLevel}</td><td className="px-6 py-3">{t.requiresApproval ? "✅" : "—"}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colors: Record<string, string> = { blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600", purple: "bg-purple-50 text-purple-600" };
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className={`mb-2 inline-flex rounded-lg p-2 ${colors[color]}`}><Icon className="h-5 w-5" /></div>
      <p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
