// ─────────────────────────────────────────────────────────
// 数智企业 · Admin — Connector Registry
// ─────────────────────────────────────────────────────────

import { useEffect } from "react";
import Head from "next/head";
import { AppShell } from "~/components/layout/AppShell";
import { useAppStore } from "~/stores/appStore";
import { api } from "~/utils/api";
import { LoadingSkeleton } from "~/components/common/LoadingSkeleton";
import { Plug, CheckCircle, XCircle } from "lucide-react";

const CONNECTORS = [
  { id: "feishu", name: "飞书", tools: ["feishu.message", "feishu.approval", "feishu.doc.create"], icon: "📨" },
  { id: "boss", name: "Boss 直聘", tools: ["boss.login", "boss.search", "boss.greet", "boss.resume"], icon: "💼" },
  { id: "email", name: "邮件", tools: ["email.send", "email.read"], icon: "📧" },
  { id: "browser", name: "浏览器自动化", tools: ["browser.navigate", "browser.click", "browser.screenshot"], icon: "🌐" },
];

export default function ConnectorsPage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);
  useEffect(() => { setBreadcrumbs([{ label: "Connector Registry" }]); }, [setBreadcrumbs]);

  const { data: tools, isLoading } = api.tool.list.useQuery();

  const getToolStatus = (toolId: string) => tools?.some((t) => t.id === toolId);

  return (
    <AppShell>
      <Head><title>Connectors · 数智企业</title></Head>
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold">Connector Registry</h1>
        {isLoading ? <LoadingSkeleton rows={4} /> : (
          <div className="grid gap-4 md:grid-cols-2">
            {CONNECTORS.map((conn) => (
              <div key={conn.id} className="rounded-xl border bg-white p-5">
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-2xl">{conn.icon}</span>
                  <div><h3 className="font-semibold">{conn.name}</h3><p className="text-xs text-gray-500">connector/{conn.id}</p></div>
                  <div className="ml-auto">{tools ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-gray-300" />}</div>
                </div>
                <div className="space-y-1.5">
                  {conn.tools.map((tid) => (
                    <div key={tid} className="flex items-center gap-2 text-sm">
                      {getToolStatus(tid) ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-gray-300" />}
                      <span className="font-mono text-xs text-gray-600">{tid}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
