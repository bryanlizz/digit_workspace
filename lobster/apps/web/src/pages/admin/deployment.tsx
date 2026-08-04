// 数智企业 · Admin — 部署治理
import { useEffect } from "react"; import Head from "next/head"; import { AppShell } from "~/components/layout/AppShell"; import { useAppStore } from "~/stores/appStore"; import { Server, Container, HardDrive } from "lucide-react";
export default function DeploymentPage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);
  useEffect(() => { setBreadcrumbs([{ label: "部署治理" }]); }, [setBreadcrumbs]);
  return (<AppShell><Head><title>部署 · 数智企业</title></Head><div className="p-6"><h1 className="mb-6 text-2xl font-bold">部署治理</h1>
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border bg-white p-5"><div className="mb-3 inline-flex rounded-lg bg-blue-50 p-2"><Server className="h-5 w-5 text-blue-600" /></div><h3 className="font-semibold">应用服务</h3><p className="mt-1 text-sm text-gray-500">Next.js 单体应用</p><p className="mt-2 text-xs text-green-600">● 运行中 :3000</p></div>
      <div className="rounded-xl border bg-white p-5"><div className="mb-3 inline-flex rounded-lg bg-green-50 p-2"><Container className="h-5 w-5 text-green-600" /></div><h3 className="font-semibold">Docker</h3><p className="mt-1 text-sm text-gray-500">docker-compose 拓扑</p><p className="mt-2 text-xs">app · postgres · redis · worker</p></div>
      <div className="rounded-xl border bg-white p-5"><div className="mb-3 inline-flex rounded-lg bg-purple-50 p-2"><HardDrive className="h-5 w-5 text-purple-600" /></div><h3 className="font-semibold">存储</h3><p className="mt-1 text-sm text-gray-500">PostgreSQL + Redis</p><p className="mt-2 text-xs">Volume: lobster-data</p></div>
    </div>
    <div className="mt-6 rounded-xl border bg-white p-6"><h2 className="mb-4 font-semibold">健康检查</h2><div className="flex items-center gap-3 text-sm"><span className="inline-block h-3 w-3 rounded-full bg-green-500" /> 所有服务正常</div></div>
  </div></AppShell>);
}
