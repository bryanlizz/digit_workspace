import { useEffect } from "react";
import Head from "next/head";
import { AppShell } from "~/components/layout/AppShell";
import { useAppStore } from "~/stores/appStore";

export default function SettingsPage() {
  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);

  useEffect(() => {
    setBreadcrumbs([{ label: "设置" }]);
  }, [setBreadcrumbs]);

  return (
    <>
      <Head><title>数智企业 · 设置已迁移</title></Head>
      <AppShell>
        <div className="p-6">
          <div className="rounded-xl border border-blue-100 bg-white p-8 shadow-sm">
            <p className="text-sm font-medium text-blue-600">功能迁移</p>
            <h1 className="mt-2 text-2xl font-bold text-gray-800">该功能已迁移</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500">
              AI Key、模型路由、调用配额、中转策略和部署状态现在归属平台总后台，由平台运营者统一治理。web 端保留为主产品端和日常工作台，只消费任务、审批、接管和结果查看能力。
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="font-semibold text-gray-800">迁移后入口</p>
                <p className="mt-2 text-sm text-gray-500">admin · AI 网关 / 部署治理</p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="font-semibold text-gray-800">web 端职责</p>
                <p className="mt-2 text-sm text-gray-500">任务创建、审批处理、人类接管、Bad Case 确认和任务结果消费</p>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </>
  );
}
