import Head from "next/head";
import { EnterpriseShell } from "~/components/EnterpriseShell";

const workers = [
  { name: "hr-worker-01", network: "企业内网", status: "在线", sync: "2 分钟前" },
  { name: "sales-worker-01", network: "SaaS 托管", status: "在线", sync: "刚刚" },
  { name: "private-worker-preview", network: "私有化集群", status: "待注册", sync: "未同步" },
];

const configs = ["内网连接", "任务队列", "数据同步", "版本通道", "执行容量", "故障接管"];

export default function WorkerPage() {
  return (
    <>
      <Head><title>Agent Worker · 企业后台</title></Head>
      <EnterpriseShell>
        <div className="p-8">
          <div className="mb-8">
            <p className="text-sm font-medium text-indigo-600">执行环境</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-800">Agent Worker</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-500">
              管理企业侧执行器、内网连接、执行容量、版本通道和数据同步状态，承接需要企业网络访问的任务执行。
            </p>
          </div>

          <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-800">Worker 实例</h2>
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="p-3 font-medium">实例</th>
                    <th className="p-3 font-medium">网络</th>
                    <th className="p-3 font-medium">状态</th>
                    <th className="p-3 font-medium">同步</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map((worker) => (
                    <tr key={worker.name} className="border-t border-gray-100">
                      <td className="p-3 font-mono text-gray-800">{worker.name}</td>
                      <td className="p-3 text-gray-600">{worker.network}</td>
                      <td className="p-3 text-gray-600">{worker.status}</td>
                      <td className="p-3 text-gray-600">{worker.sync}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-800">配置范围</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {configs.map((config) => (
                <div key={config} className="rounded-lg border border-gray-100 p-4 text-sm text-gray-700">{config}</div>
              ))}
            </div>
          </div>
        </div>
      </EnterpriseShell>
    </>
  );
}
