import { NavLink, Outlet } from "react-router-dom";
import {
  CheckSquare,
  Users,
  BookOpen,
  Settings,
} from "lucide-react";

const navItems = [
  { to: "/tasks", label: "任务", icon: CheckSquare },
  { to: "/collaboration", label: "协作", icon: Users },
  { to: "/knowledge", label: "知识库", icon: BookOpen },
  { to: "/settings", label: "设置", icon: Settings },
];

export function DesktopShell() {
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-14 items-center px-4">
          <span className="text-lg font-bold text-rose-600">数智企业</span>
          <span className="ml-2 rounded bg-rose-50 px-1.5 py-0.5 text-xs text-rose-500">
            Desktop
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-rose-50 text-rose-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-3">
          <p className="text-xs text-gray-400">v0.1.0 · Tauri 2</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
