// ─────────────────────────────────────────────────────────
// 数智企业 · Prisma 任务仓库
// ─────────────────────────────────────────────────────────

import { db } from "~/server/db";
import type { Prisma } from "@lobster/db";
import type {
  TaskDTO,
  CreateTaskInput,
  TaskFilter,
  ApprovalQueueItem,
  TaskTimelineEvent,
} from "@lobster/types";
import type { ITaskRepository } from "../types";
import { DEFAULT_EMPLOYEE_ID, DEFAULT_TENANT_ID } from "~/lib/data";

const taskInclude = {
  creator: true,
  assignee: true,
  approvedBy: true,
  project: true,
} as const;

type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;
type TaskRow = TaskWithRelations;
type ApprovalRow = Awaited<ReturnType<typeof db.approval.findMany>>[number];
function parseIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function toTaskDTO(task: TaskWithRelations): TaskDTO {
  return {
    id: task.id,
    tenantId: task.tenantId,
    title: task.title,
    description: task.description ?? null,
    status: task.status as TaskDTO["status"],
    riskLevel: task.riskLevel as TaskDTO["riskLevel"],
    permissionLevel: task.permissionLevel,
    approved: task.approved ?? null,
    approvalComment: task.approvalComment ?? null,
    result: task.result ?? null,
    creator: {
      id: task.creator.id,
      name: task.creator.name,
    },
    assignee: task.assignee
      ? {
          id: task.assignee.id,
          name: task.assignee.name,
          avatar: task.assignee.avatar ?? null,
        }
      : null,
    approvedBy: task.approvedBy
      ? {
          id: task.approvedBy.id,
          name: task.approvedBy.name,
        }
      : null,
    project: task.project
      ? {
          id: task.project.id,
          name: task.project.name,
        }
      : null,
    startedAt: parseIso(task.startedAt),
    completedAt: parseIso(task.completedAt),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function mapTimeline(task: TaskWithRelations, approvalEvents: ApprovalQueueItem[] = []): TaskTimelineEvent[] {
  const events: TaskTimelineEvent[] = [
    { type: "created", message: `创建任务「${task.title}」`, actorName: task.creator.name, timestamp: task.createdAt.toISOString() },
  ];

  if (task.assignee) {
    events.push({
      type: "assigned",
      message: `分配给 ${task.assignee.name}`,
      actorName: task.creator.name,
      timestamp: task.createdAt.toISOString(),
    });
  }

  if (task.startedAt) {
    events.push({
      type: "started",
      message: "开始执行",
      actorName: task.assignee?.name ?? "Agent",
      timestamp: task.startedAt.toISOString(),
    });
  }

  for (const approval of approvalEvents) {
    events.push({
      type: task.status === "AWAITING_APPROVAL" ? "awaiting_approval" : task.approved === true ? "approved" : "rejected",
      message: approval.taskTitle,
      actorName: approval.requestedBy,
      timestamp: approval.createdAt,
    });
  }

  if (task.completedAt) {
    events.push({
      type: task.approved === false ? "rejected" : task.approved === true ? "approved" : "completed",
      message: task.approved === false ? "审批驳回" : task.approved === true ? "审批通过" : "任务完成",
      actorName: task.approvedBy?.name ?? task.assignee?.name ?? "系统",
      timestamp: task.completedAt.toISOString(),
    });
  }

  return events;
}

export class PrismaTaskRepository implements ITaskRepository {
  async findById(id: string): Promise<TaskDTO | null> {
    const task = await db.task.findUnique({
      where: { id },
      include: taskInclude,
    });

    return task ? toTaskDTO(task) : null;
  }

  async findMany(filter?: TaskFilter): Promise<TaskDTO[]> {
    const tasks = await db.task.findMany({
      where: {
        tenantId: filter?.tenantId ?? DEFAULT_TENANT_ID,
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.riskLevel ? { riskLevel: filter.riskLevel } : {}),
        ...(filter?.assigneeId ? { assigneeId: filter.assigneeId } : {}),
        ...(filter?.projectId ? { projectId: filter.projectId } : {}),
        ...(filter?.creatorId ? { creatorId: filter.creatorId } : {}),
      },
      include: taskInclude,
      orderBy: { createdAt: "desc" },
    });

    return tasks.map((task: TaskRow) => toTaskDTO(task as TaskWithRelations));
  }

  async create(data: CreateTaskInput): Promise<TaskDTO> {
    const task = await db.task.create({
      data: {
        tenantId: DEFAULT_TENANT_ID,
        title: data.title,
        description: data.description ?? null,
        status: "PENDING",
        riskLevel: data.riskLevel ?? "LOW",
        permissionLevel: data.permissionLevel ?? 1,
        creatorId: data.creatorId ?? DEFAULT_EMPLOYEE_ID,
        assigneeId: data.assigneeId ?? null,
        projectId: data.projectId ?? null,
      },
      include: taskInclude,
    });

    return toTaskDTO(task);
  }

  async update(id: string, data: Partial<TaskDTO>): Promise<TaskDTO> {
    const task = await db.task.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        riskLevel: data.riskLevel,
        permissionLevel: data.permissionLevel,
        approved: data.approved,
        approvalComment: data.approvalComment,
        result: data.result,
        assigneeId: data.assignee ? data.assignee.id : undefined,
        approvedById: data.approvedBy ? data.approvedBy.id : undefined,
        startedAt:
          data.startedAt === null
            ? null
            : data.startedAt
            ? new Date(data.startedAt)
            : undefined,
        completedAt:
          data.completedAt === null
            ? null
            : data.completedAt
            ? new Date(data.completedAt)
            : undefined,
      },
      include: taskInclude,
    });

    return toTaskDTO(task);
  }

  async delete(id: string): Promise<void> {
    await db.task.delete({ where: { id } });
  }

  async count(filter?: TaskFilter): Promise<number> {
    return db.task.count({
      where: {
        tenantId: filter?.tenantId ?? DEFAULT_TENANT_ID,
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.riskLevel ? { riskLevel: filter.riskLevel } : {}),
        ...(filter?.assigneeId ? { assigneeId: filter.assigneeId } : {}),
        ...(filter?.projectId ? { projectId: filter.projectId } : {}),
        ...(filter?.creatorId ? { creatorId: filter.creatorId } : {}),
      },
    });
  }

  async findByProject(projectId: string): Promise<TaskDTO[]> {
    const tasks = await db.task.findMany({
      where: { projectId },
      include: taskInclude,
      orderBy: { createdAt: "desc" },
    });

    return tasks.map((task: TaskRow) => toTaskDTO(task as TaskWithRelations));
  }

  async findByAssignee(agentId: string): Promise<TaskDTO[]> {
    const tasks = await db.task.findMany({
      where: { assigneeId: agentId },
      include: taskInclude,
      orderBy: { createdAt: "desc" },
    });

    return tasks.map((task: TaskRow) => toTaskDTO(task as TaskWithRelations));
  }

  async findByCreator(employeeId: string): Promise<TaskDTO[]> {
    const tasks = await db.task.findMany({
      where: { creatorId: employeeId },
      include: taskInclude,
      orderBy: { createdAt: "desc" },
    });

    return tasks.map((task: TaskRow) => toTaskDTO(task as TaskWithRelations));
  }

  async getApprovalQueue(tenantId: string): Promise<ApprovalQueueItem[]> {
    const tasks = await db.task.findMany({
      where: { tenantId, status: "AWAITING_APPROVAL" },
      include: taskInclude,
      orderBy: { createdAt: "desc" },
    });

    return tasks.map((task: TaskRow) => ({
      taskId: task.id,
      taskTitle: task.title,
      riskLevel: task.riskLevel as TaskDTO["riskLevel"],
      permissionLevel: task.permissionLevel,
      requestedBy: task.creator.name,
      assigneeName: task.assignee?.name ?? "未分配",
      createdAt: task.createdAt.toISOString(),
    }));
  }

  async approveTask(taskId: string, approverId: string, comment?: string): Promise<TaskDTO> {
    const task = await db.task.update({
      where: { id: taskId },
      data: {
        status: "DONE",
        approved: true,
        approvalComment: comment ?? null,
        approvedById: approverId,
        completedAt: new Date(),
      },
      include: taskInclude,
    });

    return toTaskDTO(task);
  }

  async rejectTask(taskId: string, approverId: string, comment?: string): Promise<TaskDTO> {
    const task = await db.task.update({
      where: { id: taskId },
      data: {
        status: "REJECTED",
        approved: false,
        approvalComment: comment ?? null,
        approvedById: approverId,
        completedAt: new Date(),
      },
      include: taskInclude,
    });

    return toTaskDTO(task);
  }

  async getTimeline(taskId: string): Promise<TaskTimelineEvent[]> {
    const [task, approvals] = await Promise.all([
      db.task.findUnique({
        where: { id: taskId },
        include: taskInclude,
      }),
      db.approval.findMany({
        where: { taskId },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (!task) return [];

    const approvalEvents = approvals.map((approval: ApprovalRow) => ({
      taskId: approval.taskId,
      taskTitle: task.title,
      riskLevel: task.riskLevel as TaskDTO["riskLevel"],
      permissionLevel: task.permissionLevel,
      requestedBy: task.creator.name,
      assigneeName: task.assignee?.name ?? "未分配",
      createdAt: approval.createdAt.toISOString(),
    }));

    return mapTimeline(task, approvalEvents);
  }
}

export const taskRepo = new PrismaTaskRepository();
