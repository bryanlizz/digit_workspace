import Head from "next/head";
import Link from "next/link";
import { AdminShell } from "~/components/AdminShell";

const entries = [
  { href: "/billing", title: "计费管理", detail: "套餐、席位、Agent 用量和账单治理" },
  { href: "/employees", title: "平台用户", detail: "平台管理员、运营人员和租户人员视图" },
  { href: "/permissions", title: "平台权限策略", detail: "全局操作级别上限、平台角色和策略模板" },
  { href: "/gateway", title: "AI 网关", detail: "AI Key、模型路由、配额和中转策略" },
  { href: "/tool-runtime", title: "MCP / Tool Runtime", detail: "MCP Server、工具目录、执行策略和审计规则" },
  { href: "/connectors", title: "Connector Registry", detail: "连接器类型、动作定义、事件订阅和审批等级模板" },
  { href: "/audit", title: "平台审计", detail: "审计保留、脱敏、不可篡改和合规导出" },
  { href: "/deployments", title: "部署治理", detail: "SaaS、私有化、Agent Worker、Docker 和 Helm" },
];

export default function AdminIndex() {
  return (
    <>
      <Head><title>数智企业 · 总后台</title></Head>
      <AdminShell>
        <div className="p-8">
          <div className="mb-8">
            <p className="text-sm font-medium text-blue-600">平台总后台</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-800">平台治理中心</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-500">
              面向平台运营者，统一管理多租户、计费、平台权限、AI 网关、工具运行时、连接器、审计和部署治理。
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {entries.map((entry) => (
              <Link key={entry.href} href={entry.href} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                <p className="font-semibold text-gray-800">{entry.title}</p>
                <p className="mt-2 text-sm text-gray-500">{entry.detail}</p>
              </Link>
            ))}
          </div>
        </div>
      </AdminShell>
    </>
  );
}
