import { useState } from "react";
import Head from "next/head";
import { AdminShell } from "~/components/AdminShell";
import { PermissionDots } from "~/components/PermissionDots";
import { api } from "~/utils/api";
import toast from "~/utils/toast";

type Tab = "roles" | "employees" | "audit";

export default function PermissionsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("roles");
  const [editEmployeeId, setEditEmployeeId] = useState<string | null>(null);
  const [editBm, setEditBm] = useState(1);

  const { data: roleOverview } = api.permission.getRoleOverview.useQuery();
  const { data: employees } = api.permission.listEmployees.useQuery();
  const utils = api.useUtils();
  const updatePerm = api.permission.updatePermission.useMutation({
    onSuccess: async () => {
      toast("权限已更新");
      setEditEmployeeId(null);
      await utils.permission.listEmployees.invalidate();
      await utils.permission.getRoleOverview.invalidate();
    },
  });

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "roles", label: "角色管理" },
    { key: "employees", label: "员工权限" },
    { key: "audit", label: "权限审计" },
  ];

  return (
    <>
      <Head><title>总后台 · 权限管理</title></Head>
      <AdminShell>
        <div className="p-6">
          <h1 className="mb-2 text-2xl font-bold text-gray-800">🔐 权限管理</h1>
          <p className="mb-6 text-sm text-gray-500">管理员工角色和权限</p>

          <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
            {tabs.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === tab.key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}>{tab.label}</button>
            ))}
          </div>

          {activeTab === "roles" && (
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["角色", "人数", "权限等级", "成员"].map((h) => (
                      <th key={h} className="pb-3 font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roleOverview?.map((r) => (
                    <tr key={r.role} className="border-b border-gray-50">
                      <td className="py-3 font-medium text-gray-800">
                        {{ ADMIN: "租户管理员", MANAGER: "部门主管", STAFF: "普通员工" }[r.role] ?? r.role}
                      </td>
                      <td className="py-3">{r.count}</td>
                      <td className="py-3"><PermissionDots permissionBm={r.samplePermission} /></td>
                      <td className="py-3 text-xs text-gray-500">{r.names.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "employees" && (
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["员工", "部门", "角色", "权限", "操作"].map((h) => (
                      <th key={h} className="pb-3 font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees?.map((emp) => (
                    <tr key={emp.id} className="border-b border-gray-50">
                      <td className="py-3 font-medium text-gray-800">{emp.name}</td>
                      <td className="py-3 text-gray-600">{emp.department ?? "-"}</td>
                      <td className="py-3"><span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{emp.role}</span></td>
                      <td className="py-3">
                        {editEmployeeId === emp.id
                          ? <PermissionDots permissionBm={editBm} interactive onChange={setEditBm} />
                          : <PermissionDots permissionBm={emp.permissionBm} />}
                      </td>
                      <td className="py-3">
                        {editEmployeeId === emp.id ? (
                          <div className="flex gap-1.5">
                            <button onClick={() => updatePerm.mutate({ employeeId: emp.id, permissionBm: editBm })}
                              className="rounded bg-blue-600 px-2.5 py-1 text-xs text-white">保存</button>
                            <button onClick={() => setEditEmployeeId(null)}
                              className="rounded bg-gray-100 px-2.5 py-1 text-xs text-gray-600">取消</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditEmployeeId(emp.id); setEditBm(emp.permissionBm); }}
                            className="rounded bg-gray-100 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200">编辑</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "audit" && (
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="mb-4 text-sm text-gray-500">最近权限变更记录</p>
              <div className="space-y-2">
                {[
                  { action: "PERMISSION_UPDATED", detail: "权限从 L1-L3 升级到 L1-L4", target: "李主管", time: "2小时前" },
                  { action: "PERMISSION_UPDATED", detail: "权限从 L1 升级到 L1-L2", target: "张员工", time: "1天前" },
                  { action: "EMPLOYEE_OFFBOARDED", detail: "账号冻结，3 个 Agent 已停用", target: "赵员工", time: "3天前" },
                ].map((log, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 text-sm">
                    <span className="mt-0.5 text-xs font-medium text-gray-400">{log.time}</span>
                    <div>
                      <p className="font-medium text-gray-800">{log.action}</p>
                      <p className="text-xs text-gray-500">{log.detail}</p>
                      <p className="text-xs text-blue-600">{log.target}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </AdminShell>
    </>
  );
}
