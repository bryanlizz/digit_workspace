// ─────────────────────────────────────────────────────────
// 数智企业 · 员工类型定义
// ─────────────────────────────────────────────────────────

/**
 * 员工 DTO — API 返回格式
 */
export interface EmployeeDTO {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  role: "ADMIN" | "MANAGER" | "STAFF" | "OBSERVER";
  department: string | null;
  title: string | null;
  permissionBm: number;
  avatar: string | null;
  isActive: boolean;
  /** 关联的 Agent 数量 */
  agentCount?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建员工的输入参数
 */
export interface CreateEmployeeInput {
  name: string;
  email?: string;
  role: "ADMIN" | "MANAGER" | "STAFF" | "OBSERVER";
  department?: string;
  title?: string;
  permissionBm?: number;
  avatar?: string;
}

/**
 * 员工筛选参数
 */
export interface EmployeeFilter {
  department?: string;
  role?: "ADMIN" | "MANAGER" | "STAFF" | "OBSERVER";
  isActive?: boolean;
  tenantId?: string;
}

/**
 * 预设员工 — 产品内建的 15 个标准角色
 */
export interface PresetEmployee {
  /** 唯一标识，如 "strategist" */
  id: string;
  /** 中文名称 */
  name: string;
  /** 职能域 */
  department: string;
  /** 职位头衔 */
  title: string;
  /** 默认技能列表 */
  skills: string[];
  /** 初始风险等级 */
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  /** 默认权限位图 */
  defaultPermission: number;
  /** 一句话介绍 */
  description: string;
  /** 头像路径 */
  avatar: string;
  /** 工位颜色（十六进制） */
  color: string;
  /** 所属办公区域 */
  officeZone: string;
}

/**
 * 预设员工 DTO — API 返回格式
 */
export interface PresetEmployeeDTO extends PresetEmployee {
  /** 是否有对应的活跃 Agent 实例 */
  hasActiveAgent: boolean;
}

/**
 * 部门统计
 */
export interface DepartmentStats {
  department: string;
  count: number;
}
