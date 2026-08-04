// 数智企业 · Admin — Agent Worker 管理
import { useEffect } from "react"; import Head from "next/head"; import { AppShell } from "~/components/layout/AppShell"; import { useAppStore } from "~/stores/appStore"; import { LoadingSkeleton } from "~/components/common/LoadingSkeleton"; import { Cpu } from "lucide-react";
export default function WorkersPage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);
  useEffect(() => { setBreadcrumbs([{ label: "Agent Worker" }]); }, [setBreadcrumbs]);
  return (<AppShell><Head><title>Worker · 数智企业</title></Head><div className="p-6"><h1 className="mb-6 text-2xl font-bold">Agent Worker 管理</h1>
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border bg-white p-5"><div className="mb-3 inline-flex rounded-lg bg-blue-50 p-2"><Cpu className="h-5 w-5 text-blue-600" /></div><h3 className="font-semibold">Worker 实例</h3><p className="mt-1 text-2xl font-bold">1</p><p className="text-xs text-green-600">● 在线</p></div>
      <div className="rounded-xl border bg-white p-5"><h3 className="font-semibold">队列深度</h3><p className="mt-1 text-2xl font-bold">0</p><p className="text-xs text-gray-500">待处理任务</p></div>
      <div className="rounded-xl border bg-white p-5"><h3 className="font-semibold">任务速率</h3><p className="mt-1 text-2xl font-bold">—</p><p className="text-xs text-gray-500">任务/分钟</p></div>
    </div>
    <div className="mt-6 rounded-xl border bg-white p-6"><h2 className="mb-3 font-semibold">Worker 详情</h2><div className="space-y-2 text-sm"><div className="flex justify-between border-b py-2"><span className="text-gray-500">运行时</span><span>Node.js + BullMQ</span></div><div className="flex justify-between border-b py-2"><span className="text-gray-500">浏览器驱动</span><span>Playwright (Chromium)</span></div><div className="flex justify-between py-2"><span className="text-gray-500">部署模式</span><span>Docker 容器</span></div></div></div>
  </div></AppShell>);
}
