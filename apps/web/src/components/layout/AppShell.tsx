import { useRouter } from "next/router";
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { DetailPanel } from "~/components/office/DetailPanel";
import { useAppStore } from "~/stores/appStore";

interface AppShellProps {
  children: ReactNode;
  /** 是否显示右侧详情面板 */
  showDetail?: boolean;
}

export const AppShell = ({ children }: AppShellProps) => {
  const router = useRouter();
  const showDetailPanel = useAppStore((s) => s.showDetailPanel);
  const shouldRenderDetailPanel = router.pathname === "/" && showDetailPanel;

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#f2f4f6]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Detail panel */}
      {shouldRenderDetailPanel && <DetailPanel />}
    </div>
  );
};
