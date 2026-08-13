// ─────────────────────────────────────────────────────────
// 数智企业 · 移动端底部导航栏
// 桌面端隐藏，移动端显示
// ─────────────────────────────────────────────────────────

import { useRouter } from "next/router";
import { Home, Users, Bot, BookOpen, Shield } from "lucide-react";

const tabs = [
  { path: "/", label: "办公室", icon: Home },
  { path: "/employees", label: "员工", icon: Users },
  { path: "/skills", label: "Agent", icon: Bot },
  { path: "/knowledge", label: "知识", icon: BookOpen },
  { path: "/security", label: "审计", icon: Shield },
];

export function MobileTabBar() {
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white md:hidden">
      <div className="flex h-14 items-center justify-around">
        {tabs.map((tab) => {
          const active = router.pathname === tab.path || (tab.path !== "/" && router.pathname.startsWith(tab.path));
          return (
            <button
              key={tab.path}
              onClick={() => router.push(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs ${
                active ? "text-blue-600" : "text-gray-500"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
