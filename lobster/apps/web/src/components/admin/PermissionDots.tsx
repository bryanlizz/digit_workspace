import { useState } from "react";

interface LevelInfo {
  level: number;
  label: string;
  description: string;
}

const LEVELS: LevelInfo[] = [
  { level: 1, label: "只读", description: "查询、浏览、导出预览" },
  { level: 2, label: "写入", description: "创建、修改、删除（本域）" },
  { level: 4, label: "执行", description: "调用工具、执行代码、发消息" },
  { level: 8, label: "外发", description: "数据导出、外部发送" },
  { level: 16, label: "删除", description: "物理删除、权限变更" },
];

/**
 * 权限位图可视化组件
 * 显示 5 个圆点表示 L1-L5 权限状态
 */
export const PermissionDots = ({
  permissionBm,
  size = "md",
  interactive = false,
  onChange,
}: {
  permissionBm: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (newBm: number) => void;
}) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const dotSizes = { sm: "h-2.5 w-2.5", md: "h-4 w-4", lg: "h-6 w-6" };
  const textSizes = { sm: "text-[8px]", md: "text-[10px]", lg: "text-xs" };

  return (
    <div className="flex gap-1.5">
      {LEVELS.map((l) => {
        const has = (permissionBm & l.level) === l.level;
        const isHovered = hovered === l.level;
        return (
          <div
            key={l.level}
            className="group relative"
            onMouseEnter={() => setHovered(l.level)}
            onMouseLeave={() => setHovered(null)}
          >
            <button
              type="button"
              disabled={!interactive}
              onClick={() => {
                if (interactive && onChange) {
                  onChange(has ? permissionBm & ~l.level : permissionBm | l.level);
                }
              }}
              className={`${dotSizes[size]} rounded-full border-2 transition-all ${
                has
                  ? "border-blue-500 bg-blue-500"
                  : "border-gray-200 bg-gray-100 hover:border-gray-300"
              } ${interactive ? "cursor-pointer" : "cursor-default"}`}
            />
            {/* Tooltip */}
            {(isHovered || hovered === null) && (
              <div className="pointer-events-none absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-800 px-2.5 py-1.5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                <p className={`${textSizes[size]} font-medium`}>
                  {has ? "✅" : "⬜"} {l.label}
                </p>
                <p className={`${textSizes[size]} text-gray-300`}>{l.description}</p>
                <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export { LEVELS };
