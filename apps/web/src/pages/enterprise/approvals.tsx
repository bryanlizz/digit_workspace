// 数智企业 · Enterprise — 审批流配置
import { useEffect } from "react"; import Head from "next/head"; import { AppShell } from "~/components/layout/AppShell"; import { useAppStore } from "~/stores/appStore"; import { Shield, AlertTriangle } from "lucide-react";
export default function ApprovalsPage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);
  useEffect(() => { setBreadcrumbs([{ label: "审批流配置" }]); }, [setBreadcrumbs]);
  return (<AppShell><Head><title>审批流 · 数智企业</title></Head><div className="p-6"><h1 className="mb-6 text-2xl font-bold">审批流配置</h1>
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border bg-white p-5"><div className="mb-3 inline-flex rounded-lg bg-blue-50 p-2"><Shield className="h-5 w-5 text-blue-600"/></div><h3 className="font-semibold">审批规则</h3><p className="mt-2 text-sm text-gray-500">L1-L2: 自动执行<br/>L3: 主管审批<br/>L4-L5: 管理员审批</p></div>
      <div className="rounded-xl border bg-white p-5"><div className="mb-3 inline-flex rounded-lg bg-yellow-50 p-2"><AlertTriangle className="h-5 w-5 text-yellow-600"/></div><h3 className="font-semibold">风险阈值</h3><p className="mt-2 text-sm text-gray-500">HIGH 风险任务必须审批<br/>涉及资金操作强制接管</p></div>
    </div>
  </div></AppShell>);
}
