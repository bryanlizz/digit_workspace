import Head from "next/head";
import { AdminShell } from "~/components/AdminShell";

const deployments = [
  { name: "SaaS 多租户", status: "运行中", detail: "平台统一调度，租户数据隔离" },
  { name: "私有化部署包", status: "规划中", detail: "Docker Compose + Helm Chart" },
  { name: "企业内网 Worker", status: "待接入", detail: "企业侧执行器、内网连接和数据同步" },
];

const versions = [
  { component: "Agent Worker", version: "0.1.0", channel: "stable" },
  { component: "Browser Runtime", version: "0.1.0", channel: "preview" },
  { component: "Connector Runtime", version: "0.1.0", channel: "preview" },
];

export default function DeploymentsPage() {
  return (
    <>
      <Head><title>部署治理 · 总后台</title></Head>
      <AdminShell>
        <div className="p-8">
          <div className="mb-8">
            <p className="text-sm font-medium text-blue-600">平台治理</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-800">部署治理</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-500">
              管理 SaaS、私有化部署、Agent Worker 版本、Docker / Helm 发布和企业内网连接策略。
            </p>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            {deployments.map((deployment) => (
              <div key={deployment.name} className="rounded-xl bg-white p-5 shadow-sm">
                <p className="font-semibold text-gray-800">{deployment.name}</p>
                <p className="mt-2 text-sm text-gray-500">{deployment.detail}</p>
                <p className="mt-4 text-xs text-blue-600">{deployment.status}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-800">执行器版本</h2>
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="p-3 font-medium">组件</th>
                    <th className="p-3 font-medium">版本</th>
                    <th className="p-3 font-medium">发布通道</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((item) => (
                    <tr key={item.component} className="border-t border-gray-100">
                      <td className="p-3 font-medium text-gray-800">{item.component}</td>
                      <td className="p-3 font-mono text-gray-600">{item.version}</td>
                      <td className="p-3 text-gray-600">{item.channel}</td>
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
