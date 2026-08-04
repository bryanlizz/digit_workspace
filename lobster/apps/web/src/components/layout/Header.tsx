import { ChevronRight, Search, LogOut } from "lucide-react";
import { useRouter } from "next/router";
import { useAuth } from "~/stores/authStore";
import { useAppStore } from "~/stores/appStore";
import toast from "~/utils/toast";

export const Header = () => {
  const breadcrumbs = useAppStore((s) => s.breadcrumbs);
  const { user, logout } = useAuth();
  const router = useRouter();

  const initials = user?.name?.[0] ?? "王";
  const roleLabels: Record<string, string> = {
    ADMIN: "管理员",
    MANAGER: "主管",
    STAFF: "员工",
    OBSERVER: "观察员",
  };

  const handleLogout = () => {
    logout();
    toast("已退出登录");
    router.push("/login");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
      <div className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <span key={index} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-300" />}
            {crumb.path ? (
              <a href={crumb.path} className="text-gray-500 hover:text-gray-700">{crumb.label}</a>
            ) : (
              <span className="font-medium text-gray-800">{crumb.label}</span>
            )}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600">
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">搜索...</span>
          <kbd className="hidden rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-400 lg:inline">⌘K</kbd>
        </button>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs">
            <p className="font-medium text-gray-700">{user?.name ?? "王老板"}</p>
            <p className="text-gray-400">{roleLabels[user?.role ?? ""] ?? "管理员"}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm">
            {initials}
          </div>
          <button onClick={handleLogout}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="退出登录">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
