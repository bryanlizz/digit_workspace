// ─────────────────────────────────────────────────────────
// 数智企业 · Admin — AI 网关配置
// ─────────────────────────────────────────────────────────

import { useEffect } from "react";
import Head from "next/head";
import { AppShell } from "~/components/layout/AppShell";
import { useAppStore } from "~/stores/appStore";
import { api } from "~/utils/api";
import { LoadingSkeleton } from "~/components/common/LoadingSkeleton";
import { EmptyState } from "~/components/common/EmptyState";
import { Zap, Activity, Key, Route } from "lucide-react";

export default function GatewayPage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);
  useEffect(() => { setBreadcrumbs([{ label: "AI 网关" }]); }, [setBreadcrumbs]);

  const { data: status, isLoading } = api.agent.getAIGatewayStatus.useQuery();

  return (
    <AppShell>
      <Head><title>AI 网关 · 数智企业</title></Head>
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold">AI 网关配置</h1>
        {isLoading ? <LoadingSkeleton rows={3} /> : !status ? <EmptyState title="暂无数据" /> : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard icon={Route} label="路由模式" value={status.routing.mode} color="blue" />
              <StatCard icon={Zap} label="默认 Provider" value={status.routing.defaultProvider} color="green" />
              <StatCard icon={Key} label="默认模型" value={status.routing.defaultModel} color="purple" />
              <StatCard icon={Activity} label="健康状态" value={status.health.ok ? "正常" : "异常"} color={status.health.ok ? "green" : "red"} />
            </div>
            <div className="rounded-xl border bg-white p-6">
              <h2 className="mb-4 font-semibold">路由配置</h2>
              <dl className="grid gap-3 text-sm md:grid-cols-2">
                <Item label="Relay URL" value={status.routing.relayUrl || "未配置"} />
                <Item label="Public Relay" value={status.routing.publicRelayUrl || "未配置"} />
                <Item label="Direct 可用" value={status.health.directConfigured ? "✅" : "❌"} />
                <Item label="Relay 可用" value={status.health.relayConfigured ? "✅" : "❌"} />
                <Item label="Retry 次数" value={String(status.health.relayRetryAttempts)} />
                <Item label="Streaming" value={status.health.supportsStreaming ? "✅" : "❌"} />
              </dl>
              {status.health.issues.length > 0 && (
                <div className="mt-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700">
                  ⚠️ {status.health.issues.join(" · ")}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colors: Record<string, string> = { blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600", purple: "bg-purple-50 text-purple-600", red: "bg-red-50 text-red-600" };
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className={`mb-2 inline-flex rounded-lg p-2 ${colors[color] ?? colors.blue}`}><Icon className="h-5 w-5" /></div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 font-semibold text-gray-800">{value}</p>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return <><dt className="text-gray-500">{label}</dt><dd className="font-medium text-gray-800">{value}</dd></>;
}
