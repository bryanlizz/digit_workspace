// ─────────────────────────────────────────────────────────
// 数智企业 · 空状态 & 错误状态组件
// ─────────────────────────────────────────────────────────

import { AlertCircle, Inbox, RefreshCw } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: "inbox" | "alert";
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  title = "暂无数据",
  description = "这里还没有内容",
  icon = "inbox",
  action,
}: EmptyStateProps) {
  const Icon = icon === "alert" ? AlertCircle : Inbox;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="mb-4 h-12 w-12 text-gray-300" />
      <h3 className="mb-1 text-lg font-medium text-gray-600">{title}</h3>
      <p className="mb-4 text-sm text-gray-400">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = "加载失败", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="mb-4 h-12 w-12 text-red-300" />
      <h3 className="mb-1 text-lg font-medium text-red-600">出错了</h3>
      <p className="mb-4 text-sm text-gray-500">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" /> 重试
        </button>
      )}
    </div>
  );
}
