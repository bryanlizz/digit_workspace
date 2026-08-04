// ─────────────────────────────────────────────────────────
// 数智企业 · Repository 索引
// V2: 全部切换 Prisma 持久化
// ─────────────────────────────────────────────────────────

export { employeeRepo } from "./prisma/employee.repo";
export { agentRepo } from "./prisma/agent.repo";
export { taskRepo } from "./prisma/task.repo";
export { projectRepo } from "./prisma/project.repo";
export { auditRepo } from "./prisma/audit.repo";
export { knowledgeRepo } from "./prisma/knowledge.repo";
export { warRoomMessageRepo } from "./prisma/warRoomMessage.repo";

export type {
  IEmployeeRepository,
  IAgentRepository,
  ITaskRepository,
  IProjectRepository,
  IAuditRepository,
  IKnowledgeRepository,
} from "./types";

export type { CreateWarRoomMessageInput, IWarRoomMessageRepository } from "./mock/warRoomMessage.repo";
