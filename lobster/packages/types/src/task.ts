// ─────────────────────────────────────────────────────────
// 数智企业 · 任务类型定义
// ─────────────────────────────────────────────────────────

/** 任务状态 */
export type TaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "AWAITING_APPROVAL"
  | "DONE"
  | "REJECTED";

/** 风险等级 */
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

/**
 * 任务 DTO — API 返回格式
 */
export interface TaskDTO {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  riskLevel: RiskLevel;
  permissionLevel: number;
  approved: boolean | null;
  approvalComment: string | null;
  result: string | null;
  /** 创建者信息 */
  creator: {
    id: string;
    name: string;
  };
  /** 执行 Agent 信息 */
  assignee: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
  /** 审批人信息 */
  approvedBy: {
    id: string;
    name: string;
  } | null;
  /** 所属项目 */
  project: {
    id: string;
    name: string;
  } | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建任务的输入参数
 */
export interface CreateTaskInput {
  title: string;
  description?: string;
  riskLevel?: RiskLevel;
  permissionLevel?: number;
  assigneeId?: string;
  projectId?: string;
  creatorId?: string;
}

/**
 * 任务筛选参数
 */
export interface TaskFilter {
  status?: TaskStatus;
  riskLevel?: RiskLevel;
  assigneeId?: string;
  projectId?: string;
  creatorId?: string;
  tenantId?: string;
}

/**
 * 审批队列项
 */
export interface ApprovalQueueItem {
  taskId: string;
  taskTitle: string;
  riskLevel: RiskLevel;
  permissionLevel: number;
  requestedBy: string;
  assigneeName: string;
  createdAt: string;
}

/**
 * 责任链节点 — 审计追踪用
 * 注意：与 audit.ts 中的定义保持一致
 */
export interface ResponsibilityChainNode {
  step: number;
  type: "human" | "digital_twin" | "pure_agent" | "tool";
  name: string;
  action: string;
  timestamp: string;
  detail: string | null;
}

/**
 * 任务时间线事件
 */
export interface TaskTimelineEvent {
  type: "created" | "assigned" | "started" | "blocked" | "awaiting_approval" | "approved" | "rejected" | "completed";
  message: string;
  actorName: string;
  timestamp: string;
}
