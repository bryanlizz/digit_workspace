import Head from "next/head";
import { EnterpriseShell } from "~/components/EnterpriseShell";

const cases = [
  { title: "候选人重复触达", source: "招聘助理 Agent", status: "待人工确认", impact: "外发消息策略" },
  { title: "CRM 阶段误判", source: "销售线索 Agent", status: "已归因", impact: "工具参数校验" },
  { title: "客服摘要遗漏", source: "客服质检 Agent", status: "进入记忆", impact: "质检规则" },
];

const flows = ["人工确认", "原因归类", "关联任务回放", "进入记忆", "影响 Agent 评分", "生成改进动作"];

export default function BadCasesPage() {
  return (
    <>
      <Head><title>Bad Case · 企业后台</title></Head>
      <EnterpriseShell>
        <div className="p-8">
          <div className="mb-8">
            <p className="text-sm font-medium text-indigo-600">企业治理</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-800">Bad Case</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-500">
              管理企业内 Agent 执行失败、误操作和业务质量问题，支持人工确认、归因、进入记忆和影响 Agent 评分。
            </p>
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            {cases.map((item) => (
              <div key={item.title} className="rounded-xl bg-white p-5 shadow-sm">
                <p className="font-semibold text-gray-800">{item.title}</p>
                <p className="mt-2 text-sm text-gray-500">来源：{item.source}</p>
                <p className="mt-1 text-sm text-gray-500">影响：{item.impact}</p>
                <p className="mt-4 text-xs text-indigo-600">{item.status}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-800">处理流程</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {flows.map((flow) => (
                <div key={flow} className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">{flow}</div>
              ))}
            </div>
          </div>
        </div>
      </EnterpriseShell>
    </>
  );
}
