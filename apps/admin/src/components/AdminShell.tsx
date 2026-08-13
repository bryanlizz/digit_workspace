import Link from "next/link";
import { useRouter } from "next/router";
import type { ReactNode } from "react";

const NAV = [
  { href: "/", label: "平台概览" },
  { href: "/billing", label: "计费管理" },
  { href: "/employees", label: "平台用户" },
  { href: "/permissions", label: "平台权限策略" },
  { href: "/gateway", label: "AI 网关" },
  { href: "/tool-runtime", label: "MCP / Tool Runtime" },
  { href: "/connectors", label: "Connector Registry" },
  { href: "/audit", label: "平台审计" },
  { href: "/deployments", label: "部署治理" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { pathname } = useRouter();
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">数智企业</p>
          <p className="mt-0.5 text-sm font-bold text-gray-800">总后台</p>
        </div>
        <nav className="p-3 space-y-0.5">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname === n.href ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
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
