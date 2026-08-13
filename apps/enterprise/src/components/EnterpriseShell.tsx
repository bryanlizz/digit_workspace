import Link from "next/link";
import { useRouter } from "next/router";
import type { ReactNode } from "react";

const NAV = [
  { href: "/", label: "概览" },
  { href: "/employees", label: "员工管理" },
  { href: "/permissions", label: "权限配置" },
  { href: "/agents", label: "Agent 管理" },
  { href: "/tools", label: "工具授权" },
  { href: "/credentials", label: "凭证管理" },
  { href: "/browser", label: "浏览器自动化" },
  { href: "/approvals", label: "审批流" },
  { href: "/bad-cases", label: "Bad Case" },
  { href: "/worker", label: "Agent Worker" },
  { href: "/knowledge", label: "知识库" },
];

export function EnterpriseShell({ children }: { children: ReactNode }) {
  const { pathname } = useRouter();
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">数智企业</p>
          <p className="mt-0.5 text-sm font-bold text-gray-800">企业后台</p>
        </div>
        <nav className="p-3 space-y-0.5">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname === n.href ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
              }`}>
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
