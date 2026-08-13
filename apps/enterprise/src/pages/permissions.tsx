import Head from "next/head";
import { EnterpriseShell } from "~/components/EnterpriseShell";

export default function PermissionsPage() {
  return (
    <>
      <Head><title>权限配置 · 企业后台</title></Head>
      <EnterpriseShell>
        <div className="p-8">
          <h1 className="mb-4 text-xl font-bold text-gray-800">权限配置</h1>
          <p className="text-sm text-gray-500">角色与权限位管理</p>
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
            <p className="text-gray-400 text-sm">权限矩阵已接入</p>
          </div>
        </div>
      </EnterpriseShell>
    </>
  );
}
