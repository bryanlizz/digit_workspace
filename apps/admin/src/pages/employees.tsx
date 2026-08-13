import { useState } from "react";
import Head from "next/head";
import { Search } from "lucide-react";
import { AdminShell } from "~/components/AdminShell";
import { api } from "~/utils/api";
import toast from "~/utils/toast";

type Tab = "active" | "inactive";

export default function AdminEmployeesPage() {
  const [tab, setTab] = useState<Tab>("active");
  const [search, setSearch] = useState("");
  const [offboardEmpId, setOffboardEmpId] = useState<string | null>(null);
  const [offboardAction, setOffboardAction] = useState<"freeze" | "transfer">("freeze");
  const [transferTarget, setTransferTarget] = useState("");

  const { data: employees } = api.permission.listEmployees.useQuery();
  const { data: plan } = api.offboarding.getPlan.useQuery(
    { employeeId: offboardEmpId! },
    { enabled: !!offboardEmpId }
  );
  const { data: targets } = api.offboarding.getTargets.useQuery(
    { excludeId: offboardEmpId! },
    { enabled: !!offboardEmpId && offboardAction === "transfer" }
  );
  const utils = api.useUtils();
  const freeze = api.offboarding.freeze.useMutation({
    onSuccess: async () => {
      toast("已冻结");
      setOffboardEmpId(null);
      await utils.permission.listEmployees.invalidate();
    },
  });
  const transfer = api.offboarding.transfer.useMutation({
    onSuccess: async () => {
      toast("已转移");
      setOffboardEmpId(null);
      await utils.permission.listEmployees.invalidate();
    },
  });

  const filtered = employees?.filter((e) => {
    const matchTab = tab === "active" ? e.isActive : !e.isActive;
    const matchSearch = !search || e.name.includes(search) || e.department?.includes(search);
    return matchTab && matchSearch;
  });

  return (
    <>
      <Head><title>总后台 · 员工管理</title></Head>
      <AdminShell>
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">👥 员工管理</h1>
              <p className="mt-1 text-sm text-gray-500">管理员工账号和离职流程</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索员工..." className="w-64 rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm" />
            </div>
          </div>

          <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
            {(["active", "inactive"] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium ${tab === t ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}>
                {t === "active" ? "在职" : "已离职"}
              </button>
            ))}
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["姓名", "部门", "角色", "Agent 数", "状态", "操作"].map((h) => (
                    <th key={h} className="pb-3 font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered?.map((emp) => (
                  <tr key={emp.id} className="border-b border-gray-50">
                    <td className="py-3 font-medium text-gray-800">{emp.name}</td>
                    <td className="py-3 text-gray-600">{emp.department ?? "-"}</td>
                    <td className="py-3"><span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{emp.role}</span></td>
                    <td className="py-3">{emp.agents?.length ?? 0}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${emp.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {emp.isActive ? "在职" : "已离职"}
                      </span>
                    </td>
                    <td className="py-3">
                      {emp.isActive && (
                        <button onClick={() => setOffboardEmpId(emp.id)}
                          className="rounded bg-red-50 px-2.5 py-1 text-xs text-red-600 hover:bg-red-100">离职处理</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AdminShell>

      {offboardEmpId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-bold text-gray-800">离职处理</h3>
            <p className="mb-4 text-sm text-orange-600">
              ⚠️ 该员工名下共有 {plan?.agents.length ?? 0} 个 Agent 需要处理
            </p>
            <div className="space-y-3">
              {(["freeze", "transfer"] as const).map((a) => (
                <label key={a} className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer ${offboardAction === a ? "border-blue-300 bg-blue-50" : "border-gray-200"}`}>
                  <input type="radio" name="action" checked={offboardAction === a} onChange={() => setOffboardAction(a)} className="mt-1" />
                  <div>
                    <p className="font-medium text-gray-800">{a === "freeze" ? "冻结账号" : "转移 Agent"}</p>
                    <p className="text-xs text-gray-500">{a === "freeze" ? "暂停所有 Agent，员工可随时恢复" : "将 Agent 转给其他员工"}</p>
                  </div>
                </label>
              ))}
              {offboardAction === "transfer" && (
                <select value={transferTarget} onChange={(e) => setTransferTarget(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 p-2.5 text-sm">
                  <option value="">选择目标员工</option>
                  {targets?.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.department})</option>)}
                </select>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => {
                if (offboardAction === "freeze") freeze.mutate({ employeeId: offboardEmpId });
                else if (transferTarget) transfer.mutate({ employeeId: offboardEmpId, targetId: transferTarget });
              }} disabled={offboardAction === "transfer" && !transferTarget}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm text-white disabled:opacity-50">
                确认执行
              </button>
              <button onClick={() => setOffboardEmpId(null)}
                className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm text-gray-600">取消</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
