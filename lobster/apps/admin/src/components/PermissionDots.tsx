import { useState } from "react";

const LEVELS = [
  { level: 1, label: "只读", description: "查询、浏览、导出预览" },
  { level: 2, label: "写入", description: "创建、修改、删除（本域）" },
  { level: 4, label: "执行", description: "调用工具、执行代码、发消息" },
  { level: 8, label: "外发", description: "数据导出、外部发送" },
  { level: 16, label: "删除", description: "物理删除、权限变更" },
];

export function PermissionDots({
  permissionBm,
  interactive = false,
  onChange,
}: {
  permissionBm: number;
  interactive?: boolean;
  onChange?: (newBm: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="flex gap-1.5">
      {LEVELS.map((l) => {
        const has = (permissionBm & l.level) === l.level;
        return (
          <div key={l.level} className="group relative"
            onMouseEnter={() => setHovered(l.level)}
            onMouseLeave={() => setHovered(null)}>
            <button type="button" disabled={!interactive}
              onClick={() => interactive && onChange?.(has ? permissionBm & ~l.level : permissionBm | l.level)}
              className={`h-4 w-4 rounded-full border-2 transition-all ${
                has ? "border-blue-500 bg-blue-500" : "border-gray-200 bg-gray-100"
              } ${interactive ? "cursor-pointer" : "cursor-default"}`} />
            {hovered === l.level && (
              <div className="pointer-events-none absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-800 px-2.5 py-1.5 text-white shadow-lg">
                <p className="text-[10px] font-medium">{has ? "✅" : "⬜"} {l.label}</p>
                <p className="text-[10px] text-gray-300">{l.description}</p>
                <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
