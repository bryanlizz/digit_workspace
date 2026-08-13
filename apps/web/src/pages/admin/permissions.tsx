import { useEffect } from "react";
import Head from "next/head";
import { AppShell } from "~/components/layout/AppShell";
import { useAppStore } from "~/stores/appStore";

export default function PermissionsPage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);

  useEffect(() => {
    setBreadcrumbs([{ label: "权限管理" }]);
  }, [setBreadcrumbs]);

  return (
    <>
      <Head><title>数智企业 · 权限管理已迁移</title></Head>
      <AppShell>
        <div className="p-6">
          <div className="rounded-xl border border-blue-100 bg-white p-8 shadow-sm">
            <p className="text-sm font-medium text-blue-600">功能迁移</p>
            <h1 className="mt-2 text-2xl font-bold text-gray-800">该功能已迁移</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500">
              权限配置已按平台与企业边界拆分。平台总后台负责全局操作级别上限、平台角色和策略模板；企业后台负责企业角色、员工权限、Agent 授权和业务审批规则。
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="font-semibold text-gray-800">平台权限策略</p>
                <p className="mt-2 text-sm text-gray-500">admin · 平台权限策略</p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="font-semibold text-gray-800">企业权限配置</p>
                <p className="mt-2 text-sm text-gray-500">enterprise · 权限配置 / 审批流 / 工具授权</p>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </>
  );
}
