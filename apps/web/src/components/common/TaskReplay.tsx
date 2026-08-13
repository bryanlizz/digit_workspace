// ─────────────────────────────────────────────────────────
// 数智企业 · 任务回放可视化组件
// ─────────────────────────────────────────────────────────

import { Play, Pause, SkipForward } from "lucide-react";

interface ReplayStep {
  step: number;
  type: string;
  name: string;
  action: string;
  timestamp: string;
  detail: string | null;
}

interface TaskReplayProps {
  steps: ReplayStep[];
  currentStep: number;
  onStep: (step: number) => void;
  playing: boolean;
  onTogglePlay: () => void;
}

export function TaskReplay({ steps, currentStep, onStep, playing, onTogglePlay }: TaskReplayProps) {
  if (steps.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">暂无回放数据</p>;
  }

  return (
    <div className="space-y-4">
      {/* 控制栏 */}
      <div className="flex items-center gap-4">
        <button
          onClick={onTogglePlay}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? "暂停" : "播放"}
        </button>
        <div className="flex-1">
          <div className="h-2 rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-gray-500">
          {currentStep + 1} / {steps.length}
        </span>
      </div>

      {/* 时间线 */}
      <div className="relative space-y-0">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex cursor-pointer items-start gap-4 border-l-2 pb-4 pl-6 transition-colors ${
              i <= currentStep ? "border-blue-400" : "border-gray-200"
            } ${i === currentStep ? "bg-blue-50/50" : ""}`}
            onClick={() => onStep(i)}
          >
            <div
              className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ${
                i <= currentStep ? "bg-blue-500" : "bg-gray-300"
              } ${i === currentStep ? "ring-2 ring-blue-300" : ""}`}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                  step.type === "digital_twin" ? "bg-purple-100 text-purple-700" :
                  step.type === "human" ? "bg-green-100 text-green-700" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {step.type === "digital_twin" ? "Agent" : step.type === "human" ? "人类" : step.type}
                </span>
                <span className="text-sm font-medium text-gray-700">{step.action}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{step.name}</p>
              {step.detail && <p className="mt-1 text-xs text-gray-400 font-mono">{step.detail.slice(0, 120)}</p>}
              <p className="mt-1 text-xs text-gray-400">{new Date(step.timestamp).toLocaleTimeString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
