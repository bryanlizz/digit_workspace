// ─────────────────────────────────────────────────────────
// 数智企业 · 审计日志类型定义
// ─────────────────────────────────────────────────────────

/**
 * 审计日志 DTO
 */
export interface AuditLogDTO {
  id: string;
  tenantId: string;
  agentId: string | null;
  employeeId: string | null;
  action: string;
  permissionLevel: number;
  detail: Record<string, unknown> | null;
  ipAddress: string | null;
  previousHash: string | null;
  currentHash: string;
  createdAt: string;
}

/**
 * 创建审计日志的输入
 */
export interface CreateAuditLogInput {
  tenantId: string;
  agentId?: string;
  employeeId?: string;
  action: string;
  permissionLevel?: number;
  detail?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * 审计日志筛选参数
 */
export interface AuditFilter {
  tenantId?: string;
  agentId?: string;
  employeeId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * 审计统计数据
 */
export interface AuditStats {
  totalLogs: number;
  byAction: Record<string, number>;
  byPermissionLevel: Record<string, number>;
  recentDays: Array<{
    date: string;
    count: number;
  }>;
}

/**
 * 责任链节点（引用 task.ts 定义避免重复）
 */
// re-export to avoid ambiguity
export type { ResponsibilityChainNode } from "./task";

/**
 * 任务回放导出数据
 */
export interface TaskReplayDTO {
  task: import("./task").TaskDTO | null;
  auditLogs: AuditLogDTO[];
  responsibilityChain: import("./task").ResponsibilityChainNode[];
  exportedAt: string;
  summary: {
    taskId: string;
    logCount: number;
    stepCount: number;
    actionCount: number;
  };
}
