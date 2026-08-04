import Head from "next/head";
import { AdminShell } from "~/components/AdminShell";

const connectors = [
  { type: "api", name: "飞书", actions: "消息、审批、文档、通讯录", approval: "L3 起审批" },
  { type: "browser", name: "Boss 直聘", actions: "登录、搜索、打招呼、简历", approval: "L4 外发审批" },
  { type: "smtp", name: "邮件", actions: "发送邮件、附件投递", approval: "L4 外发审批" },
  { type: "api", name: "短信", actions: "发送短信、状态回执", approval: "L4 外发审批" },
];

const templates = [
  { action: "只读查询", level: "L1", approval: "无需审批", audit: "记录查询参数" },
  { action: "内部写入", level: "L2", approval: "按企业策略", audit: "记录前后状态" },
  { action: "外部消息", level: "L4", approval: "动作级审批", audit: "脱敏正文与外部 ID" },
  { action: "关键业务修改", level: "L6", approval: "强制审批", audit: "完整链路回放" },
];

export default function ConnectorsPage() {
  return (
    <>
      <Head><title>Connector Registry · 总后台</title></Head>
      <AdminShell>
        <div className="p-8">
          <div className="mb-8">
            <p className="text-sm font-medium text-blue-600">平台治理</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-800">Connector Registry</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-500">
              管理平台支持的连接器类型、动作定义、事件订阅和审批等级模板。企业实例的凭证和授权在企业后台配置。
            </p>
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-4">
            {connectors.map((connector) => (
              <div key={connector.name} className="rounded-xl bg-white p-5 shadow-sm">
                <span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{connector.type}</span>
                <h2 className="mt-4 font-semibold text-gray-800">{connector.name}</h2>
                <p className="mt-2 text-sm text-gray-500">{connector.actions}</p>
                <p className="mt-4 text-xs text-orange-600">{connector.approval}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-800">动作等级模板</h2>
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="p-3 font-medium">动作类型</th>
                    <th className="p-3 font-medium">等级</th>
                    <th className="p-3 font-medium">审批策略</th>
                    <th className="p-3 font-medium">审计要求</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => (
                    <tr key={template.action} className="border-t border-gray-100">
                      <td className="p-3 font-medium text-gray-800">{template.action}</td>
                      <td className="p-3 text-gray-600">{template.level}</td>
                      <td className="p-3 text-gray-600">{template.approval}</td>
                      <td className="p-3 text-gray-600">{template.audit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AdminShell>
    </>
  );
}
