import Head from "next/head";
import { EnterpriseShell } from "~/components/EnterpriseShell";

const toolScopes = [
  { name: "飞书 MCP", status: "已启用", agents: "招聘助理、会议纪要", approval: "L3 起审批" },
  { name: "Boss 直聘 Browser", status: "待配置凭证", agents: "招聘助理", approval: "L4 强制审批" },
  { name: "邮件 SMTP", status: "已启用", agents: "销售线索、客服质检", approval: "L4 外发审批" },
];

const policies = ["企业启用工具", "连接实例配置", "Agent 工具授权", "动作范围限制", "审批等级继承", "凭证引用绑定"];

export default function ToolsPage() {
  return (
    <>
      <Head><title>工具授权 · 企业后台</title></Head>
      <EnterpriseShell>
        <div className="p-8">
          <div className="mb-8">
            <p className="text-sm font-medium text-indigo-600">企业治理</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-800">工具授权</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-500">
              企业侧选择可用 MCP 工具和 Connector 实例，并授权具体 Agent 使用哪些动作范围。平台级工具定义由 admin 维护。
            </p>
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            {toolScopes.map((tool) => (
              <div key={tool.name} className="rounded-xl bg-white p-5 shadow-sm">
                <p className="font-semibold text-gray-800">{tool.name}</p>
                <p className="mt-2 text-sm text-gray-500">授权 Agent：{tool.agents}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded bg-indigo-50 px-2 py-1 text-indigo-700">{tool.status}</span>
                  <span className="rounded bg-orange-50 px-2 py-1 text-orange-700">{tool.approval}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-800">授权配置范围</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {policies.map((policy) => (
                <div key={policy} className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">{policy}</div>
              ))}
            </div>
          </div>
        </div>
      </EnterpriseShell>
    </>
  );
}
