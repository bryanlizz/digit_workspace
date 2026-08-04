import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import type { GetServerSideProps } from "next";
import { Play, LayoutGrid, Box } from "lucide-react";
import { AppShell } from "~/components/layout/AppShell";
import { OfficeScene } from "~/components/office/OfficeScene";
import { EmployeeListView } from "~/components/office/EmployeeListView";
import { useAppStore } from "~/stores/appStore";
import { useAuth } from "~/stores/authStore";
import { api } from "~/utils/api";

const modeDefaults: Record<string, string> = {
  admin: "/admin/gateway",
  enterprise: "/enterprise",
  desktop: "/desktop",
  web: "/",
};

export const getServerSideProps: GetServerSideProps = async () => {
  const mode = process.env.NEXT_PUBLIC_APP_MODE ?? "web";
  if (mode !== "web") {
    return { redirect: { destination: modeDefaults[mode] ?? "/", permanent: false } };
  }
  return { props: {} };
};

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [viewMode, setViewMode] = useState<"3d" | "list">("3d");

  const setBreadcrumbs = useAppStore((s) => s.setBreadcrumbs);
  const tourMode = useAppStore((s) => s.tourMode);
  const setTourMode = useAppStore((s) => s.setTourMode);
  const setPendingApprovalCount = useAppStore((s) => s.setPendingApprovalCount);
  const setHighRiskCount = useAppStore((s) => s.setHighRiskCount);
  const openDetailPanel = useAppStore((s) => s.openDetailPanel);
  const detailPanel = useAppStore((s) => s.detailPanel);

  const { data: agents } = api.agent.list.useQuery();
  const { data: approvalQueue } = api.task.getApprovalQueue.useQuery();

  // 未登录跳转
  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    setBreadcrumbs([{ label: "总部" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (approvalQueue) {
      setPendingApprovalCount(approvalQueue.length);
    }
    if (agents) {
      setHighRiskCount(agents.filter((a) => a.permissionBm >= 8).length);
    }
  }, [approvalQueue, agents, setPendingApprovalCount, setHighRiskCount]);

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>;
  if (!user) return null;

  return (
    <>
      <Head>
        <title>数智企业 · 总部</title>
      </Head>
      <AppShell>
        <div className="relative h-[calc(100vh-4rem)]">
          {/* View toggle */}
          <div className="absolute left-4 top-4 z-30 flex rounded-lg bg-white/90 shadow-sm backdrop-blur-sm">
            <button
              onClick={() => setViewMode("3d")}
              className={`flex items-center gap-1.5 rounded-l-lg px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "3d" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Box className="h-4 w-4" /> 3D
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 rounded-r-lg px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "list" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <LayoutGrid className="h-4 w-4" /> 列表
            </button>
          </div>

          {viewMode === "3d" ? (
            <>
              <OfficeScene />
              {!tourMode && (
                <button
                  onClick={() => setTourMode(true)}
                  className="absolute bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-[#0d2b4b] px-5 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-[#1a3856] hover:scale-105"
                >
                  <Play className="h-4 w-4 fill-white" /> 产品路演
                </button>
              )}
            </>
          ) : (
            <EmployeeListView />
          )}
        </div>
      </AppShell>
    </>
  );
}
