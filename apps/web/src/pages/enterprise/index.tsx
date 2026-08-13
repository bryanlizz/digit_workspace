// 数智企业 · Enterprise — 企业概览
import { useEffect } from "react"; import Head from "next/head"; import { AppShell } from "~/components/layout/AppShell"; import { useAppStore } from "~/stores/appStore"; import { api } from "~/utils/api"; import { LoadingSkeleton } from "~/components/common/LoadingSkeleton"; import { Building2, Users, Bot, CheckCircle } from "lucide-react";
export default function EnterprisePage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);
  useEffect(() => { setBreadcrumbs([{ label: "企业概览" }]); }, [setBreadcrumbs]);
  const { data: employees, isLoading: el } = api.employee.list.useQuery();
  const { data: agents, isLoading: al } = api.agent.list.useQuery();
  const { data: tasks, isLoading: tl } = api.task.list.useQuery();
  const loading = el || al || tl;
  return (<AppShell><Head><title>企业后台 · 数智企业</title></Head><div className="p-6"><h1 className="mb-6 text-2xl font-bold">企业概览</h1>
    {loading ? <LoadingSkeleton rows={4} /> : <div className="grid gap-4 md:grid-cols-4">
      <Stat icon={Building2} label="企业" value="默认租户" color="blue" />
      <Stat icon={Users} label="员工" value={String(employees?.length ?? 0)} color="green" />
      <Stat icon={Bot} label="Agent" value={String(agents?.length ?? 0)} color="purple" />
      <Stat icon={CheckCircle} label="任务" value={String(tasks?.length ?? 0)} color="green" />
    </div>}
  </div></AppShell>);
}
function Stat({ icon: Icon, label, value, color }: any) {
  const c: Record<string,string>={blue:"bg-blue-50 text-blue-600",green:"bg-green-50 text-green-600",purple:"bg-purple-50 text-purple-600"};
  return <div className="rounded-xl border bg-white p-4"><div className={`mb-2 inline-flex rounded-lg p-2 ${c[color]}`}><Icon className="h-5 w-5"/></div><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>;
}
