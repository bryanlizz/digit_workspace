// ─────────────────────────────────────────────────────────
// 数智企业 · 人类接管面板
// 任务 BLOCKED 时的人机交互界面
// ─────────────────────────────────────────────────────────

import { useState } from "react";
import { Play, SkipForward, XCircle, AlertTriangle, User } from "lucide-react";

interface TakeoverPanelProps {
  taskId: string;
  taskTitle: string;
  error?: string;
  onResume: (taskId: string) => void;
  onSkip: (taskId: string) => void;
  onAbort: (taskId: string) => void;
}

export function TakeoverPanel({ taskId, taskTitle, error, onResume, onSkip, onAbort }: TakeoverPanelProps) {
  const [reason, setReason] = useState("");

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-full bg-amber-100 p-2">
          <User className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-amber-800">需要人类接管</h2>
          <p className="text-sm text-amber-600">任务「{taskTitle}」已暂停，等待人工决策</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-gray-600">决策备注（可选）</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-lg border border-gray-200 p-2 text-sm"
          rows={2}
          placeholder="记录接管原因..."
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onResume(taskId)}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
        >
          <Play className="h-4 w-4" /> 继续执行
        </button>
        <button
          onClick={() => onSkip(taskId)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <SkipForward className="h-4 w-4" /> 跳过此步骤
        </button>
        <button
          onClick={() => onAbort(taskId)}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <XCircle className="h-4 w-4" /> 终止任务
        </button>
      </div>
    </div>
  );
}
