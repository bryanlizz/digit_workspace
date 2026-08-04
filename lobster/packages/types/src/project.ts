// ─────────────────────────────────────────────────────────
// 数智企业 · 项目（作战室）类型定义
// ─────────────────────────────────────────────────────────

/**
 * 项目 DTO — API 返回格式
 */
export interface ProjectDTO {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "ARCHIVED";
  /** 参与 Agent 数量 */
  participantAgentCount: number;
  /** 参与人类数量 */
  participantEmployeeCount: number;
  /** 任务数量 */
  taskCount: number;
  /** 各状态任务数量 */
  taskStatusCounts: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

/**
 * 项目详情 DTO — 含完整信息
 */
export interface ProjectDetailDTO extends ProjectDTO {
  participantAgentIds: string[];
  participantEmployeeIds: string[];
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    assigneeName: string | null;
  }>;
}

/**
 * 创建项目的输入参数
 */
export interface CreateProjectInput {
  name: string;
  description?: string;
  participantAgentIds?: string[];
  participantEmployeeIds?: string[];
}

/**
 * 项目筛选参数
 */
export interface ProjectFilter {
  status?: "ACTIVE" | "ARCHIVED";
  tenantId?: string;
}

/**
 * 作战室消息 DTO
 */
export interface WarRoomMessageDTO {
  id: string;
  projectId: string;
  senderType: "human" | "agent" | "system";
  senderId: string;
  senderName: string;
  avatar: string | null;
  content: string;
  messageType: "text" | "image" | "file" | "action";
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * 作战室消息（V1 Mock — 向后兼容）
 */
export interface WarRoomMessage {
  id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  senderType: "human" | "agent";
  content: string;
  createdAt: string;
}
