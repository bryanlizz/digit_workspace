import Head from "next/head";
import Link from "next/link";

export default function EnterpriseIndex() {
  return (
    <>
      <Head><title>数智企业 · 企业后台</title></Head>
      <div className="min-h-screen bg-gray-50 p-8">
        <h1 className="mb-2 text-2xl font-bold text-gray-800">企业后台</h1>
        <p className="mb-8 text-sm text-gray-500">企业配置与管理中心</p>
        <nav className="grid grid-cols-1 gap-3 max-w-lg sm:grid-cols-2">
          <Link href="/employees" className="rounded-lg bg-white p-4 shadow-sm hover:shadow-md transition-shadow text-gray-800 font-medium">
            👥 员工管理
          </Link>
          <Link href="/permissions" className="rounded-lg bg-white p-4 shadow-sm hover:shadow-md transition-shadow text-gray-800 font-medium">
            🔐 权限配置
          </Link>
          <Link href="/agents" className="rounded-lg bg-white p-4 shadow-sm hover:shadow-md transition-shadow text-gray-800 font-medium">
            🤖 Agent 管理
          </Link>
          <Link href="/credentials" className="rounded-lg bg-white p-4 shadow-sm hover:shadow-md transition-shadow text-gray-800 font-medium">
            🔑 凭证管理
          </Link>
          <Link href="/knowledge" className="rounded-lg bg-white p-4 shadow-sm hover:shadow-md transition-shadow text-gray-800 font-medium">
            📚 知识库
          </Link>
        </nav>
      </div>
    </>
  );
}
