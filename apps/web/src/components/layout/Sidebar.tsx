import Link from "next/link";
import { useRouter } from "next/router";
import {
  Building2, MessageSquare, Users, Puzzle, TrendingUp, Shield, BookOpen,
  Settings, Server, Wrench, Plug, Download, Cpu, Globe,
  Briefcase, Monitor, AlertCircle, Cookie, CheckSquare,
} from "lucide-react";
import { useAppStore } from "~/stores/appStore";

function getMode(): string {
  if (typeof window !== "undefined") {
    const p = window.location.port;
    if (p === "3001") return "admin";
    if (p === "3002") return "enterprise";
    if (p === "3003") return "desktop";
    return "web";
  }
  // SSR: infer from path
  return "web";
}

function getModeFromPath(pathname: string): string {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/enterprise")) return "enterprise";
  if (pathname.startsWith("/desktop")) return "desktop";
  return "web";
}

const WEB_ITEMS = [
  { name: "总部", icon: Building2, path: "/" },
  { name: "协作", icon: MessageSquare, path: "/collaboration" },
  { name: "员工广场", icon: Users, path: "/employees" },
  { name: "技能广场", icon: Puzzle, path: "/skills" },
  { name: "进化", icon: TrendingUp, path: "/evolution" },
  { name: "安全", icon: Shield, path: "/security" },
  { name: "知识", icon: BookOpen, path: "/knowledge" },
];

const ADMIN_ITEMS = [
  { name: "AI 网关", icon: Settings, path: "/admin/gateway" },
  { name: "MCP Server", icon: Server, path: "/admin/mcp" },
  { name: "Tool Runtime", icon: Wrench, path: "/admin/tools" },
  { name: "Connector", icon: Plug, path: "/admin/connectors" },
  { name: "审计日志", icon: Shield, path: "/admin/audit" },
  { name: "部署治理", icon: Download, path: "/admin/deployment" },
  { name: "Worker", icon: Cpu, path: "/admin/workers" },
  { name: "系统设置", icon: Settings, path: "/admin/settings" },
];

const ENTERPRISE_ITEMS = [
  { name: "企业概览", icon: Briefcase, path: "/enterprise" },
  { name: "工具配置", icon: Wrench, path: "/enterprise/tools" },
  { name: "浏览器环境", icon: Globe, path: "/enterprise/browser" },
  { name: "审批流", icon: CheckSquare, path: "/enterprise/approvals" },
  { name: "Bad Case", icon: AlertCircle, path: "/enterprise/badcases" },
];

const DESKTOP_ITEMS = [
  { name: "我的工作台", icon: Monitor, path: "/desktop" },
  { name: "协作中心", icon: MessageSquare, path: "/collaboration" },
  { name: "知识库", icon: BookOpen, path: "/knowledge" },
];

const MODE_LABELS: Record<string, string> = {
  web: "主产品端",
  admin: "平台总后台",
  enterprise: "企业后台",
  desktop: "个人工作台",
};

const MODE_ITEMS: Record<string, typeof WEB_ITEMS> = {
  web: WEB_ITEMS,
  admin: ADMIN_ITEMS,
  enterprise: ENTERPRISE_ITEMS,
  desktop: DESKTOP_ITEMS,
};

export const Sidebar = () => {
  const router = useRouter();
  const mode = getMode() !== "web" ? getMode() : getModeFromPath(router.pathname);
  const items = MODE_ITEMS[mode] ?? WEB_ITEMS;

  return (
    <aside className="flex h-screen w-56 flex-col bg-[#0d2b4b] text-white shadow-xl">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <span className="text-2xl">🦞</span>
        <div>
          <h1 className="text-base font-bold tracking-wide">数智企业</h1>
          <p className="text-[10px] text-blue-200/50">{MODE_LABELS[mode]}</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = router.pathname === item.path || (item.path !== "/" && router.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
                isActive ? "bg-white/10 font-medium text-white" : "text-blue-200/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-3">
        <p className="text-[10px] text-blue-200/30">
          V2.0 · {MODE_LABELS[mode]}
        </p>
      </div>
    </aside>
  );
};
