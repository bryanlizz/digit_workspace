import { useEffect } from "react";
import Head from "next/head";
import { AppShell } from "~/components/layout/AppShell";
import { useAppStore } from "~/stores/appStore";

export default function BillingPage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);

  useEffect(() => {
    setBreadcrumbs([{ label: "计费管理" }]);
  }, [setBreadcrumbs]);

  return (
    <>
      <Head><title>数智企业 · 计费已迁移</title></Head>
      <AppShell>
        <div className="p-6">
          <div className="rounded-xl border border-blue-100 bg-white p-8 shadow-sm">
            <p className="text-sm font-medium text-blue-600">功能迁移</p>
            <h1 className="mt-2 text-2xl font-bold text-gray-800">该功能已迁移</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500">
              套餐、席位、Agent 用量、账单和多租户计费策略现在归属平台总后台。web 端不再承担后台计费管理，只保留旧链接的迁移说明，避免历史入口失效。
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="font-semibold text-gray-800">迁移后入口</p>
                <p className="mt-2 text-sm text-gray-500">admin · 计费管理</p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="font-semibold text-gray-800">保留原因</p>
                <p className="mt-2 text-sm text-gray-500">兼容旧书签和历史链接，不继续展示完整后台功能</p>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </>
  );
}
