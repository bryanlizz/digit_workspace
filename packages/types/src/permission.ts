// ─────────────────────────────────────────────────────────
// 数智企业 · 权限系统类型定义
// ─────────────────────────────────────────────────────────

/**
 * 权限等级枚举
 * 使用位图（Bitmask）设计，支持组合权限
 * L1_READ   = 1 (bit 0) — 只读：查询、浏览、导出预览
 * L2_WRITE  = 2 (bit 1) — 写入：创建、修改、删除（本域）
 * L3_EXECUTE= 4 (bit 2) — 执行：调用工具、执行代码、发消息
 * L4_EXPORT = 8 (bit 3) — 外发：数据导出、外部发送、跨系统
 * L5_DELETE = 16 (bit 4) — 删除：物理删除、权限变更
 */
export enum PermissionLevel {
  L1_READ = 1,
  L2_WRITE = 2,
  L3_EXECUTE = 4,
  L4_EXPORT = 8,
  L5_DELETE = 16,
}

/** 权限等级的中文描述 */
export const PERMISSION_LABELS: Record<PermissionLevel, string> = {
  [PermissionLevel.L1_READ]: "只读",
  [PermissionLevel.L2_WRITE]: "写入",
  [PermissionLevel.L3_EXECUTE]: "执行",
  [PermissionLevel.L4_EXPORT]: "外发",
  [PermissionLevel.L5_DELETE]: "删除",
};

/** 权限等级对应的操作说明 */
export const PERMISSION_DESCRIPTIONS: Record<PermissionLevel, string> = {
  [PermissionLevel.L1_READ]: "查询、浏览、导出预览",
  [PermissionLevel.L2_WRITE]: "创建、修改、删除（本域）",
  [PermissionLevel.L3_EXECUTE]: "调用工具、执行代码、发消息",
  [PermissionLevel.L4_EXPORT]: "数据导出、外部发送、跨系统",
  [PermissionLevel.L5_DELETE]: "物理删除、权限变更",
};

/**
 * 检查是否拥有指定权限
 * @param permissionBm - 权限位图值
 * @param level - 要检查的权限等级
 */
export function hasPermission(permissionBm: number, level: PermissionLevel): boolean {
  return (permissionBm & level) === level;
}

/**
 * 授予指定权限
 * @param permissionBm - 当前权限位图值
 * @param level - 要授予的权限等级
 * @returns 新的权限位图值
 */
export function grantPermission(permissionBm: number, level: PermissionLevel): number {
  return permissionBm | level;
}

/**
 * 撤销指定权限
 * @param permissionBm - 当前权限位图值
 * @param level - 要撤销的权限等级
 * @returns 新的权限位图值
 */
export function revokePermission(permissionBm: number, level: PermissionLevel): number {
  return permissionBm & ~level;
}

/**
 * 获取拥有的权限等级列表
 * @param permissionBm - 权限位图值
 */
export function getPermissionLevels(permissionBm: number): PermissionLevel[] {
  const levels = Object.values(PermissionLevel).filter(
    (v): v is PermissionLevel => typeof v === "number"
  );
  return levels.filter((level) => hasPermission(permissionBm, level));
}

/**
 * 判断是否拥有高危权限（L4 外发 / L5 删除）
 */
export function hasHighRiskPermission(permissionBm: number): boolean {
  return (
    hasPermission(permissionBm, PermissionLevel.L4_EXPORT) ||
    hasPermission(permissionBm, PermissionLevel.L5_DELETE)
  );
}
