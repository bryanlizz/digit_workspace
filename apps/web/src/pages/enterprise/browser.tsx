// 数智企业 · Enterprise — 浏览器环境配置
import { useEffect } from "react"; import Head from "next/head"; import { AppShell } from "~/components/layout/AppShell"; import { useAppStore } from "~/stores/appStore"; import { Globe, Cookie, Monitor } from "lucide-react";
export default function BrowserEnvPage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);
  useEffect(() => { setBreadcrumbs([{ label: "浏览器环境" }]); }, [setBreadcrumbs]);
  return (<AppShell><Head><title>浏览器环境 · 数智企业</title></Head><div className="p-6"><h1 className="mb-6 text-2xl font-bold">浏览器自动化环境</h1>
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border bg-white p-5"><div className="mb-3 inline-flex rounded-lg bg-blue-50 p-2"><Globe className="h-5 w-5 text-blue-600"/></div><h3 className="font-semibold">驱动</h3><p className="mt-1 text-sm text-gray-500">环境变量 BROWSER_DRIVER</p><p className="mt-2 font-mono text-xs">当前: playwright</p></div>
      <div className="rounded-xl border bg-white p-5"><div className="mb-3 inline-flex rounded-lg bg-green-50 p-2"><Cookie className="h-5 w-5 text-green-600"/></div><h3 className="font-semibold">Cookie 管理</h3><p className="mt-1 text-sm text-gray-500">浏览器 Session 持久化</p><p className="mt-2 text-xs text-green-600">● Credential Vault</p></div>
      <div className="rounded-xl border bg-white p-5"><div className="mb-3 inline-flex rounded-lg bg-purple-50 p-2"><Monitor className="h-5 w-5 text-purple-600"/></div><h3 className="font-semibold">浏览器引擎</h3><p className="mt-1 text-sm text-gray-500">Headless Chromium</p><p className="mt-2 text-xs">1280x720 · 30s timeout</p></div>
    </div>
  </div></AppShell>);
}
