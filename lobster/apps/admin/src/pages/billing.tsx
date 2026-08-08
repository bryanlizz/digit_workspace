import { useState } from "react";
import Head from "next/head";
import { AdminShell } from "~/components/AdminShell";
import { api } from "~/utils/api";

export default function BillingPage() {
  const { data: tenantUsage, isLoading } = api.billing.getTenantUsage.useQuery();
  const { data: subscription } = api.billing.getSubscription.useQuery();
  const { data: plans } = api.billing.getPlans.useQuery();
  const createCheckout = api.billing.createCheckoutSession.useMutation();
  const cancelSub = api.billing.cancelSubscription.useMutation();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const currentPlan = subscription?.plan ?? tenantUsage?.plan?.id ?? "free";
  const cost = tenantUsage ? tenantUsage.plan.seatPrice * tenantUsage.usage.seats + tenantUsage.plan.agentPrice * tenantUsage.usage.agents : 0;
  const usageSeats = tenantUsage?.usage.seats ?? 0;
  const usageAgents = tenantUsage?.usage.agents ?? 0;

  const handleUpgrade = async (planId: "pro" | "enterprise", seats: number) => {
    setCheckoutError(null);
    const result = await createCheckout.mutateAsync({
      planId,
      seats,
      successUrl: window.location.href + "?checkout=success",
      cancelUrl: window.location.href + "?checkout=cancelled",
    });
    if ("error" in result) {
      setCheckoutError(result.error);
    } else if ("url" in result && result.url) {
      window.location.href = result.url;
    }
  };

  const handleCancel = async () => {
    if (confirm("确定在当前周期结束后取消订阅？")) {
      await cancelSub.mutateAsync();
    }
  };

  const planDisplay = plans ?? [
    { id: "free", name: "Free", seatPrice: 0, agentPrice: 0, maxSeats: 1, maxAgents: 3 },
    { id: "pro", name: "Pro", seatPrice: 199, agentPrice: 99, maxSeats: 10, maxAgents: 30 },
    { id: "enterprise", name: "Enterprise", seatPrice: 999, agentPrice: 299, maxSeats: 100, maxAgents: 500 },
  ];

  if (isLoading) return <AdminShell><div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div></AdminShell>;

  return (
    <>
      <Head><title>总后台 · 计费管理</title></Head>
      <AdminShell>
        <div className="p-6">
          <h1 className="mb-2 text-2xl font-bold text-gray-800">💰 计费管理</h1>
          <p className="mb-6 text-sm text-gray-500">管理套餐和订阅</p>

          {subscription ? (
            <div className="mb-8 rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-200">当前订阅</p>
                  <h2 className="text-2xl font-bold">{subscription.plan === "pro" ? "Pro" : "Enterprise"}</h2>
                  <p className="mt-1 text-blue-100">
                    月费 ¥{cost.toLocaleString()} · {usageSeats} 席位 · {usageAgents} Agent
                    {subscription.cancelAtPeriodEnd && " · 已标记取消"}
                  </p>
                </div>
                <div className="flex gap-3">
                  {!subscription.cancelAtPeriodEnd && (
                    <button onClick={handleCancel} disabled={cancelSub.isPending}
                      className="rounded-full bg-white/20 px-4 py-1.5 text-xs font-medium hover:bg-white/30">
                      {cancelSub.isPending ? "取消中..." : "取消订阅"}
                    </button>
                  )}
                  <span className={`rounded-full px-4 py-1 text-xs font-medium ${subscription.status === "active" ? "bg-green-500" : "bg-yellow-500"}`}>
                    {subscription.status === "active" ? "活跃" : subscription.status}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-8 rounded-xl bg-gradient-to-r from-gray-600 to-gray-800 p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">当前套餐</p>
                  <h2 className="text-2xl font-bold">{currentPlan === "free" ? "Free" : currentPlan}</h2>
                  <p className="mt-1 text-gray-300">免费套餐 · {usageSeats} 席位 · {usageAgents} Agent</p>
                </div>
                <span className="rounded-full bg-gray-500 px-4 py-1 text-xs font-medium">Free</span>
              </div>
            </div>
          )}

          {checkoutError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{checkoutError}</div>
          )}

          <h3 className="mb-4 font-bold text-gray-800">套餐对比</h3>
          <div className="mb-8 overflow-hidden rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="p-4 font-medium text-gray-500">功能</th>
                  {planDisplay.map((p) => (
                    <th key={p.id} className={`p-4 font-medium ${currentPlan === p.id ? "text-blue-600" : "text-gray-500"}`}>
                      {p.name} {currentPlan === p.id && "✓"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "价格", render: (p: typeof planDisplay[number]) => p.seatPrice === 0 ? "免费" : `¥${p.seatPrice}/席` },
                  { label: "员工席位", render: (p: typeof planDisplay[number]) => `最多 ${p.maxSeats} 个` },
                  { label: "Agent 数量", render: (p: typeof planDisplay[number]) => `最多 ${p.maxAgents} 个` },
                  { label: "操作", render: (p: typeof planDisplay[number]) => {
                    if (p.id === "free" || p.id === currentPlan) return null;
                    const seats = p.id === "pro" ? 10 : 100;
                    return (
                      <button
                        onClick={() => handleUpgrade(p.id as "pro" | "enterprise", seats)}
                        disabled={createCheckout.isPending}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {createCheckout.isPending ? "跳转中..." : "升级"}
                      </button>
                    );
                  }},
                ].map((row) => (
                  <tr key={row.label} className="border-b border-gray-50">
                    <td className="p-4 text-gray-600">{row.label}</td>
                    {planDisplay.map((p) => <td key={p.id} className="p-4">{row.render(p)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {tenantUsage?.estimate && (
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-gray-800">本月预估账单</h3>
              <p className="mt-1 text-xs text-gray-500">当前用量预估（不含折扣）</p>
              <div className="mt-4 space-y-2">
                {tenantUsage.estimate.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.description} × {item.quantity}</span>
                    <span className="font-medium text-gray-800">¥{item.total.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold">
                  <span>合计</span>
                  <span>¥{tenantUsage.estimate.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminShell>
    </>
  );
}
