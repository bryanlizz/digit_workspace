// ─────────────────────────────────────────────────────────
// 数智企业 · Legacy 路由迁移提示 Banner
// ─────────────────────────────────────────────────────────

import { AlertTriangle } from "lucide-react";

interface LegacyBannerProps {
  title: string;
  newPath: string;
  newLabel: string;
}

export function LegacyBanner({ title, newPath, newLabel }: LegacyBannerProps) {
  return (
    <div className="mx-6 mt-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
      <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500" />
      <span className="text-amber-700">
        <strong>{title}</strong> 已迁移至{" "}
        <a href={newPath} className="font-medium text-blue-600 underline hover:text-blue-800">
          {newLabel}
        </a>
      </span>
    </div>
  );
}
