// ─────────────────────────────────────────────────────────
// 执行引擎类型定义
// ─────────────────────────────────────────────────────────

import type { ToolDefinition, ToolCallResult } from "~/server/tools/types";

// ─────────────────────────────────────────────────────────
// 任务上下文
// ─────────────────────────────────────────────────────────

/**
 * 任务执行上下文
 * 贯穿整个任务执行流程
 */
export interface TaskContext {
  taskId: string;
  agentId: string;
  projectId: string;
  tenantId: string;
  /** 最近的自然人上司（用于审批和接管） */
  supervisorId: string;
  config: AgentConfig;
  memory?: MemoryContext;
  /** 当前执行状态 */
  executionState?: ExecutionState;
  signal?: AbortSignal;
}

/**
 * Agent 配置
 */
export interface AgentConfig {
  /** 最大执行步骤数 */
  maxSteps: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 超时时间（毫秒） */
  timeout: number;
  /** 允许的工具列表（白名单） */
  allowedTools?: string[];
  /** 禁止的工具列表（黑名单） */
  deniedTools?: string[];
  /** 最大操作级别（L0-L6） */
  maxLevel: number;
}

/**
 * 记忆上下文
 */
export interface MemoryContext {
  /** 相关记忆列表 */
  memories: MemoryItem[];
  /** 项目信息 */
  projectContext?: Record<string, unknown>;
}

/**
 * 记忆条目
 */
export interface MemoryItem {
  id: string;
  type: "preference" | "experience" | "failure" | "context";
  content: string;
  importance: number;
  createdAt: Date;
}

/**
 * 执行状态
 */
export interface ExecutionState {
  currentStep: number;
  completedSubTasks: string[];
  pendingSubTasks: string[];
  failedSubTasks: string[];
  results: Map<string, ToolCallResult>;
  errors: ExecutionError[];
}

// ─────────────────────────────────────────────────────────
// 子任务
// ─────────────────────────────────────────────────────────

/**
 * 子任务
 * 任务拆解后的最小执行单元
 */
export interface SubTask {
  id: string;
  description: string;
  /** 预选工具 ID（可选） */
  toolId?: string;
  /** 依赖的子任务 ID */
  dependsOn: string[];
  /** 预估需要的操作级别 */
  estimatedLevel: number;
  /** 是否需要审批 */
  requiresApproval: boolean;
  /** 额外元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 子任务结果
 */
export interface SubTaskResult {
  subTaskId: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped" | "waiting_approval";
  toolId?: string;
  result?: ToolCallResult;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
}

// ─────────────────────────────────────────────────────────
// 执行相关
// ─────────────────────────────────────────────────────────

/**
 * 工具选择结果
 */
export interface ToolSelection {
  tool: ToolDefinition;
  confidence: number;
  reasoning: string;
  parameterSuggestions?: Record<string, unknown>;
}

/**
 * 执行错误
 */
export interface ExecutionError {
  subTaskId: string;
  error: string;
  retryable: boolean;
  attempts: number;
  timestamp: Date;
}

export type TaskRuntimeStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "AWAITING_APPROVAL"
  | "DONE"
  | "REJECTED";

/**
 * 任务执行结果
 */
export interface TaskExecutionResult {
  taskId: string;
  status: TaskRuntimeStatus;
  summary: string;
  subTasks: SubTaskResult[];
  artifacts: Artifact[];
  externalRecords: ExternalRecord[];
  errors: ExecutionError[];
  nextActions: string[];
  executionTimeMs: number;
}

/**
 * 执行产物（文件、截图等）
 */
export interface Artifact {
  id: string;
  type: "screenshot" | "file" | "data";
  name: string;
  url?: string;
  content?: string;
  mimeType?: string;
  size?: number;
  createdAt: Date;
}

/**
 * 外部系统记录
 */
export interface ExternalRecord {
  system: string;
  id: string;
  type: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────
// 审批相关
// ─────────────────────────────────────────────────────────

/**
 * 审批决策
 */
export interface ApprovalDecision {
  required: boolean;
  reason?: string;
  approver?: Approver;
  urgency?: "low" | "normal" | "high";
}

/**
 * 审批规则
 */
export interface ApprovalRule {
  id: string;
  name: string;
  description?: string;
  /** 规则条件 */
  condition: (subTask: SubTask, context: TaskContext) => Promise<boolean>;
  /** 指定审批人（可选，默认使用上下文中的 supervisor） */
  approver?: Approver;
  /** 超时时间（秒），超时后升级 */
  timeout?: number;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 审批人
 */
export interface Approver {
  type: "user" | "agent" | "role";
  id?: string;
  role?: string;
  /** 超时升级 */
  escalation?: Approver;
}

/**
 * 审批请求
 */
export interface ApprovalRequest {
  taskId: string;
  subTask: SubTask;
  approver: Approver;
  urgency: "low" | "normal" | "high";
  timeout?: number;
  context: TaskContext;
}

/**
 * 审批
 */
export interface Approval {
  id: string;
  taskId: string;
  subTaskId: string | null;
  requesterId: string;
  approverId: string;
  status: ApprovalStatus;
  details: ApprovalDetails;
  createdAt: Date;
  expiresAt: Date;
  decidedAt?: Date;
  decision?: "approved" | "rejected";
  reason?: string;
}

/**
 * 审批状态
 */
export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "cancelled";

/**
 * 审批详情
 */
export interface ApprovalDetails {
  action: string;
  tool: string;
  parameters: Record<string, unknown>;
  risk: string;
  preview?: unknown;
  context?: {
    agentName: string;
    projectName: string;
    [key: string]: unknown;
  };
}

// ─────────────────────────────────────────────────────────
// 人类接管相关
// ─────────────────────────────────────────────────────────

/**
 * 人类介入类型
 */
export type InterventionType =
  | "captcha" // 验证码
  | "verify_code" // 二次认证
  | "login_expired" // 登录失效
  | "risk_alert" // 风控弹窗
  | "face_verify" // 人脸验证
  | "sms_verify" // 短信验证
  | "qr_code" // 扫码登录
  | "page_change" // 页面改版
  | "manual_required"; // 需手动处理

/**
 * 接管决策
 */
export interface InterventionDecision {
  shouldIntercept: boolean;
  type?: InterventionType;
  message?: string;
  retryable?: boolean;
  maxRetries?: number;
}

/**
 * 接管详情
 */
export interface InterventionDetails {
  type: InterventionType;
  title: string;
  description: string;
  screenshot?: string;
  attempts: number;
  lastError?: string;
  context?: Record<string, unknown>;
}

/**
 * 接管任务元数据
 */
export interface InterventionMetadata {
  interventionType: InterventionType;
  originalTaskId: string;
  originalAgentId: string;
  screenshot?: string;
  attempts: number;
  lastError?: string;
}

export interface InterventionResolution {
  action: "resume" | "skip" | "abort";
  reason?: string;
  resumeFrom?: string;
  skipSubTaskId?: string;
}

// ─────────────────────────────────────────────────────────
// 执行回调
// ─────────────────────────────────────────────────────────

/**
 * 执行回调函数
 */
export interface ExecutionCallbacks {
  onSubTaskStart?: (subTask: SubTask) => void | Promise<void>;
  onSubTaskComplete?: (subTask: SubTask, result: ToolCallResult) => void | Promise<void>;
  onSubTaskError?: (subTask: SubTask, error: Error) => void | Promise<void>;
  onApprovalRequired?: (
    subTask: SubTask,
    approval: Approval
  ) => void | Promise<void>;
  onInterventionRequired?: (details: InterventionDetails) => void | Promise<void>;
  onProgress?: (progress: ExecutionProgress) => void | Promise<void>;
}

/**
 * 执行进度
 */
export interface ExecutionProgress {
  total: number;
  completed: number;
  failed: number;
  blocked?: number;
  attempts?: number;
  current?: string;
  message?: string;
}

// ─────────────────────────────────────────────────────────
// 工具调用相关
// ─────────────────────────────────────────────────────────

/**
 * 工具调用请求
 */
export interface ToolCallRequest {
  toolId: string;
  parameters: Record<string, unknown>;
  context: TaskContext;
}

/**
 * 工具调用响应
 */
export interface ToolCallResponse {
  success: boolean;
  result?: ToolCallResult;
  error?: string;
  requiresIntervention?: boolean;
  interventionDetails?: InterventionDetails;
}

// ─────────────────────────────────────────────────────────
// 错误类型
// ─────────────────────────────────────────────────────────

/**
 * 审批被拒绝错误
 */
export class ApprovalRejectedError extends Error {
  constructor(
    public readonly subTask: SubTask,
    public readonly reason?: string
  ) {
    super(`审批被拒绝: ${subTask.description}${reason ? ` - ${reason}` : ""}`);
    this.name = "ApprovalRejectedError";
  }
}

/**
 * 任务超时错误
 */
export class TaskTimeoutError extends Error {
  constructor(
    public readonly taskId: string,
    public readonly timeout: number
  ) {
    super(`任务执行超时: ${taskId} (${timeout}ms)`);
    this.name = "TaskTimeoutError";
  }
}

/**
 * 人类接管超时错误
 */
export class InterventionTimeoutError extends Error {
  constructor(
    public readonly interventionTaskId: string,
    public readonly timeout: number
  ) {
    super(`等待人工接管超时: ${interventionTaskId}`);
    this.name = "InterventionTimeoutError";
  }
}

/**
 * 任务中止错误
 */
export class TaskAbortedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskAbortedError";
  }
}

/**
 * 最大步骤超限错误
 */
export class MaxStepsExceededError extends Error {
  constructor(
    public readonly taskId: string,
    public readonly maxSteps: number
  ) {
    super(`任务执行超出最大步骤限制: ${taskId} (${maxSteps})`);
    this.name = "MaxStepsExceededError";
  }
}

/**
 * 工具不可用错误
 */
export class ToolNotAvailableError extends Error {
  constructor(
    public readonly toolId: string,
    public readonly reason?: string
  ) {
    super(`工具不可用: ${toolId}${reason ? ` - ${reason}` : ""}`);
    this.name = "ToolNotAvailableError";
  }
}
