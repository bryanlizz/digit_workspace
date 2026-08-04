import { useEffect } from "react";
import Head from "next/head";
import { AppShell } from "~/components/layout/AppShell";
import { useAppStore } from "~/stores/appStore";

export default function AdminEmployeesPage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);

  useEffect(() => {
    setBreadcrumbs([{ label: "员工管理" }]);
  }, [setBreadcrumbs]);

  return (
    <>
      <Head><title>数智企业 · 员工管理已迁移</title></Head>
      <AppShell>
        <div className="p-6">
          <div className="rounded-xl border border-blue-100 bg-white p-8 shadow-sm">
            <p className="text-sm font-medium text-blue-600">功能迁移</p>
            <h1 className="mt-2 text-2xl font-bold text-gray-800">该功能已迁移</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500">
              企业员工、组织关系、离职交接和员工名下 Agent 处理现在归属企业后台。平台用户、平台运营人员和租户视图则归属平台总后台。
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="font-semibold text-gray-800">企业员工管理</p>
                <p className="mt-2 text-sm text-gray-500">enterprise · 员工管理 / Agent 管理</p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="font-semibold text-gray-800">平台用户管理</p>
                <p className="mt-2 text-sm text-gray-500">admin · 平台用户</p>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </>
  );
}
