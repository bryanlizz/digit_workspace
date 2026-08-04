import Head from "next/head";
import { EnterpriseShell } from "~/components/EnterpriseShell";

const rules = [
  { name: "外部消息发送", level: "L4", approver: "直属主管", status: "已启用" },
  { name: "关键业务修改", level: "L6", approver: "业务负责人 + 管理员", status: "强制" },
  { name: "敏感数据导出", level: "L5", approver: "数据负责人", status: "已启用" },
];

const pending = [
  { task: "发送候选人邀约邮件", agent: "招聘助理 Agent", level: "L4", status: "等待审批" },
  { task: "批量更新 CRM 阶段", agent: "销售线索 Agent", level: "L6", status: "等待二审" },
];

export default function ApprovalsPage() {
  return (
    <>
      <Head><title>审批流 · 企业后台</title></Head>
      <EnterpriseShell>
        <div className="p-8">
          <div className="mb-8">
            <p className="text-sm font-medium text-indigo-600">企业治理</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-800">审批流</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-500">
              配置企业内的动作级审批规则，并集中查看高等级操作、外发消息和敏感数据动作的待审批任务。
            </p>
          </div>

          <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-800">审批规则</h2>
            <div className="grid gap-4 lg:grid-cols-3">
              {rules.map((rule) => (
                <div key={rule.name} className="rounded-lg border border-gray-100 p-4">
                  <p className="font-medium text-gray-800">{rule.name}</p>
                  <p className="mt-2 text-sm text-gray-500">审批人：{rule.approver}</p>
                  <div className="mt-4 flex gap-2 text-xs">
                    <span className="rounded bg-orange-50 px-2 py-1 text-orange-700">{rule.level}</span>
                    <span className="rounded bg-indigo-50 px-2 py-1 text-indigo-700">{rule.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-800">待审批任务</h2>
            <div className="space-y-3">
              {pending.map((item) => (
                <div key={item.task} className="flex items-start justify-between rounded-lg border border-gray-100 p-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{item.task}</p>
                    <p className="mt-1 text-xs text-gray-500">{item.agent} · {item.level}</p>
                  </div>
                  <span className="rounded bg-orange-50 px-2 py-1 text-xs text-orange-700">{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </EnterpriseShell>
    </>
  );
}
