// ─────────────────────────────────────────────────────────
// 数智企业 · Tool 类型定义
// ─────────────────────────────────────────────────────────

/**
 * Tool 参数定义
 */
export interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required: boolean;
  default?: unknown;
  enum?: string[]; // 可选值列表
}

/**
 * Tool 定义
 */
export interface ToolDefinition {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 描述（AI 用来理解何时使用） */
  description: string;
  /** 所属系统 */
  systemType: string;
  /** 需要的权限等级 (L0-L6) */
  requiredLevel: number;
  /** 是否需要审批 */
  requiresApproval: boolean;
  /** 输入参数 */
  parameters: ToolParameter[];
  /** 输出格式描述 */
  outputSchema?: {
    type: "string" | "object" | "array";
    description?: string;
  };
  /** 示例用法 */
  examples?: string[];
}

/**
 * 产物（截图、文件等）
 */
export interface ToolArtifact {
  name?: string;
  url?: string;
  data?: string;
  content?: string;
  mimeType?: string;
  size?: number;
  type?: string;
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

/**
 * 截图信息
 */
export interface Screenshot {
  name?: string;
  url?: string;
  data?: string;
}

/**
 * Tool 调用结果
 */
export interface ToolCallResult {
  success: boolean;
  data?: unknown;
  output?: unknown;
  error?: string;
  executionTimeMs: number;
  startedAt?: Date;
  completedAt?: Date;
  /** 外部系统返回的记录 ID（如有） */
  externalRecordId?: string;
  /** 是否需要人类接管 */
  requiresHumanIntervention?: boolean;
  /** 接管原因 */
  interventionReason?: string;
  /** 产物列表（截图、文件等） */
  artifacts?: ToolArtifact[];
  /** 外部系统记录 */
  externalRecords?: ExternalRecord[];
  /** 截图列表 */
  screenshots?: Screenshot[];
}

/**
 * Tool 调用上下文
 */
export interface ToolCallContext {
  taskId: string;
  agentId: string;
  projectId?: string;
  tenantId: string;
  signal?: AbortSignal;
  /** 调用者信息 */
  caller: {
    id: string;
    name: string;
    type: "human" | "agent";
  };
  /** 审批信息（如果已审批） */
  approval?: {
    approverId: string;
    approverName: string;
    approvedAt: string;
  };
}

/**
 * Tool 执行器接口
 */
export interface IToolExecutor {
  /** 执行 Tool */
  execute(
    definition: ToolDefinition,
    params: Record<string, unknown>,
    context: ToolCallContext
  ): Promise<ToolCallResult>;

  /** 验证参数 */
  validate(params: unknown, definition: ToolDefinition): boolean;
}

/**
 * Tool 注册器接口
 */
export interface IToolRegistry {
  /** 注册 Tool */
  register(definition: ToolDefinition, executor: IToolExecutor): void;

  /** 获取所有 Tool */
  getAllTools(): ToolDefinition[];

  /** 获取某个系统的所有 Tool */
  getToolsBySystem(systemType: string): ToolDefinition[];

  /** 获取单个 Tool */
  getTool(id: string): ToolDefinition | undefined;

  /** 搜索 Tool（用于 AI 选择） */
  search(query: string, limit?: number): ToolDefinition[];

  /** 执行 Tool */
  execute(
    toolId: string,
    params: Record<string, unknown>,
    context: ToolCallContext
  ): Promise<ToolCallResult>;
}