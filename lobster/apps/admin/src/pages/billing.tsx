import Head from "next/head";
import { AdminShell } from "~/components/AdminShell";
import { api } from "~/utils/api";

const PLANS = [
  { id: "free", name: "Free", price: "免费", seats: 1, agents: 3, features: [true, false, false, false, false] },
  { id: "pro", name: "Pro", price: "¥199/席", seats: 10, agents: 30, features: [true, true, true, false, false] },
  { id: "enterprise", name: "Enterprise", price: "¥999/席", seats: 100, agents: 500, features: [true, true, true, true, true] },
];
const FEATURE_LABELS = ["预设角色", "知识库", "知识图谱", "A2A 协作", "私有化部署"];

export default function BillingPage() {
  const plan = "pro";
  const cost = 3 * 199 + 5 * 99;

  return (
    <>
      <Head><title>总后台 · 计费管理</title></Head>
      <AdminShell>
        <div className="p-6">
          <h1 className="mb-2 text-2xl font-bold text-gray-800">💰 计费管理</h1>
          <p className="mb-6 text-sm text-gray-500">管理套餐和订阅</p>

          <div className="mb-8 rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200">当前套餐</p>
                <h2 className="text-2xl font-bold">Pro</h2>
                <p className="mt-1 text-blue-100">月费 ¥{cost.toLocaleString()} · 3 席位 · 5 Agent</p>
              </div>
              <span className="rounded-full bg-green-500 px-4 py-1 text-xs font-medium">活跃</span>
            </div>
          </div>

          <h3 className="mb-4 font-bold text-gray-800">套餐对比</h3>
          <div className="mb-8 overflow-hidden rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="p-4 font-medium text-gray-500">功能</th>
                  {PLANS.map((p) => (
                    <th key={p.id} className={`p-4 font-medium ${plan === p.id ? "text-blue-600" : "text-gray-500"}`}>
                      {p.name} {plan === p.id && "✓"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "价格", render: (p: typeof PLANS[number]) => p.price },
                  { label: "员工席位", render: (p: typeof PLANS[number]) => `最多 ${p.seats} 个` },
                  { label: "Agent 数量", render: (p: typeof PLANS[number]) => `最多 ${p.agents} 个` },
                  ...FEATURE_LABELS.map((label, i) => ({
                    label,
                    render: (p: typeof PLANS[number]) => p.features[i] ? "✅" : "❌",
                  })),
                ].map((row) => (
                  <tr key={row.label} className="border-b border-gray-50">
                    <td className="p-4 text-gray-600">{row.label}</td>
                    {PLANS.map((p) => <td key={p.id} className="p-4">{row.render(p)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AdminShell>
    </>
  );
}
