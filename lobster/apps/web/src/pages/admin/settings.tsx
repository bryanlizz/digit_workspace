// 数智企业 · Admin — 系统设置
import { useEffect } from "react"; import Head from "next/head"; import { AppShell } from "~/components/layout/AppShell"; import { useAppStore } from "~/stores/appStore"; import { Settings } from "lucide-react";
export default function SettingsPage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);
  useEffect(() => { setBreadcrumbs([{ label: "系统设置" }]); }, [setBreadcrumbs]);
  return (<AppShell><Head><title>设置 · 数智企业</title></Head><div className="p-6"><h1 className="mb-6 text-2xl font-bold">系统设置</h1>
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-5"><h3 className="mb-3 font-semibold">认证模式</h3><p className="text-sm text-gray-500">当前: local · 支持 local / sso / hybrid</p></div>
      <div className="rounded-xl border bg-white p-5"><h3 className="mb-3 font-semibold">浏览器驱动</h3><p className="text-sm text-gray-500">当前: 环境变量 BROWSER_DRIVER · 支持 fetch / playwright</p></div>
      <div className="rounded-xl border bg-white p-5"><h3 className="mb-3 font-semibold">部署模式</h3><p className="text-sm text-gray-500">当前: 环境变量 DEPLOYMENT_MODE · 支持 local / private / enterprise</p></div>
      <div className="rounded-xl border bg-white p-5"><h3 className="mb-3 font-semibold">数据库</h3><p className="text-sm text-gray-500">DATABASE_URL 控制 · SQLite (dev) / PostgreSQL (prod)</p></div>
    </div>
  </div></AppShell>);
}
