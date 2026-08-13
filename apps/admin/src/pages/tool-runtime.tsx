import Head from "next/head";
import { AdminShell } from "~/components/AdminShell";

const servers = [
  { name: "feishu-mcp", scope: "飞书消息 / 审批 / 文档", level: "L3", audit: "参数脱敏 + 外部 ID" },
  { name: "boss-browser-runtime", scope: "Boss 登录 / 搜索 / 打招呼", level: "L4", audit: "截图 + 录屏 + 接管记录" },
  { name: "mail-smtp", scope: "邮件发送", level: "L4", audit: "正文脱敏 + 收件人留痕" },
];

const policies = ["工具定义注册", "动作参数 schema", "操作等级上限", "动作级审批模板", "调用审计规则", "失败重试与接管策略"];

export default function ToolRuntimePage() {
  return (
    <>
      <Head><title>MCP / Tool Runtime · 总后台</title></Head>
      <AdminShell>
        <div className="p-8">
          <div className="mb-8">
            <p className="text-sm font-medium text-blue-600">平台治理</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-800">MCP / Tool Runtime</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-500">
              平台级注册 MCP Server 和工具目录，定义工具动作、参数、操作等级、审批要求与审计策略。企业后台只负责启用和授权。
            </p>
          </div>

          <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-800">MCP Server 目录</h2>
            <div className="grid gap-4 lg:grid-cols-3">
              {servers.map((server) => (
                <div key={server.name} className="rounded-lg border border-gray-100 p-4">
                  <p className="font-mono text-sm font-semibold text-gray-800">{server.name}</p>
                  <p className="mt-2 text-sm text-gray-500">{server.scope}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="rounded bg-orange-50 px-2 py-1 text-orange-700">{server.level}</span>
                    <span className="rounded bg-gray-50 px-2 py-1 text-gray-600">{server.audit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-800">运行时治理范围</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {policies.map((policy) => (
                <div key={policy} className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                  {policy}
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminShell>
    </>
  );
}
