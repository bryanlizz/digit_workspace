import Head from "next/head";
import { AdminShell } from "~/components/AdminShell";

const providers = [
  { name: "OpenAI", status: "已启用", quota: "100,000 次/月", mode: "直连" },
  { name: "Anthropic", status: "待配置", quota: "未设置", mode: "中转" },
  { name: "DeepSeek", status: "已启用", quota: "50,000 次/月", mode: "直连" },
];

const routingRules = [
  { scene: "复杂任务规划", model: "Claude / GPT 高阶模型", limit: "L4-L6 动作需审批" },
  { scene: "常规问答与摘要", model: "通用模型池", limit: "按租户配额限流" },
  { scene: "结构化抽取", model: "低延迟模型", limit: "仅允许脱敏输入" },
];

export default function GatewayPage() {
  return (
    <>
      <Head><title>AI 网关 · 总后台</title></Head>
      <AdminShell>
        <div className="p-8">
          <div className="mb-8">
            <p className="text-sm font-medium text-blue-600">平台治理</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-800">AI 网关</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-500">
              平台级管理 AI Key、模型路由、调用配额和中转策略。web 端只消费任务结果，不再作为模型路由配置入口。
            </p>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            {[
              { label: "路由模式", value: "混合路由" },
              { label: "默认 Provider", value: "OpenAI" },
              { label: "平台并发上限", value: "120 任务" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-xs text-gray-400">{item.label}</p>
                <p className="mt-2 text-lg font-semibold text-gray-800">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-800">Provider 与 Key 状态</h2>
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="p-3 font-medium">Provider</th>
                    <th className="p-3 font-medium">状态</th>
                    <th className="p-3 font-medium">月配额</th>
                    <th className="p-3 font-medium">路由模式</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((provider) => (
                    <tr key={provider.name} className="border-t border-gray-100">
                      <td className="p-3 font-medium text-gray-800">{provider.name}</td>
                      <td className="p-3"><span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{provider.status}</span></td>
                      <td className="p-3 text-gray-600">{provider.quota}</td>
                      <td className="p-3 text-gray-600">{provider.mode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-800">模型路由规则</h2>
            <div className="grid gap-3 lg:grid-cols-3">
              {routingRules.map((rule) => (
                <div key={rule.scene} className="rounded-lg border border-gray-100 p-4">
                  <p className="font-medium text-gray-800">{rule.scene}</p>
                  <p className="mt-2 text-sm text-gray-500">{rule.model}</p>
                  <p className="mt-3 text-xs text-orange-600">{rule.limit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminShell>
    </>
  );
}
