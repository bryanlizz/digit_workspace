// ─────────────────────────────────────────────────────────
// 数智企业 · Agent 类型定义
// ─────────────────────────────────────────────────────────

import type { PermissionLevel } from "./permission";

/** Agent 类型 */
export type AgentType = "DIGITAL_TWIN" | "PURE_AGENT";

/** Agent 状态 */
export type AgentStatus =
  | "IDLE"
  | "WORKING"
  | "BLOCKED"
  | "AWAITING_APPROVAL"
  | "DONE";

/**
 * Agent DTO — API 返回格式
 */
export interface AgentDTO {
  id: string;
  tenantId: string;
  name: string;
  type: AgentType;
  ownerId: string;
  ownerName: string;
  presetRoleId: string | null;
  skillTags: string[];
  permissionBm: number;
  status: AgentStatus;
  avatar: string | null;
  isActive: boolean;
  /** 核心记忆 */
  coreMemory: AgentCoreMemoryDTO | null;
  /** 记忆片段数量 */
  memoryCount: number;
  /** 关联的任务数量 */
  taskCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建 Agent 的输入参数
 */
export interface CreateAgentInput {
  name: string;
  type: AgentType;
  ownerId: string;
  presetRoleId?: string;
  skillTags: string[];
  permissionBm?: number;
  avatar?: string;
  coreMemory?: {
    roleDefinition: RoleDefinition;
    experienceSummary?: string;
  };
}

/**
 * Agent 筛选参数
 */
export interface AgentFilter {
  status?: AgentStatus;
  ownerId?: string;
  type?: AgentType;
  isActive?: boolean;
  department?: string;
}

/**
 * 角色定义 — Agent 核心记忆的一部分
 */
export interface RoleDefinition {
  /** 职位名称 */
  title: string;
  /** 技能列表 */
  skills: string[];
  /** 性格设定 */
  personality: string;
  /** 边界规则 */
  boundaries: string;
}

/**
 * Agent 核心记忆 DTO
 */
export interface AgentCoreMemoryDTO {
  agentId: string;
  roleDefinition: RoleDefinition;
  experienceSummary: string | null;
  totalTasksCompleted: number;
  successRate: number;
  updatedAt: string;
}

/**
 * 记忆片段类型
 */
export type MemoryType = "success" | "failure" | "preference" | "insight";

/**
 * 记忆写入来源
 */
export type MemorySource = "auto" | "suggested" | "manual";

/**
 * 记忆检索过滤条件
 */
export interface MemoryFilterInput {
  projectId?: string | null;
  type?: MemoryType;
  source?: MemorySource;
  since?: string;
  until?: string;
  minImportance?: number;
  maxImportance?: number;
}

/**
 * Agent 长期记忆 DTO
 */
export interface AgentMemoryDTO {
  id: string;
  agentId: string;
  projectId: string | null;
  source: MemorySource;
  type: MemoryType;
  summary: string;
  importance: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * 创建记忆片段的输入参数
 */
export interface CreateMemoryInput {
  type: MemoryType;
  summary: string;
  importance?: number;
  metadata?: Record<string, unknown>;
  projectId?: string | null;
  source?: MemorySource;
}

/**
 * Agent 成长曲线数据点
 */
export interface GrowthCurvePoint {
  date: string;
  tasksCompleted: number;
  successRate: number;
  averageImportance: number;
}
