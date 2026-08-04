// ─────────────────────────────────────────────────────────
// 数智企业 · Mock 任务仓库
// ─────────────────────────────────────────────────────────

import type {
  TaskDTO,
  CreateTaskInput,
  TaskFilter,
  ApprovalQueueItem,
  ResponsibilityChainNode,
  TaskTimelineEvent,
} from "@lobster/types";
import type { ITaskRepository } from "../types";
import { DEFAULT_TENANT_ID } from "../../data";

export class MockTaskRepository implements ITaskRepository {
  private tasks: Map<string, TaskDTO>;

  constructor() {
    this.tasks = new Map();

    // 初始化一些示例任务
    const sampleTasks: TaskDTO[] = [
      {
        id: "task-001",
        tenantId: DEFAULT_TENANT_ID,
        title: "2026Q3 市场趋势分析报告",
        description: "分析新能源赛道的最新趋势，输出一份 10 页以内的报告",
        status: "IN_PROGRESS",
        riskLevel: "LOW",
        permissionLevel: 1,
        approved: null,
        approvalComment: null,
        result: null,
        creator: { id: "admin-boss", name: "王老板" },
        assignee: { id: "agent-market-analyst", name: "市场分析师", avatar: null },
        approvedBy: null,
        project: { id: "proj-001", name: "Q3 战略规划" },
        startedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        completedAt: null,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: "task-002",
        tenantId: DEFAULT_TENANT_ID,
        title: "竞品定价策略调研",
        description: "收集主要竞品的最新定价信息",
        status: "AWAITING_APPROVAL",
        riskLevel: "MEDIUM",
        permissionLevel: 2,
        approved: null,
        approvalComment: null,
        result: null,
        creator: { id: "admin-boss", name: "王老板" },
        assignee: { id: "agent-competitive-intel", name: "竞争情报官", avatar: null },
        approvedBy: null,
        project: { id: "proj-001", name: "Q3 战略规划" },
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: null,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "task-003",
        tenantId: DEFAULT_TENANT_ID,
        title: "2026年度财务预算编制",
        description: "编制下半年财务预算，含各部门预算分配",
        status: "AWAITING_APPROVAL",
        riskLevel: "HIGH",
        permissionLevel: 4,
        approved: null,
        approvalComment: null,
        result: null,
        creator: { id: "admin-boss", name: "王老板" },
        assignee: { id: "agent-financial-analyst", name: "财务分析与预算", avatar: null },
        approvedBy: null,
        project: null,
        startedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        completedAt: null,
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        id: "task-004",
        tenantId: DEFAULT_TENANT_ID,
        title: "客户合同合规审查",
        description: "审查某 KA 客户的续约合同条款",
        status: "DONE",
        riskLevel: "HIGH",
        permissionLevel: 4,
        approved: true,
        approvalComment: "合同条款无误，批准执行",
        result: "完成审查，发现 2 处风险点已标注修正",
        creator: { id: "admin-boss", name: "王老板" },
        assignee: { id: "agent-legal-counsel", name: "法务合同与风控", avatar: null },
        approvedBy: { id: "admin-boss", name: "王老板" },
        project: { id: "proj-002", name: "KA 客户续约" },
        startedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        completedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: "task-005",
        tenantId: DEFAULT_TENANT_ID,
        title: "新产品 PRD 编写",
        description: "基于市场分析结果编写一款数据产品的 PRD",
        status: "PENDING",
        riskLevel: "LOW",
        permissionLevel: 2,
        approved: null,
        approvalComment: null,
        result: null,
        creator: { id: "admin-boss", name: "王老板" },
        assignee: null,
        approvedBy: null,
        project: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ];

    sampleTasks.forEach((t) => this.tasks.set(t.id, t));
  }

  async findById(id: string): Promise<TaskDTO | null> {
    return this.tasks.get(id) ?? null;
  }

  async findMany(filter?: TaskFilter): Promise<TaskDTO[]> {
    let result = Array.from(this.tasks.values());
    if (filter) {
      if (filter.status) result = result.filter((t) => t.status === filter.status);
      if (filter.riskLevel) result = result.filter((t) => t.riskLevel === filter.riskLevel);
      if (filter.assigneeId) result = result.filter((t) => t.assignee?.id === filter.assigneeId);
      if (filter.projectId) result = result.filter((t) => t.project?.id === filter.projectId);
      if (filter.creatorId) result = result.filter((t) => t.creator.id === filter.creatorId);
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async create(data: CreateTaskInput): Promise<TaskDTO> {
    const id = `task-${crypto.randomUUID().slice(0, 6)}`;
    const task: TaskDTO = {
      id,
      tenantId: DEFAULT_TENANT_ID,
      title: data.title,
      description: data.description ?? null,
      status: "PENDING",
      riskLevel: data.riskLevel ?? "LOW",
      permissionLevel: data.permissionLevel ?? 1,
      approved: null,
      approvalComment: null,
      result: null,
      creator: { id: "admin-boss", name: "王老板" },
      assignee: data.assigneeId
        ? { id: data.assigneeId, name: data.assigneeId, avatar: null }
        : null,
      approvedBy: null,
      project: data.projectId
        ? { id: data.projectId, name: data.projectId }
        : null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(id, task);
    return task;
  }

  async update(id: string, data: Partial<TaskDTO>): Promise<TaskDTO> {
    const existing = this.tasks.get(id);
    if (!existing) throw new Error(`Task ${id} not found`);
    const updated: TaskDTO = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    } as TaskDTO;
    this.tasks.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.tasks.delete(id);
  }

  async count(filter?: TaskFilter): Promise<number> {
    const result = await this.findMany(filter);
    return result.length;
  }

  async findByProject(projectId: string): Promise<TaskDTO[]> {
    return Array.from(this.tasks.values()).filter((t) => t.project?.id === projectId);
  }

  async findByAssignee(agentId: string): Promise<TaskDTO[]> {
    return Array.from(this.tasks.values()).filter((t) => t.assignee?.id === agentId);
  }

  async findByCreator(employeeId: string): Promise<TaskDTO[]> {
    return Array.from(this.tasks.values()).filter((t) => t.creator.id === employeeId);
  }

  async getApprovalQueue(tenantId: string): Promise<ApprovalQueueItem[]> {
    return Array.from(this.tasks.values())
      .filter((t) => t.status === "AWAITING_APPROVAL" && t.tenantId === tenantId)
      .map((t) => ({
        taskId: t.id,
        taskTitle: t.title,
        riskLevel: t.riskLevel,
        permissionLevel: t.permissionLevel,
        requestedBy: t.creator.name,
        assigneeName: t.assignee?.name ?? "未分配",
        createdAt: t.createdAt,
      }));
  }

  async approveTask(taskId: string, approverId: string, comment?: string): Promise<TaskDTO> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    const updated: TaskDTO = {
      ...task,
      status: "DONE",
      approved: true,
      approvedBy: { id: approverId, name: approverId === "admin-boss" ? "王老板" : "审批人" },
      approvalComment: comment ?? null,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(taskId, updated);
    return updated;
  }

  async rejectTask(taskId: string, approverId: string, comment?: string): Promise<TaskDTO> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    const updated: TaskDTO = {
      ...task,
      status: "REJECTED",
      approved: false,
      approvedBy: { id: approverId, name: approverId === "admin-boss" ? "王老板" : "审批人" },
      approvalComment: comment ?? null,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(taskId, updated);
    return updated;
  }

  async getTimeline(taskId: string): Promise<TaskTimelineEvent[]> {
    const task = this.tasks.get(taskId);
    if (!task) return [];

    const events: TaskTimelineEvent[] = [
      { type: "created", message: `创建任务「${task.title}」`, actorName: task.creator.name, timestamp: task.createdAt },
    ];

    if (task.assignee) {
      events.push({
        type: "assigned",
        message: `分配给 ${task.assignee.name}`,
        actorName: task.creator.name,
        timestamp: task.createdAt,
      });
    }

    if (task.startedAt) {
      events.push({ type: "started", message: "开始执行", actorName: task.assignee?.name ?? "Agent", timestamp: task.startedAt });
    }

    if (task.status === "AWAITING_APPROVAL") {
      events.push({ type: "awaiting_approval", message: "提交审批", actorName: task.assignee?.name ?? "Agent", timestamp: task.updatedAt });
    }

    if (task.completedAt) {
      events.push({
        type: task.approved ? "approved" : "rejected",
        message: task.approved ? "审批通过" : "审批驳回",
        actorName: task.approvedBy?.name ?? "审批人",
        timestamp: task.completedAt,
      });
    }

    return events;
  }
}

/** Singleton */
export const taskRepo = new MockTaskRepository();
