import Head from "next/head";
import { EnterpriseShell } from "~/components/EnterpriseShell";

export default function KnowledgePage() {
  return (
    <>
      <Head><title>知识库 · 企业后台</title></Head>
      <EnterpriseShell>
        <div className="p-8">
          <h1 className="mb-4 text-xl font-bold text-gray-800">知识库管理</h1>
          <p className="text-sm text-gray-500">企业知识库配置与索引</p>
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
            <p className="text-gray-400 text-sm">知识库列表已接入</p>
          </div>
        </div>
      </EnterpriseShell>
    </>
  );
}
