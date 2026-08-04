import Head from "next/head";
import { EnterpriseShell } from "~/components/EnterpriseShell";

const environments = [
  { name: "招聘浏览器池", status: "运行中", detail: "Boss 登录态隔离，截图与录屏已开启" },
  { name: "销售浏览器池", status: "待接入", detail: "CRM 内网页面自动化与代理策略" },
  { name: "客服质检环境", status: "配置中", detail: "只读回放，禁止外部提交动作" },
];

const controls = ["租户隔离", "登录态托管", "截图留痕", "可选录屏", "代理 / IP 池", "人工接管"];

export default function BrowserPage() {
  return (
    <>
      <Head><title>浏览器自动化 · 企业后台</title></Head>
      <EnterpriseShell>
        <div className="p-8">
          <div className="mb-8">
            <p className="text-sm font-medium text-indigo-600">执行环境</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-800">浏览器自动化</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-500">
              配置企业内的浏览器自动化环境、登录态、截图录屏、代理策略和人工接管入口，用于需要真实页面操作的 Connector。
            </p>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            {environments.map((environment) => (
              <div key={environment.name} className="rounded-xl bg-white p-5 shadow-sm">
                <p className="font-semibold text-gray-800">{environment.name}</p>
                <p className="mt-2 text-sm text-gray-500">{environment.detail}</p>
                <p className="mt-4 text-xs text-indigo-600">{environment.status}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-800">环境治理能力</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {controls.map((control) => (
                <div key={control} className="rounded-lg border border-gray-100 p-4 text-sm text-gray-700">{control}</div>
              ))}
            </div>
          </div>
        </div>
      </EnterpriseShell>
    </>
  );
}
