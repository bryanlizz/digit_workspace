import Head from "next/head";
import { EnterpriseShell } from "~/components/EnterpriseShell";

const capabilities = [
  { title: "创建与克隆", detail: "从员工分身或独立 Agent 模板创建，支持复制已有配置" },
  { title: "责任链", detail: "配置直属负责人、审批人、升级路径和异常接管人" },
  { title: "操作等级", detail: "限制 Agent 可执行的 L0-L6 动作范围" },
  { title: "外部账号绑定", detail: "绑定飞书、Boss、CRM、邮箱等外部系统账号引用" },
];

const agents = [
  { name: "招聘助理 Agent", type: "员工分身", owner: "HR 主管", level: "L4", status: "待授权工具" },
  { name: "销售线索 Agent", type: "独立 Agent", owner: "销售负责人", level: "L3", status: "运行中" },
  { name: "客服质检 Agent", type: "独立 Agent", owner: "客服主管", level: "L2", status: "配置中" },
];

export default function AgentsPage() {
  return (
    <>
      <Head><title>Agent 管理 · 企业后台</title></Head>
      <EnterpriseShell>
        <div className="p-8">
          <div className="mb-8">
            <p className="text-sm font-medium text-indigo-600">企业治理</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-800">Agent 管理</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-500">
              管理企业内的员工分身和独立 Agent，配置负责人、责任链、操作等级、外部账号绑定和工具授权状态。
            </p>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-4">
            {capabilities.map((item) => (
              <div key={item.title} className="rounded-xl bg-white p-5 shadow-sm">
                <p className="font-semibold text-gray-800">{item.title}</p>
                <p className="mt-2 text-sm text-gray-500">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-800">Agent 概览</h2>
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="p-3 font-medium">Agent</th>
                    <th className="p-3 font-medium">类型</th>
                    <th className="p-3 font-medium">负责人</th>
                    <th className="p-3 font-medium">最高等级</th>
                    <th className="p-3 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => (
                    <tr key={agent.name} className="border-t border-gray-100">
                      <td className="p-3 font-medium text-gray-800">{agent.name}</td>
                      <td className="p-3 text-gray-600">{agent.type}</td>
                      <td className="p-3 text-gray-600">{agent.owner}</td>
                      <td className="p-3 text-gray-600">{agent.level}</td>
                      <td className="p-3"><span className="rounded bg-indigo-50 px-2 py-1 text-xs text-indigo-700">{agent.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </EnterpriseShell>
    </>
  );
}
