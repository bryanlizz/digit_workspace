// 数智企业 · Enterprise — 工具配置
import { useEffect } from "react"; import Head from "next/head"; import { AppShell } from "~/components/layout/AppShell"; import { useAppStore } from "~/stores/appStore"; import { api } from "~/utils/api"; import { LoadingSkeleton } from "~/components/common/LoadingSkeleton"; import { EmptyState } from "~/components/common/EmptyState";
export default function EnterpriseToolsPage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);
  useEffect(() => { setBreadcrumbs([{ label: "工具配置" }]); }, [setBreadcrumbs]);
  const { data: tools, isLoading } = api.tool.list.useQuery();
  return (<AppShell><Head><title>工具配置 · 数智企业</title></Head><div className="p-6"><h1 className="mb-6 text-2xl font-bold">Agent 工具授权</h1>
    {isLoading ? <LoadingSkeleton rows={5} /> : tools?.length === 0 ? <EmptyState title="暂无工具" description="先在 Admin > Tool Runtime 注册工具" /> : (
      <div className="rounded-xl border bg-white"><div className="border-b px-6 py-3"><h2 className="font-semibold">授权工具列表</h2></div>
        <table className="w-full text-sm"><thead className="bg-gray-50 text-left text-gray-500"><tr><th className="px-6 py-2">工具</th><th className="px-6 py-2">描述</th><th className="px-6 py-2">权限</th><th className="px-6 py-2">状态</th></tr></thead>
          <tbody>{tools?.map((t) => (<tr key={t.id} className="border-t"><td className="px-6 py-3 font-medium">{t.name}</td><td className="px-6 py-3 text-gray-500">{t.description}</td><td className="px-6 py-3">L{t.requiredLevel}</td><td className="px-6 py-3"><span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">已启用</span></td></tr>))}</tbody>
        </table></div>)}
  </div></AppShell>);
}
