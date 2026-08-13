import Head from "next/head";
import { AdminShell } from "~/components/AdminShell";

const rules = [
  { title: "审计保留", detail: "默认保留 3 个月，支持按租户与事件等级延长" },
  { title: "敏感字段脱敏", detail: "Token、密码、候选人隐私、客户隐私和财务字段默认脱敏" },
  { title: "不可篡改", detail: "关键审计事件进入 append-only 日志链路" },
  { title: "合规导出", detail: "支持平台抽查、租户导出和外部审计材料生成" },
];

const events = [
  { time: "10:12", tenant: "tenant-default", action: "TOOL_CALL_REVIEWED", result: "已脱敏入库" },
  { time: "09:48", tenant: "tenant-sales", action: "APPROVAL_POLICY_CHANGED", result: "等待二次确认" },
  { time: "昨日", tenant: "tenant-hr", action: "TASK_REPLAY_EXPORTED", result: "合规导出完成" },
];

export default function AuditPage() {
  return (
    <>
      <Head><title>平台审计 · 总后台</title></Head>
      <AdminShell>
        <div className="p-8">
          <div className="mb-8">
            <p className="text-sm font-medium text-blue-600">平台治理</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-800">平台审计</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-500">
              平台级查看审计规则、保留策略、脱敏策略、不可篡改状态和合规导出，不替代企业后台的业务审计视图。
            </p>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-4">
            {rules.map((rule) => (
              <div key={rule.title} className="rounded-xl bg-white p-5 shadow-sm">
                <p className="font-semibold text-gray-800">{rule.title}</p>
                <p className="mt-2 text-sm text-gray-500">{rule.detail}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-800">最近平台审计事件</h2>
            <div className="space-y-3">
              {events.map((event) => (
                <div key={`${event.time}-${event.action}`} className="flex items-start gap-4 rounded-lg border border-gray-100 p-4 text-sm">
                  <span className="w-16 text-gray-400">{event.time}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{event.action}</p>
                    <p className="mt-1 text-xs text-gray-500">{event.tenant}</p>
                  </div>
                  <span className="rounded bg-green-50 px-2 py-1 text-xs text-green-700">{event.result}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminShell>
    </>
  );
}
