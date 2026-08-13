// ─────────────────────────────────────────────────────────
// 数智企业 · Admin — MCP Server 管理
// ─────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Head from "next/head";
import { AppShell } from "~/components/layout/AppShell";
import { useAppStore } from "~/stores/appStore";
import { api } from "~/utils/api";
import { LoadingSkeleton } from "~/components/common/LoadingSkeleton";
import { EmptyState } from "~/components/common/EmptyState";
import { Server, Plug, Wrench } from "lucide-react";

export default function MCPPage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);
  useEffect(() => { setBreadcrumbs([{ label: "MCP Server" }]); }, [setBreadcrumbs]);

  const { data: tools } = api.tool.list.useQuery();
  const mcpTools = tools?.filter((t) => t.systemType.startsWith("mcp-")) ?? [];

  return (
    <AppShell>
      <Head><title>MCP Server · 数智企业</title></Head>
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold">MCP Server 注册</h1>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-4">
            <div className="mb-2 inline-flex rounded-lg bg-blue-50 p-2"><Server className="h-5 w-5 text-blue-600" /></div>
            <p className="text-xs text-gray-500">已注册 Server</p>
            <p className="mt-1 text-2xl font-bold">{new Set(mcpTools.map((t) => t.systemType)).size}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="mb-2 inline-flex rounded-lg bg-green-50 p-2"><Plug className="h-5 w-5 text-green-600" /></div>
            <p className="text-xs text-gray-500">可用工具</p>
            <p className="mt-1 text-2xl font-bold">{mcpTools.length}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="mb-2 inline-flex rounded-lg bg-purple-50 p-2"><Wrench className="h-5 w-5 text-purple-600" /></div>
            <p className="text-xs text-gray-500">全部工具</p>
            <p className="mt-1 text-2xl font-bold">{tools?.length ?? 0}</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border bg-white">
          <div className="border-b px-6 py-3"><h2 className="font-semibold">MCP 工具列表</h2></div>
          {mcpTools.length === 0 ? (
            <EmptyState title="暂无 MCP 工具" description="配置 MCP Server 后，工具将自动注册到这里" />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500"><tr><th className="px-6 py-2">工具名</th><th className="px-6 py-2">描述</th><th className="px-6 py-2">权限等级</th></tr></thead>
              <tbody>{mcpTools.map((t) => (
                <tr key={t.id} className="border-t"><td className="px-6 py-3 font-medium">{t.name}</td><td className="px-6 py-3 text-gray-500">{t.description}</td><td className="px-6 py-3">L{t.requiredLevel}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
