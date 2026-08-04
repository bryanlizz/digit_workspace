// ─────────────────────────────────────────────────────────
// 数智企业 · Repository 接口定义
// ─────────────────────────────────────────────────────────

import type {
  EmployeeDTO,
  CreateEmployeeInput,
  EmployeeFilter,
  PresetEmployeeDTO,
  AgentDTO,
  CreateAgentInput,
  AgentFilter,
  AgentCoreMemoryDTO,
  AgentMemoryDTO,
  CreateMemoryInput,
  GrowthCurvePoint,
  MemoryFilterInput,
  TaskDTO,
  CreateTaskInput,
  TaskFilter,
  ApprovalQueueItem,
  ResponsibilityChainNode,
  TaskTimelineEvent,
  ProjectDTO,
  ProjectDetailDTO,
  CreateProjectInput,
  ProjectFilter,
  AuditLogDTO,
  CreateAuditLogInput,
  AuditFilter,
  AuditStats,
  TaskReplayDTO,
  KnowledgeDocDTO,
  CreateKnowledgeDocInput,
  KnowledgeFilter,
  KnowledgeSearchInput,
  KnowledgeSearchResult,
  KnowledgeStats,
} from "./index";

/**
 * 通用 CRUD 接口
 */
export interface IRepository<T, TCreate, TFilter> {
  findById(id: string): Promise<T | null>;
  findMany(filter?: TFilter): Promise<T[]>;
  create(data: TCreate): Promise<T>;
  update(id: string, data: Partial<TCreate>): Promise<T>;
  delete(id: string): Promise<void>;
  count(filter?: TFilter): Promise<number>;
}

/**
 * 员工仓库接口
 */
export interface IEmployeeRepository extends IRepository<EmployeeDTO, CreateEmployeeInput, EmployeeFilter> {
  findByEmail(email: string): Promise<EmployeeDTO | null>;
  findByTenant(tenantId: string): Promise<EmployeeDTO[]>;
  findByDepartment(department: string): Promise<EmployeeDTO[]>;
  getPresetEmployees(): Promise<PresetEmployeeDTO[]>;
}

/**
 * Agent 仓库接口
 */
export interface IAgentRepository extends IRepository<AgentDTO, CreateAgentInput, AgentFilter> {
  findByOwner(ownerId: string): Promise<AgentDTO[]>;
  findByStatus(status: string): Promise<AgentDTO[]>;
  getCoreMemory(agentId: string): Promise<AgentCoreMemoryDTO | null>;
  updateCoreMemory(agentId: string, data: Partial<AgentCoreMemoryDTO>): Promise<AgentCoreMemoryDTO>;
  addMemory(agentId: string, memory: CreateMemoryInput): Promise<AgentMemoryDTO>;
  findRelatedMemories(agentId: string, query: string, limit?: number, filter?: MemoryFilterInput): Promise<AgentMemoryDTO[]>;
  getGrowthCurve(agentId: string): Promise<GrowthCurvePoint[]>;
}

/**
 * 任务仓库接口
 */
export interface ITaskRepository extends Omit<IRepository<TaskDTO, CreateTaskInput, TaskFilter>, "update"> {
  update(id: string, data: Partial<TaskDTO>): Promise<TaskDTO>;
  findByProject(projectId: string): Promise<TaskDTO[]>;
  findByAssignee(agentId: string): Promise<TaskDTO[]>;
  findByCreator(employeeId: string): Promise<TaskDTO[]>;
  getApprovalQueue(tenantId: string): Promise<ApprovalQueueItem[]>;
  approveTask(taskId: string, approverId: string, comment?: string): Promise<TaskDTO>;
  rejectTask(taskId: string, approverId: string, comment?: string): Promise<TaskDTO>;
  getTimeline(taskId: string): Promise<TaskTimelineEvent[]>;
}

/**
 * 项目仓库接口
 */
export interface IProjectRepository extends IRepository<ProjectDTO, CreateProjectInput, ProjectFilter> {
  getByIdWithDetails(id: string): Promise<ProjectDetailDTO | null>;
  findByTenant(tenantId: string): Promise<ProjectDTO[]>;
  addParticipant(projectId: string, agentId: string): Promise<void>;
  removeParticipant(projectId: string, agentId: string): Promise<void>;
}

/**
 * 审计日志仓库接口
 */
export interface IAuditRepository {
  log(entry: CreateAuditLogInput): Promise<void>;
  findMany(filter?: AuditFilter): Promise<AuditLogDTO[]>;
  getResponsibilityChain(taskId: string): Promise<ResponsibilityChainNode[]>;
  getTaskReplay(taskId: string): Promise<TaskReplayDTO>;
  getStats(tenantId: string): Promise<AuditStats>;
  countByAction(tenantId: string, action: string, since: Date): Promise<number>;
}

/**
 * 知识库仓库接口
 */
export interface IKnowledgeRepository extends IRepository<KnowledgeDocDTO, CreateKnowledgeDocInput, KnowledgeFilter> {
  search(params: KnowledgeSearchInput): Promise<KnowledgeSearchResult[]>;
  findByPermissionLevel(minLevel: number): Promise<KnowledgeDocDTO[]>;
  getStats(tenantId: string): Promise<KnowledgeStats>;
}
